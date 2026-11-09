import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { dbStore } from '../database/store';
import { hfClient } from '../services/ai/huggingface.client';
import { ScopeChangeRequest } from '@clausora/shared';

const router = Router();

// GET /api/projects/:projectId/change-requests
router.get('/projects/:projectId/change-requests', authMiddleware, (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const requests = Array.from(dbStore.scopeChangeRequests.values()).filter((r) => r.projectId === projectId);
  return res.json({
    success: true,
    data: { changeRequests: requests },
  });
});

// POST /api/projects/:projectId/change-requests - evaluate and propose scope change
router.post('/projects/:projectId/change-requests', authMiddleware, async (req: AuthRequest, res: Response, next) => {
  try {
    const { projectId } = req.params;
    const { newRequestText } = req.body;

    const project = dbStore.projects.get(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Get current agreement and criteria
    const currentAgreement = project.currentAgreementId ? dbStore.agreements.get(project.currentAgreementId) : null;
    const existingCriteria: string[] = [];
    if (currentAgreement) {
      currentAgreement.canonicalSnapshot.workstreams.forEach((ws) => {
        ws.tasks.forEach((t) => {
          existingCriteria.push(...t.acceptanceCriteria);
        });
      });
    }

    // Analyze with AI Scope Drift Radar
    const driftAnalysis = await hfClient.detectScopeDrift({
      agreementTitle: project.title,
      existingCriteria,
      newRequestText,
    });

    const requestId = 'scr_' + Math.random().toString(36).substring(2, 9);
    const scopeRequest: ScopeChangeRequest = {
      id: requestId,
      projectId,
      baseAgreementId: currentAgreement?.id || '',
      incomingText: newRequestText,
      classification: driftAnalysis.classification,
      reason: driftAnalysis.reason,
      relatedCriterionIds: driftAnalysis.relatedCriterionIds,
      impactAreas: driftAnalysis.impactAreas,
      suggestedChangeRequest: driftAnalysis.suggestedChangeRequest,
      requiresHumanDecision: driftAnalysis.requiresHumanDecision,
      status: 'proposed',
      createdBy: req.user!.id,
      createdAt: new Date().toISOString(),
    };

    dbStore.scopeChangeRequests.set(requestId, scopeRequest);

    dbStore.addAuditEvent({
      projectId,
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      eventType: 'SCOPE_DRIFT_DETECTED',
      entityType: 'scopeChangeRequest',
      entityId: requestId,
      summary: `Scope Radar classified new request as "${scopeRequest.classification}". Requires formal mutual amendment.`,
    });

    return res.status(201).json({
      success: true,
      data: { changeRequest: scopeRequest },
      message: `Scope Drift Radar analyzed item: ${scopeRequest.classification}`,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/change-requests/:changeRequestId/accept
router.post('/change-requests/:changeRequestId/accept', authMiddleware, (req: AuthRequest, res: Response, next) => {
  try {
    const { changeRequestId } = req.params;
    const item = dbStore.scopeChangeRequests.get(changeRequestId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Scope change request not found' });
    }

    item.status = 'accepted';
    dbStore.scopeChangeRequests.set(changeRequestId, item);

    dbStore.addAuditEvent({
      projectId: item.projectId,
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      eventType: 'SCOPE_CHANGE_ACCEPTED',
      entityType: 'scopeChangeRequest',
      entityId: changeRequestId,
      summary: `Accepted scope amendment: "${item.incomingText.slice(0, 80)}"`,
    });

    return res.json({
      success: true,
      data: { changeRequest: item },
      message: 'Scope change accepted and incorporated into project plan.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/change-requests/:changeRequestId/reject
router.post('/change-requests/:changeRequestId/reject', authMiddleware, (req: AuthRequest, res: Response) => {
  const { changeRequestId } = req.params;
  const item = dbStore.scopeChangeRequests.get(changeRequestId);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Scope change request not found' });
  }

  item.status = 'rejected';
  dbStore.scopeChangeRequests.set(changeRequestId, item);

  dbStore.addAuditEvent({
    projectId: item.projectId,
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorRole: req.user!.role,
    eventType: 'SCOPE_CHANGE_REJECTED',
    entityType: 'scopeChangeRequest',
    entityId: changeRequestId,
    summary: `Rejected scope change request. Existing agreement remains intact.`,
  });

  return res.json({
    success: true,
    data: { changeRequest: item },
    message: 'Scope change request rejected.',
  });
});

export default router;
