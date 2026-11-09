import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { dbStore } from '../database/store';
import { Agreement, AgreementApproval, canonicalStringify, computeSha256 } from '@clausora/shared';
import { notificationService } from '../services/notifications/notification.service';

const router = Router();

// POST /api/projects/:projectId/agreements - create agreement snapshot from blueprint
router.post('/projects/:projectId/agreements', authMiddleware, async (req: AuthRequest, res: Response, next) => {
  try {
    const { projectId } = req.params;
    const project = dbStore.projects.get(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const blueprints = Array.from(dbStore.blueprints.values()).filter((b) => b.projectId === projectId);
    const blueprint = blueprints[blueprints.length - 1];
    if (!blueprint) {
      return res.status(400).json({ success: false, message: 'No Work Blueprint available to baseline agreement.' });
    }

    const { totalAmountMinor, currency, milestones } = req.body;

    const snapshot = {
      projectTitle: blueprint.projectTitle,
      projectSummary: blueprint.projectSummary,
      workstreams: blueprint.workstreams,
      milestones: milestones || blueprint.suggestedMilestones,
      totalAmountMinor: totalAmountMinor || 100000, // $1000 default
      currency: currency || 'USD',
    };

    const canonicalJson = canonicalStringify(snapshot);
    const snapshotHash = await computeSha256(canonicalJson);

    // Check version
    const existing = Array.from(dbStore.agreements.values()).filter((a) => a.projectId === projectId);
    const nextVersion = existing.length + 1;

    const agreementId = 'agr_' + Math.random().toString(36).substring(2, 10);
    const agreement: Agreement = {
      id: agreementId,
      projectId,
      version: nextVersion,
      canonicalSnapshot: snapshot,
      snapshotHash,
      currency: snapshot.currency,
      totalAmountMinor: snapshot.totalAmountMinor,
      status: 'awaiting_approval',
      approvals: [
        {
          userId: req.user!.id,
          userName: req.user!.name,
          role: req.user!.role,
          decision: 'approved',
          createdAt: new Date().toISOString(),
          snapshotHashSeen: snapshotHash,
        },
      ],
      createdBy: req.user!.id,
      createdAt: new Date().toISOString(),
    };

    dbStore.agreements.set(agreementId, agreement);
    project.currentAgreementId = agreementId;
    project.status = 'awaiting_approval';
    dbStore.projects.set(projectId, project);

    dbStore.addAuditEvent({
      projectId,
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      eventType: 'AGREEMENT_SNAPSHOT_CREATED',
      entityType: 'agreement',
      entityId: agreementId,
      summary: `Created Agreement v${nextVersion} with SHA-256 fingerprint ${snapshotHash.substring(0, 16)}... Total: $${(snapshot.totalAmountMinor / 100).toFixed(2)} ${snapshot.currency}.`,
    });

    await notificationService.send({
      userId: project.ownerId,
      projectId,
      type: 'AGREEMENT_AWAITING_APPROVAL',
      title: `Agreement v${nextVersion} Ready for Approval`,
      body: `A new agreement snapshot has been generated with fingerprint ${snapshotHash.substring(0, 12)}...`,
    });

    return res.status(201).json({
      success: true,
      data: { agreement },
      message: 'Agreement snapshot created with SHA-256 fingerprint.',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:projectId/agreements
router.get('/projects/:projectId/agreements', authMiddleware, (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const agreements = Array.from(dbStore.agreements.values()).filter((a) => a.projectId === projectId);
  return res.json({
    success: true,
    data: { agreements },
  });
});

// GET /api/agreements/:agreementId
router.get('/agreements/:agreementId', authMiddleware, (req: AuthRequest, res: Response) => {
  const { agreementId } = req.params;
  const agreement = dbStore.agreements.get(agreementId);
  if (!agreement) {
    return res.status(404).json({ success: false, message: 'Agreement not found' });
  }
  return res.json({
    success: true,
    data: { agreement },
  });
});

// POST /api/agreements/:agreementId/approve - sign-off
router.post('/agreements/:agreementId/approve', authMiddleware, async (req: AuthRequest, res: Response, next) => {
  try {
    const { agreementId } = req.params;
    const agreement = dbStore.agreements.get(agreementId);
    if (!agreement) {
      return res.status(404).json({ success: false, message: 'Agreement not found' });
    }

    const userId = req.user!.id;
    // Check if already approved by this user
    const existingApproval = agreement.approvals.find((a) => a.userId === userId);
    if (existingApproval) {
      existingApproval.decision = 'approved';
      existingApproval.createdAt = new Date().toISOString();
    } else {
      agreement.approvals.push({
        userId,
        userName: req.user!.name,
        role: req.user!.role,
        decision: 'approved',
        createdAt: new Date().toISOString(),
        snapshotHashSeen: agreement.snapshotHash,
      });
    }

    // If approved, mark agreement approved and instantiate milestones!
    agreement.status = 'approved';
    agreement.approvedAt = new Date().toISOString();
    dbStore.agreements.set(agreementId, agreement);

    // Update project state
    const project = dbStore.projects.get(agreement.projectId);
    if (project) {
      project.status = 'active';
      dbStore.projects.set(project.id, project);
    }

    // Instantiate Milestones from agreement canonical snapshot
    const milestonesToCreate = agreement.canonicalSnapshot.milestones || [];
    milestonesToCreate.forEach((m, idx) => {
      const milestoneId = 'ms_' + Math.random().toString(36).substring(2, 9);
      const isFirst = idx === 0;
      dbStore.milestones.set(milestoneId, {
        id: milestoneId,
        projectId: agreement.projectId,
        agreementId: agreement.id,
        title: m.name,
        description: `Delivering tasks: ${m.includedTaskTitles.join(', ')}`,
        amountMinor: m.suggestedAmountMinor || Math.round(agreement.totalAmountMinor / milestonesToCreate.length),
        currency: agreement.currency,
        dueDate: m.dueDate || new Date(Date.now() + (idx + 1) * 7 * 86400000).toISOString().split('T')[0],
        taskIds: [],
        acceptanceCriteria: [
          {
            id: 'crit_' + Math.random().toString(36).substring(2, 7),
            criterion: 'All deliverables specified in milestone are demonstrable via screenshot, URL, or code artifact.',
            deliverable: m.name,
            status: 'unverified',
          },
          {
            id: 'crit_' + Math.random().toString(36).substring(2, 7),
            criterion: 'Quality and functional expectations met without unhandled exceptions.',
            deliverable: 'Core Functionality',
            status: 'unverified',
          },
        ],
        status: isFirst ? 'IN_PROGRESS' : 'CREATED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    dbStore.addAuditEvent({
      projectId: agreement.projectId,
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      eventType: 'AGREEMENT_APPROVED',
      entityType: 'agreement',
      entityId: agreement.id,
      summary: `Approved Agreement v${agreement.version} (Fingerprint: ${agreement.snapshotHash.substring(0, 16)}...). Created active milestones.`,
    });

    return res.json({
      success: true,
      data: { agreement },
      message: 'Agreement approved. Milestones activated for execution.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
