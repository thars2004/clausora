import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { dbStore } from '../database/store';
import { hfClient } from '../services/ai/huggingface.client';

const router = Router({ mergeParams: true });

// GET /api/projects/:projectId/blueprint
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const list = Array.from(dbStore.blueprints.values()).filter((b) => b.projectId === projectId);
  const current = list[list.length - 1];

  if (!current) {
    return res.status(404).json({ success: false, message: 'Work Blueprint not found for this project.' });
  }

  return res.json({
    success: true,
    data: { blueprint: current },
  });
});

// PATCH /api/projects/:projectId/blueprint - edit blueprint content
router.patch('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const list = Array.from(dbStore.blueprints.values()).filter((b) => b.projectId === projectId);
  const current = list[list.length - 1];

  if (!current) {
    return res.status(404).json({ success: false, message: 'Work Blueprint not found.' });
  }

  const updates = req.body;
  if (updates.workstreams) current.workstreams = updates.workstreams;
  if (updates.assumptions) current.assumptions = updates.assumptions;
  if (updates.risks) current.risks = updates.risks;
  if (updates.clarifyingQuestions) current.clarifyingQuestions = updates.clarifyingQuestions;
  if (updates.suggestedMilestones) current.suggestedMilestones = updates.suggestedMilestones;

  dbStore.blueprints.set(current.id, current);

  dbStore.addAuditEvent({
    projectId,
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorRole: req.user!.role,
    eventType: 'BLUEPRINT_UPDATED',
    entityType: 'workBlueprint',
    entityId: current.id,
    summary: 'Updated workstreams and acceptance criteria in Work Blueprint.',
  });

  return res.json({
    success: true,
    data: { blueprint: current },
    message: 'Blueprint updated successfully.',
  });
});

// POST /api/projects/:projectId/blueprint/regenerate
router.post('/regenerate', authMiddleware, async (req: AuthRequest, res: Response, next) => {
  try {
    const { projectId } = req.params;
    const project = dbStore.projects.get(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const { focusArea } = req.body; // e.g. "Add strict security acceptance criteria"
    const newBlueprint = await hfClient.generateWorkBlueprint({
      projectTitle: project.title,
      projectSummary: `${project.description}\nAdditional instruction: ${focusArea || 'Refine deliverables'}`,
    });

    newBlueprint.projectId = projectId;
    dbStore.blueprints.set(newBlueprint.id, newBlueprint);

    dbStore.addAuditEvent({
      projectId,
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      eventType: 'BLUEPRINT_REGENERATED',
      entityType: 'workBlueprint',
      entityId: newBlueprint.id,
      summary: `Regenerated Work Blueprint with focus on: ${focusArea || 'overall deliverables'}.`,
    });

    return res.json({
      success: true,
      data: { blueprint: newBlueprint },
      message: 'Work Blueprint regenerated with AI.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;

