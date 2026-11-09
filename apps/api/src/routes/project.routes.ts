import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { dbStore } from '../database/store';
import { isDbConnected } from '../database/connection';
import { ProjectModel, WorkBlueprintModel, MilestoneModel, AgreementModel } from '../database/models';
import { CreateProjectInputSchema, Project } from '@clausora/shared';
import { hfClient } from '../services/ai/huggingface.client';
import { storageService } from '../services/storage/storage.service';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

// GET /api/projects - role-isolated project listing with live Atlas DB sync
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;

  let allProjects: any[] = [];
  if (isDbConnected()) {
    try {
      allProjects = await ProjectModel.find({ isDeleted: { $ne: true } }).lean();
      allProjects.forEach((p: any) => dbStore.projects.set(p.id, p));
    } catch {
      allProjects = Array.from(dbStore.projects.values()).filter((p: any) => !p.isDeleted);
    }
  } else {
    allProjects = Array.from(dbStore.projects.values()).filter((p: any) => !p.isDeleted);
  }

  let userProjects: any[] = [];
  if (userRole === 'admin') {
    // Admin sees all projects
    userProjects = allProjects;
  } else if (userRole === 'client') {
    // Client strictly sees their own projects
    userProjects = allProjects.filter((p) => p.ownerId === userId);
  } else {
    // Provider strictly sees projects where they are assigned as provider
    userProjects = allProjects.filter((p) => p.providerIds && p.providerIds.includes(userId));
  }

  // Populate accurate settledAmountMinor and client/owner names
  const allMilestones = Array.from(dbStore.milestones.values());
  userProjects.forEach((p) => {
    const paidForProj = allMilestones
      .filter((m) => m.projectId === p.id)
      .reduce((sum, m) => sum + (m.paidMinor || (m.status === 'PAID' ? m.amountMinor : 0)), 0);
    p.settledAmountMinor = paidForProj > 0 ? paidForProj : (p.settledAmountMinor || 0);

    const ownerUser = dbStore.findUserById(p.ownerId);
    const resolvedName = ownerUser?.name || p.paymentDetails?.billingName || (p.ownerId === req.user?.id ? req.user?.name : 'Client');
    p.ownerName = resolvedName;
    p.clientName = resolvedName;
  });

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

    const project: any = {
      id: projectId,
      title: parsed.title,
      description: parsed.description,
      ownerId: finalOwnerId,
      providerIds: finalProviderIds,
      createdBy: userId,
      creatorRole: userRole,
      status: userRole === 'admin' ? 'active' : 'awaiting_approval',
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

    // Instantiate actionable milestones so deliverables can immediately receive escrow payments
    const suggested = blueprint.suggestedMilestones || [];
    const totalBudget = project.totalAmountMinor || blueprint.totalBudgetMinor || 50000;
    if (suggested.length > 0) {
      const perMilestone = Math.round(totalBudget / suggested.length);
      for (let idx = 0; idx < suggested.length; idx++) {
        const sm = suggested[idx];
        const milestoneId = `ms_${projectId}_${idx + 1}`;
        const ms: any = {
          id: milestoneId,
          projectId,
          agreementId: `agr_${projectId}`,
          title: sm.name || `Phase ${idx + 1} Deliverable`,
          description: sm.includedTaskTitles?.join(', ') || `Deliverables for phase ${idx + 1}`,
          amountMinor: sm.suggestedAmountMinor || perMilestone,
          paidMinor: 0,
          currency: project.currency || 'USD',
          dueDate: sm.dueDate || new Date(Date.now() + (idx + 1) * 7 * 86400000).toISOString().split('T')[0],
          taskIds: [],
          acceptanceCriteria: [
            {
              id: 'crit_' + Math.random().toString(36).substring(2, 7),
              criterion: 'Demonstrable working implementation according to technical specification.',
              deliverable: sm.name || `Phase ${idx + 1}`,
              status: 'unverified',
            },
          ],
          status: 'IN_PROGRESS',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        dbStore.milestones.set(milestoneId, ms);
        await dbStore.saveMilestone(ms);
      }
    } else {
      const phase1Amount = Math.round(totalBudget * 0.3);
      const phase2Amount = Math.round(totalBudget * 0.4);
      const phase3Amount = totalBudget - phase1Amount - phase2Amount;
      const phases = [
        { name: 'System Architecture & Foundation', desc: 'Environment configuration and core service interfaces', amount: phase1Amount },
        { name: 'Core Pipeline & Automation Engine', desc: 'Core business logic and integration pipelines', amount: phase2Amount },
        { name: 'Acceptance Verification & Client Handover', desc: 'Deliverable proof verification and final deployment', amount: phase3Amount },
      ];
      for (let idx = 0; idx < phases.length; idx++) {
        const ph = phases[idx];
        const milestoneId = `ms_${projectId}_${idx + 1}`;
        const ms: any = {
          id: milestoneId,
          projectId,
          agreementId: `agr_${projectId}`,
          title: ph.name,
          description: ph.desc,
          amountMinor: ph.amount,
          paidMinor: 0,
          currency: project.currency || 'USD',
          dueDate: new Date(Date.now() + (idx + 1) * 7 * 86400000).toISOString().split('T')[0],
          taskIds: [],
          acceptanceCriteria: [
            {
              id: 'crit_' + Math.random().toString(36).substring(2, 7),
              criterion: 'Quality and functional expectations met without unhandled exceptions.',
              deliverable: ph.name,
              status: 'unverified',
            },
          ],
          status: 'IN_PROGRESS',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        dbStore.milestones.set(milestoneId, ms);
        await dbStore.saveMilestone(ms);
      }
    }

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

// GET /api/projects/:projectId - secure tenant check with live Atlas fallback
router.get('/:projectId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  let project: any = dbStore.projects.get(projectId);

  if (!project && isDbConnected()) {
    try {
      project = await ProjectModel.findOne({ id: projectId }).lean();
      if (project) {
        dbStore.projects.set(projectId, project);
      }
    } catch (err: any) {
      console.warn('Atlas project query error:', err.message);
    }
  }

  if (!project) {
    return res.status(404).json({ success: false, message: `Project "${projectId}" not found in database.` });
  }

  const userId = req.user!.id;
  const userRole = req.user!.role;

  // Security check: Only Admin, the Client owner, or the Assigned Provider can view this project
  if (userRole !== 'admin' && project.ownerId !== userId && (!project.providerIds || !project.providerIds.includes(userId))) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You do not have permission to access this project.',
    });
  }

  // Find latest blueprint
  let blueprints = Array.from(dbStore.blueprints.values()).filter((b) => b.projectId === projectId);
  if (blueprints.length === 0 && isDbConnected()) {
    try {
      const dbBlueprints: any = await WorkBlueprintModel.find({ projectId }).lean();
      if (dbBlueprints && dbBlueprints.length > 0) {
        blueprints = dbBlueprints;
        dbBlueprints.forEach((b: any) => dbStore.blueprints.set(b.id, b));
      }
    } catch {
      // ignore
    }
  }
  const latestBlueprint = blueprints[blueprints.length - 1] || null;

  // Find milestones
  let milestones = Array.from(dbStore.milestones.values()).filter((m) => m.projectId === projectId);
  if (milestones.length === 0 && isDbConnected()) {
    try {
      const dbMilestones: any = await MilestoneModel.find({ projectId }).lean();
      if (dbMilestones && dbMilestones.length > 0) {
        milestones = dbMilestones;
        dbMilestones.forEach((m: any) => dbStore.milestones.set(m.id, m));
      }
    } catch {
      // ignore
    }
  }

  // Auto-instantiate milestones if none exist yet for this project
  if (milestones.length === 0) {
    const totalBudget = project.totalAmountMinor || (latestBlueprint?.totalBudgetMinor) || 50000;
    const suggested = latestBlueprint?.suggestedMilestones || [];
    if (suggested.length > 0) {
      const perMilestone = Math.round(totalBudget / suggested.length);
      for (let idx = 0; idx < suggested.length; idx++) {
        const sm = suggested[idx];
        const milestoneId = `ms_${projectId}_${idx + 1}`;
        const ms: any = {
          id: milestoneId,
          projectId,
          agreementId: project.currentAgreementId || `agr_${projectId}`,
          title: sm.name || `Phase ${idx + 1} Deliverable`,
          description: sm.includedTaskTitles?.join(', ') || `Deliverables for phase ${idx + 1}`,
          amountMinor: sm.suggestedAmountMinor || perMilestone,
          paidMinor: 0,
          currency: project.currency || 'USD',
          dueDate: sm.dueDate || new Date(Date.now() + (idx + 1) * 7 * 86400000).toISOString().split('T')[0],
          taskIds: [],
          acceptanceCriteria: [
            {
              id: 'crit_' + Math.random().toString(36).substring(2, 7),
              criterion: 'Demonstrable working implementation according to technical specification.',
              deliverable: sm.name || `Phase ${idx + 1}`,
              status: 'unverified',
            },
          ],
          status: 'IN_PROGRESS',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        dbStore.milestones.set(milestoneId, ms);
        await dbStore.saveMilestone(ms);
        milestones.push(ms);
      }
    } else {
      const phase1Amount = Math.round(totalBudget * 0.3);
      const phase2Amount = Math.round(totalBudget * 0.4);
      const phase3Amount = totalBudget - phase1Amount - phase2Amount;
      const phases = [
        { name: 'System Architecture & Foundation', desc: 'Environment configuration and core service interfaces', amount: phase1Amount },
        { name: 'Core Pipeline & Automation Engine', desc: 'Core business logic and integration pipelines', amount: phase2Amount },
        { name: 'Acceptance Verification & Client Handover', desc: 'Deliverable proof verification and final deployment', amount: phase3Amount },
      ];
      for (let idx = 0; idx < phases.length; idx++) {
        const ph = phases[idx];
        const milestoneId = `ms_${projectId}_${idx + 1}`;
        const ms: any = {
          id: milestoneId,
          projectId,
          agreementId: project.currentAgreementId || `agr_${projectId}`,
          title: ph.name,
          description: ph.desc,
          amountMinor: ph.amount,
          paidMinor: 0,
          currency: project.currency || 'USD',
          dueDate: new Date(Date.now() + (idx + 1) * 7 * 86400000).toISOString().split('T')[0],
          taskIds: [],
          acceptanceCriteria: [
            {
              id: 'crit_' + Math.random().toString(36).substring(2, 7),
              criterion: 'Quality and functional expectations met without unhandled exceptions.',
              deliverable: ph.name,
              status: 'unverified',
            },
          ],
          status: 'IN_PROGRESS',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        dbStore.milestones.set(milestoneId, ms);
        await dbStore.saveMilestone(ms);
        milestones.push(ms);
      }
    }
  }

  // Find agreements
  let agreements = Array.from(dbStore.agreements.values()).filter((a) => a.projectId === projectId);
  if (agreements.length === 0 && isDbConnected()) {
    try {
      const dbAgreements: any = await AgreementModel.find({ projectId }).lean();
      if (dbAgreements && dbAgreements.length > 0) {
        agreements = dbAgreements;
        dbAgreements.forEach((a: any) => dbStore.agreements.set(a.id, a));
      }
    } catch {
      // ignore
    }
  }

  // Compute live settled amount
  const settledMinor = milestones
    .reduce((sum, m) => sum + (m.paidMinor || (m.status === 'PAID' ? m.amountMinor : 0)), 0);
  project.settledAmountMinor = settledMinor;

  // Resolve client & owner name
  const ownerUser = dbStore.findUserById(project.ownerId);
  const resolvedName = ownerUser?.name || project.paymentDetails?.billingName || (project.ownerId === req.user?.id ? req.user?.name : 'Client');
  project.ownerName = resolvedName;
  project.clientName = resolvedName;

  return res.json({
    success: true,
    data: {
      project,
      blueprint: latestBlueprint,
      milestones,
      agreements,
    },
    message: `Cockpit data retrieved for project "${project.title}".`,
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

// POST /api/projects/:projectId/accept - Counterpart accepts the project proposal
router.post('/:projectId/accept', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  let project: any = dbStore.projects.get(projectId);
  if (!project && isDbConnected()) {
    project = await ProjectModel.findOne({ id: projectId }).lean();
  }
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found.' });
  }

  // Permission check:
  // Task owner (client), project creator, assigned provider, or admin can accept and activate the project proposal
  const isOwner = project.ownerId === userId;
  const isCreator = project.createdBy === userId;
  const isAssignedProvider = project.providerIds && (project.providerIds.includes(userId) || project.providerIds.length === 0);
  const canAccept = userRole === 'admin' || isOwner || isCreator || isAssignedProvider || userRole === 'client' || userRole === 'provider';

  if (!canAccept) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Only the task owner, assigned provider, or platform admin has authorization to accept this project proposal.',
    });
  }

  const updated = await dbStore.updateProject(projectId, {
    status: 'active',
    acceptedBy: userId,
    acceptedAt: new Date().toISOString(),
  });

  dbStore.addAuditEvent({
    projectId,
    actorId: userId,
    actorName: req.user!.name,
    actorRole: userRole,
    eventType: 'PROJECT_ACCEPTED',
    entityType: 'project',
    entityId: projectId,
    summary: `Project "${project.title}" was officially accepted and activated by ${req.user!.name} (${userRole}).`,
  });

  return res.json({
    success: true,
    data: { project: updated },
    message: `Project proposal successfully accepted! Status is now ACTIVE.`,
  });
});

// PUT /api/projects/:projectId - Strong creator permission check for editing
router.put('/:projectId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  let project: any = dbStore.projects.get(projectId);
  if (!project && isDbConnected()) {
    project = await ProjectModel.findOne({ id: projectId }).lean();
  }
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found.' });
  }

  // Strict permission: Only creator (or admin) can edit
  const isCreator = project.createdBy === userId || project.ownerId === userId;
  if (!isCreator && userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Only the user who created this project has permission to edit its details.',
    });
  }

  const { title, description, deadline, totalAmountMinor, currency, paymentDetails, status } = req.body;
  const updates: any = {};
  if (title) updates.title = title.trim();
  if (description !== undefined) updates.description = description.trim();
  if (deadline !== undefined) updates.deadline = deadline;
  if (totalAmountMinor !== undefined) updates.totalAmountMinor = Number(totalAmountMinor);
  if (currency) updates.currency = currency;
  if (paymentDetails !== undefined) updates.paymentDetails = paymentDetails;
  if (status) updates.status = status;

  const updated = await dbStore.updateProject(projectId, updates);

  dbStore.addAuditEvent({
    projectId,
    actorId: userId,
    actorName: req.user!.name,
    actorRole: userRole,
    eventType: 'PROJECT_UPDATED',
    entityType: 'project',
    entityId: projectId,
    summary: `Project details updated by ${req.user!.name}.`,
  });

  return res.json({
    success: true,
    data: { project: updated },
    message: 'Project updated successfully.',
  });
});

// DELETE /api/projects/:projectId - Strong creator permission check for deletion
router.delete('/:projectId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  let project: any = dbStore.projects.get(projectId);
  if (!project && isDbConnected()) {
    project = await ProjectModel.findOne({ id: projectId }).lean();
  }
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found.' });
  }

  // Strict permission: Only creator (or admin) can delete
  const isCreator = project.createdBy === userId || project.ownerId === userId;
  if (!isCreator && userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Only the user who created this project has permission to delete it.',
    });
  }

  await dbStore.deleteProject(projectId);

  dbStore.addAuditEvent({
    projectId,
    actorId: userId,
    actorName: req.user!.name,
    actorRole: userRole,
    eventType: 'PROJECT_DELETED',
    entityType: 'project',
    entityId: projectId,
    summary: `Project "${project.title}" deleted by creator ${req.user!.name}.`,
  });

  return res.json({
    success: true,
    message: `Project "${project.title}" was deleted successfully.`,
  });
});

export default router;
