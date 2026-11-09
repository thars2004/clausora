import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { dbStore } from '../database/store';
import { CreateProjectInputSchema, Project } from '@clausora/shared';
import { hfClient } from '../services/ai/huggingface.client';
import { storageService } from '../services/storage/storage.service';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

// GET /api/projects - role-isolated project listing
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;

  let userProjects: any[] = [];
  if (userRole === 'admin') {
    // Admin sees all projects
    userProjects = Array.from(dbStore.projects.values());
  } else if (userRole === 'client') {
    // Client strictly sees their own projects
    userProjects = Array.from(dbStore.projects.values()).filter((p) => p.ownerId === userId);
  } else {
    // Provider strictly sees projects where they are assigned as provider
    userProjects = Array.from(dbStore.projects.values()).filter((p) => p.providerIds.includes(userId));
  }

  return res.json({
    success: true,
    data: { projects: userProjects },
  });
});

// POST /api/projects - create new project with client & provider assignment
router.post('/', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const body = req.body;

    const parsed = CreateProjectInputSchema.parse({
      title: body.title,
      description: body.description || '',
      sourceType: body.sourceType || 'text',
      sourceContent: body.sourceContent || '',
      clientId: body.clientId,
      providerId: body.providerId,
      deadline: body.deadline || undefined,
      totalAmountMinor: body.totalAmountMinor ? Number(body.totalAmountMinor) : undefined,
      currency: body.currency || 'USD',
    });

    const projectId = 'proj_' + Math.random().toString(36).substring(2, 10);
    let extractedText = parsed.sourceContent || '';
    let assetId = '';

    // If file uploaded, save asset and compute SHA-256
    if (req.file) {
      const saved = storageService.saveFile(req.file);
      assetId = 'asset_' + Math.random().toString(36).substring(2, 10);
      dbStore.sourceAssets.set(assetId, {
        id: assetId,
        projectId,
        uploadedBy: userId,
        type: req.file.mimetype.startsWith('image/') ? 'image' : 'document',
        name: saved.originalName,
        urlOrKey: saved.storageKey,
        mimeType: saved.mimeType,
        sizeBytes: saved.sizeBytes,
        sha256: saved.sha256,
        extractedText: saved.extractedText,
        createdAt: new Date().toISOString(),
      });
      extractedText = extractedText + '\n' + saved.extractedText;
    }

    // Role-based client & provider assignment
    let finalOwnerId = userId;
    let finalProviderIds: string[] = [];

    if (userRole === 'client') {
      finalOwnerId = userId;
      if (parsed.providerId) finalProviderIds.push(parsed.providerId);
    } else if (userRole === 'provider') {
      // Provider creates project by selecting client
      finalOwnerId = parsed.clientId || userId;
      finalProviderIds.push(userId);
    } else {
      // Admin creating
      finalOwnerId = parsed.clientId || userId;
      if (parsed.providerId) finalProviderIds.push(parsed.providerId);
    }

    const project: Project & { ownerId: string; providerIds: string[]; sourceAssets: string[] } = {
      id: projectId,
      title: parsed.title,
      description: parsed.description,
      ownerId: finalOwnerId,
      providerIds: finalProviderIds,
      status: 'analysing',
      sourceAssets: assetId ? [assetId] : [],
      currentAgreementId: '',
      deadline: parsed.deadline,
      totalAmountMinor: parsed.totalAmountMinor,
      currency: parsed.currency,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await dbStore.saveProject(project);

    dbStore.addAuditEvent({
      projectId,
      actorId: userId,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      eventType: 'PROJECT_CREATED',
      entityType: 'project',
      entityId: projectId,
      summary: `Created project "${project.title}" (Assigned Client: ${finalOwnerId}, Assigned Provider: ${finalProviderIds.join(', ') || 'Unassigned'}).`,
    });

    // Generate Work Blueprint using Multimodal AI / Dynamic Work DNA Engine
    const blueprint = await hfClient.generateWorkBlueprint({
      projectTitle: project.title,
      projectSummary: project.description,
      sourceText: extractedText,
      deadline: parsed.deadline,
      totalAmountMinor: parsed.totalAmountMinor,
      currency: parsed.currency,
    });
    blueprint.projectId = projectId;

    // Tag tasks with assigned client and provider
    blueprint.workstreams.forEach((ws) => {
      ws.tasks.forEach((t) => {
        t.assignedClientId = finalOwnerId;
        if (finalProviderIds.length > 0) t.assignedProviderId = finalProviderIds[0];
      });
    });

    await dbStore.saveBlueprint(blueprint);

    project.status = 'awaiting_approval';
    if (blueprint.workflowDiagram) {
      project.workflowDiagram = blueprint.workflowDiagram;
    }
    await dbStore.saveProject(project);

    dbStore.addAuditEvent({
      projectId,
      actorId: 'system_ai',
      actorName: 'Work DNA Engine (Qwen2.5-VL)',
      actorRole: 'ai',
      eventType: 'WORK_BLUEPRINT_GENERATED',
      entityType: 'workBlueprint',
      entityId: blueprint.id,
      summary: `Generated Work Blueprint with ${blueprint.workstreams.length} workstreams and ${blueprint.suggestedMilestones.length} suggested milestones.`,
    });

    return res.status(201).json({
      success: true,
      data: {
        project,
        blueprint,
      },
      message: 'Project created and Work Blueprint synthesized with assigned roles.',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:projectId - secure tenant check
router.get('/:projectId', authMiddleware, (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const project = dbStore.projects.get(projectId);

  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  const userId = req.user!.id;
  const userRole = req.user!.role;

  // Security check: Only Admin, the Client owner, or the Assigned Provider can view this project
  if (userRole !== 'admin' && project.ownerId !== userId && !project.providerIds.includes(userId)) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You do not have permission to access this project.',
    });
  }

  // Find latest blueprint
  const blueprints = Array.from(dbStore.blueprints.values()).filter((b) => b.projectId === projectId);
  const latestBlueprint = blueprints[blueprints.length - 1] || null;

  // Find milestones
  const milestones = Array.from(dbStore.milestones.values()).filter((m) => m.projectId === projectId);

  // Find agreements
  const agreements = Array.from(dbStore.agreements.values()).filter((a) => a.projectId === projectId);

  return res.json({
    success: true,
    data: {
      project,
      blueprint: latestBlueprint,
      milestones,
      agreements,
    },
  });
});

// GET /api/projects/:projectId/activity (Audit Events)
router.get('/:projectId/activity', authMiddleware, (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const project = dbStore.projects.get(projectId);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  const userId = req.user!.id;
  const userRole = req.user!.role;

  if (userRole !== 'admin' && project.ownerId !== userId && !project.providerIds.includes(userId)) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const events = dbStore.auditEvents.filter((e) => e.projectId === projectId);

  return res.json({
    success: true,
    data: { events },
  });
});

export default router;
