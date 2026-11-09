import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { dbStore } from '../database/store';
import {
  CreateMilestoneInputSchema,
  ALLOWED_MILESTONE_TRANSITIONS,
  MilestoneStatus,
} from '@clausora/shared';
import { hfClient } from '../services/ai/huggingface.client';
import { notificationService } from '../services/notifications/notification.service';

const router = Router();

// GET /api/projects/:projectId/milestones
router.get('/projects/:projectId/milestones', authMiddleware, (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const milestones = Array.from(dbStore.milestones.values()).filter((m) => m.projectId === projectId);
  return res.json({
    success: true,
    data: { milestones },
  });
});

// POST /api/projects/:projectId/milestones - create new milestone
router.post('/projects/:projectId/milestones', authMiddleware, (req: AuthRequest, res: Response, next) => {
  try {
    const { projectId } = req.params;
    const input = CreateMilestoneInputSchema.parse(req.body);

    const milestoneId = 'ms_' + Math.random().toString(36).substring(2, 9);
    const milestone = {
      id: milestoneId,
      projectId,
      agreementId: '',
      title: input.title,
      description: input.description,
      amountMinor: input.amountMinor,
      currency: input.currency,
      dueDate: input.dueDate,
      taskIds: [],
      acceptanceCriteria: input.acceptanceCriteria.map((c) => ({
        id: 'crit_' + Math.random().toString(36).substring(2, 7),
        criterion: c.criterion,
        deliverable: c.deliverable,
        status: 'unverified' as const,
      })),
      status: 'CREATED' as MilestoneStatus,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dbStore.milestones.set(milestoneId, milestone);

    dbStore.addAuditEvent({
      projectId,
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      eventType: 'MILESTONE_CREATED',
      entityType: 'milestone',
      entityId: milestoneId,
      summary: `Created milestone "${milestone.title}" ($${(milestone.amountMinor / 100).toFixed(2)} ${milestone.currency}).`,
    });

    return res.status(201).json({
      success: true,
      data: { milestone },
      message: 'Milestone created successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// Helper to validate state transitions
function transitionMilestone(
  milestoneId: string,
  targetStatus: MilestoneStatus,
  actor: { id: string; name: string; role: any }
) {
  const milestone = dbStore.milestones.get(milestoneId);
  if (!milestone) throw new Error('Milestone not found');

  const allowed = ALLOWED_MILESTONE_TRANSITIONS[milestone.status] || [];
  if (!allowed.includes(targetStatus)) {
    const err: any = new Error(
      `Invalid transition: Cannot change milestone from '${milestone.status}' to '${targetStatus}'. Allowed: [${allowed.join(', ')}]`
    );
    err.status = 409;
    throw err;
  }

  const previous = milestone.status;
  milestone.status = targetStatus;
  milestone.updatedAt = new Date().toISOString();
  dbStore.saveMilestone(milestone);

  dbStore.addAuditEvent({
    projectId: milestone.projectId,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    eventType: 'MILESTONE_STATUS_TRANSITION',
    entityType: 'milestone',
    entityId: milestoneId,
    summary: `Milestone "${milestone.title}" transitioned from ${previous} -> ${targetStatus}.`,
  });

  return milestone;
}

// POST /api/milestones/:milestoneId/submit - Provider submits for review
router.post('/milestones/:milestoneId/submit', authMiddleware, async (req: AuthRequest, res: Response, next) => {
  try {
    const { milestoneId } = req.params;
    const milestone = dbStore.milestones.get(milestoneId);
    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found' });
    }

    // Advance to SUBMITTED
    transitionMilestone(milestoneId, 'SUBMITTED', req.user!);

    // Collect submitted evidence for this milestone
    const evidenceItems = Array.from(dbStore.evidence.values()).filter((e) => e.milestoneId === milestoneId);

    // AI automated analysis of evidence against acceptance criteria
    const aiReviewResult = await hfClient.analyzeEvidence({
      milestoneId,
      milestoneTitle: milestone.title,
      acceptanceCriteria: milestone.acceptanceCriteria,
      evidenceItems,
    });

    const aiReviewId = 'rev_' + Math.random().toString(36).substring(2, 9);
    dbStore.aiReviews.set(aiReviewId, {
      id: aiReviewId,
      projectId: milestone.projectId,
      milestoneId,
      evidenceIds: evidenceItems.map((e) => e.id),
      criterionResults: aiReviewResult.criterionResults,
      overallRecommendation: aiReviewResult.overallRecommendation,
      limitations: aiReviewResult.limitations,
      modelId: hfClient.getModelName(),
      promptVersion: '1.0',
      rawResponseHash: 'sha_' + Math.random().toString(36).substring(2, 10),
      createdAt: new Date().toISOString(),
    });

    // Update criteria status based on AI advisory analysis
    aiReviewResult.criterionResults.forEach((cr) => {
      const match = milestone.acceptanceCriteria.find((c) => c.id === cr.criterionId);
      if (match) {
        match.status = cr.status;
      }
    });

    // Advance to AI_REVIEWED -> AWAITING_CLIENT_DECISION
    transitionMilestone(milestoneId, 'AI_REVIEWED', { id: 'ai', name: 'Work DNA Reviewer', role: 'ai' });
    transitionMilestone(milestoneId, 'AWAITING_CLIENT_DECISION', { id: 'ai', name: 'Work DNA Reviewer', role: 'ai' });

    dbStore.milestones.set(milestoneId, milestone);

    await notificationService.send({
      userId: req.user!.id,
      projectId: milestone.projectId,
      type: 'MILESTONE_AWAITING_DECISION',
      title: `Milestone "${milestone.title}" Ready for Client Review`,
      body: `AI evidence analysis complete (${aiReviewResult.overallRecommendation}). Awaiting human client sign-off.`,
    });

    return res.json({
      success: true,
      data: {
        milestone,
        aiReview: aiReviewResult,
      },
      message: 'Milestone submitted and analyzed by AI. Awaiting client decision.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/milestones/:milestoneId/approve - Client or task owner approves for payment
router.post('/milestones/:milestoneId/approve', authMiddleware, async (req: AuthRequest, res: Response, next) => {
  try {
    const { milestoneId } = req.params;
    const milestone = dbStore.milestones.get(milestoneId);
    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found' });
    }

    const project = dbStore.projects.get(milestone.projectId);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Client, admin, project/task owner, or creator can approve milestone
    const isOwner = project && (project.ownerId === userId || project.createdBy === userId);
    if (userRole !== 'client' && userRole !== 'admin' && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the client owner or platform admin can approve milestones for payment.',
      });
    }

    const updatedMilestone = transitionMilestone(milestoneId, 'APPROVED_FOR_PAYMENT', req.user!);
    updatedMilestone.approvedBy = req.user!.id;
    updatedMilestone.approvedAt = new Date().toISOString();
    dbStore.milestones.set(milestoneId, updatedMilestone);

    return res.json({
      success: true,
      data: { milestone: updatedMilestone },
      message: 'Milestone approved! Ready for PayPal sandbox payment release.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/milestones/:milestoneId/request-revision - Client requests changes
router.post('/milestones/:milestoneId/request-revision', authMiddleware, (req: AuthRequest, res: Response, next) => {
  try {
    const { milestoneId } = req.params;
    const { revisionNotes } = req.body;
    const milestone = transitionMilestone(milestoneId, 'REVISION_REQUESTED', req.user!);

    dbStore.addAuditEvent({
      projectId: milestone.projectId,
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      eventType: 'REVISION_REQUESTED',
      entityType: 'milestone',
      entityId: milestoneId,
      summary: `Revision requested: "${revisionNotes || 'Changes needed before release.'}"`,
    });

    return res.json({
      success: true,
      data: { milestone },
      message: 'Revision requested. Provider notified.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;

