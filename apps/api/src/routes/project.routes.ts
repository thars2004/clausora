import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { dbStore } from '../database/store';
import { isDbConnected } from '../database/connection';
import { ProjectModel, WorkBlueprintModel, MilestoneModel, AgreementModel } from '../database/models';
import { CreateProjectInputSchema, Project } from '@clausora/shared';
import { hfClient } from '../services/ai/huggingface.client';
import { storageService } from '../services/storage/storage.service';
import { NotificationService } from '../services/notifications/notification.service';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const notificationService = new NotificationService();
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

    const providerUser = p.providerIds && p.providerIds.length > 0
      ? dbStore.findUserById(p.providerIds[0])
      : (p.acceptedBy ? dbStore.findUserById(p.acceptedBy) : null);
    p.assignedProviderName = providerUser?.name || 'Alex Rivera (Rivera Tech)';
    p.assignedProviderId = providerUser?.id || (p.providerIds && p.providerIds[0]) || 'usr_provider_demo';
  });

  // First-Come-First-Serve: Oldest project first (order of creation)
  userProjects.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());

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

    // Instantiate actionable milestones based directly on task content and effort hours
    const workstreams = blueprint.workstreams || [];
    const allTasks = workstreams.flatMap((ws) => ws.tasks || []);
    const totalHours = allTasks.reduce((sum, t) => sum + (t.estimatedEffortHours || 8), 0) || 1;
    const totalBudget = project.totalAmountMinor || blueprint.totalBudgetMinor || 50000;

    if (workstreams.length > 0) {
      let accumulated = 0;
      for (let idx = 0; idx < workstreams.length; idx++) {
        const ws = workstreams[idx];
        const wsTasks = ws.tasks || [];
        const wsHours = wsTasks.reduce((sum, t) => sum + (t.estimatedEffortHours || 8), 0);
        let amountMinor = Math.round(totalBudget * (wsHours / totalHours));
        if (idx === workstreams.length - 1) {
          amountMinor = Math.max(0, totalBudget - accumulated);
        } else {
          accumulated += amountMinor;
        }

        const milestoneId = `ms_${projectId}_${idx + 1}`;
        const taskListStr = wsTasks.map((t) => `[${t.id}] ${t.title}`).join(' • ');
        const ms: any = {
          id: milestoneId,
          projectId,
          agreementId: `agr_${projectId}`,
          title: ws.name ? `Milestone ${idx + 1}: ${ws.name}` : `Milestone ${idx + 1}: ${wsTasks[0]?.title || 'Phase Deliverable'}`,
          description: taskListStr || ws.description || `Deliverables for milestone ${idx + 1}`,
          amountMinor,
          paidMinor: 0,
          currency: project.currency || 'USD',
          dueDate: new Date(Date.now() + (idx + 1) * 7 * 86400000).toISOString().split('T')[0],
          taskIds: wsTasks.map((t) => t.id),
          acceptanceCriteria: wsTasks.flatMap((t) =>
            (t.acceptanceCriteria || []).map((ac: any) => ({
              id: 'crit_' + Math.random().toString(36).substring(2, 7),
              criterion: typeof ac === 'string' ? ac : ac.criterion || ac.deliverable,
              deliverable: t.title,
              status: 'unverified',
            }))
          ),
          status: 'IN_PROGRESS',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        dbStore.milestones.set(milestoneId, ms);
        await dbStore.saveMilestone(ms);
      }
    } else {
      const suggested = blueprint.suggestedMilestones || [];
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

  // Auto-instantiate milestones based on task content if none exist yet for this project
  const workstreams = latestBlueprint?.workstreams || [];
  const totalBudget = project.totalAmountMinor || (latestBlueprint?.totalBudgetMinor) || 50000;

  if (milestones.length === 0) {
    if (workstreams.length > 0) {
      const allTasks = workstreams.flatMap((ws) => ws.tasks || []);
      const totalHours = allTasks.reduce((sum, t) => sum + (t.estimatedEffortHours || 8), 0) || 1;
      let accumulated = 0;

      for (let idx = 0; idx < workstreams.length; idx++) {
        const ws = workstreams[idx];
        const wsTasks = ws.tasks || [];
        const wsHours = wsTasks.reduce((sum, t) => sum + (t.estimatedEffortHours || 8), 0);
        let amountMinor = Math.round(totalBudget * (wsHours / totalHours));
        if (idx === workstreams.length - 1) {
          amountMinor = Math.max(0, totalBudget - accumulated);
        } else {
          accumulated += amountMinor;
        }

        const milestoneId = `ms_${projectId}_${idx + 1}`;
        const taskListStr = wsTasks.map((t) => `[${t.id}] ${t.title}`).join(' • ');
        const ms: any = {
          id: milestoneId,
          projectId,
          agreementId: project.currentAgreementId || `agr_${projectId}`,
          title: ws.name ? `Milestone ${idx + 1}: ${ws.name}` : `Milestone ${idx + 1}: ${wsTasks[0]?.title || 'Phase Deliverable'}`,
          description: taskListStr || ws.description || `Deliverables for milestone ${idx + 1}`,
          amountMinor,
          paidMinor: 0,
          currency: project.currency || 'USD',
          dueDate: new Date(Date.now() + (idx + 1) * 7 * 86400000).toISOString().split('T')[0],
          taskIds: wsTasks.map((t) => t.id),
          acceptanceCriteria: wsTasks.flatMap((t) =>
            (t.acceptanceCriteria || []).map((ac: any) => ({
              id: 'crit_' + Math.random().toString(36).substring(2, 7),
              criterion: typeof ac === 'string' ? ac : ac.criterion || ac.deliverable,
              deliverable: t.title,
              status: 'unverified',
            }))
          ),
          status: 'IN_PROGRESS',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        dbStore.milestones.set(milestoneId, ms);
        await dbStore.saveMilestone(ms);
        milestones.push(ms);
      }
    } else {
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
  } else if (milestones.length > 0 && workstreams.length > 0) {
    // Reconcile and calculate milestones based on task content for existing milestones
    let needsSaveAny = false;
    milestones.forEach((m, idx) => {
      const ws = workstreams[idx];
      if (ws) {
        const wsTasks = ws.tasks || [];
        if (!m.taskIds || m.taskIds.length === 0) {
          m.taskIds = wsTasks.map((t) => t.id);
          needsSaveAny = true;
        }
        if (!m.description || m.description.startsWith('Deliverables for phase')) {
          m.description = wsTasks.map((t) => `[${t.id}] ${t.title}`).join(' • ');
          needsSaveAny = true;
        }
        if (needsSaveAny) {
          dbStore.milestones.set(m.id, m);
          dbStore.saveMilestone(m).catch(() => {});
        }
      }
    });
  }

  // Calculate dynamic progress percent for each milestone based on task progress
  milestones.forEach((m) => {
    if (m.status === 'PAID') {
      m.progressPercent = 100;
    } else {
      const msTasks = workstreams.flatMap((ws) => ws.tasks || []).filter((t) => m.taskIds && m.taskIds.includes(t.id));
      if (msTasks.length > 0) {
        const totalTaskScore = msTasks.reduce((sum, t) => {
          const score = t.status === 'done' ? 100 : t.status === 'submitted' ? 80 : t.status === 'in_progress' ? 50 : 0;
          return sum + score;
        }, 0);
        m.progressPercent = Math.round(totalTaskScore / msTasks.length);
      } else if (m.status === 'SUBMITTED' || m.status === 'APPROVED_FOR_PAYMENT') {
        m.progressPercent = 80;
      } else if (m.status === 'IN_PROGRESS') {
        m.progressPercent = 35;
      } else {
        m.progressPercent = 0;
      }
    }
  });

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

  const providerUser = project.providerIds && project.providerIds.length > 0
    ? dbStore.findUserById(project.providerIds[0])
    : (project.acceptedBy ? dbStore.findUserById(project.acceptedBy) : null);
  project.assignedProviderName = providerUser?.name || 'Alex Rivera (Rivera Tech)';
  project.assignedProviderId = providerUser?.id || (project.providerIds && project.providerIds[0]) || 'usr_provider_demo';

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

  // Newest First: Sort audit activity events descending by date
  const events = dbStore.auditEvents
    .filter((e) => e.projectId === projectId)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return res.json({
    success: true,
    data: { events },
  });
});

// POST /api/projects/:projectId/accept - Opponent counterpart accepts and activates the project proposal
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

  if (project.status === 'active') {
    return res.status(400).json({
      success: false,
      message: 'This project proposal has already been accepted and is currently active.',
    });
  }

  // Strict Bilateral Rule:
  // If the project is created by 1 user, the OPPONENT client or provider must review, approve, and activate the project.
  // The creator CANNOT approve their own proposal!
  const isCreator = project.createdBy === userId;

  if (isCreator && userRole !== 'admin') {
    const isClientCreator = project.creatorRole === 'client' || (!project.creatorRole && project.ownerId === project.createdBy);
    const counterpartRole = isClientCreator ? 'assigned Provider' : 'Client owner';
    return res.status(403).json({
      success: false,
      message: `Forbidden: As the creator of this project proposal, you cannot self-approve. The opponent ${counterpartRole} must review and accept the project to activate it.`,
    });
  }

  // Determine authorized opponent counterpart
  const isCreatedByClient = project.creatorRole === 'client' || (!project.creatorRole && project.createdBy === project.ownerId);
  const isCreatedByProvider = project.creatorRole === 'provider' || (!isCreatedByClient && project.createdBy !== project.ownerId);

  let isAuthorizedOpponent = false;
  if (userRole === 'admin') {
    isAuthorizedOpponent = true;
  } else if (isCreatedByClient) {
    // Project was created by Client -> Opponent MUST be Provider
    isAuthorizedOpponent =
      userRole === 'provider' ||
      (project.providerIds && (project.providerIds.includes(userId) || project.providerIds.length === 0)) ||
      project.assignedProviderId === userId;
  } else if (isCreatedByProvider) {
    // Project was created by Provider -> Opponent MUST be Client Owner
    isAuthorizedOpponent =
      (userRole === 'client' && (project.ownerId === userId || !project.ownerId)) ||
      project.ownerId === userId;
  }

  if (!isAuthorizedOpponent) {
    const requiredRole = isCreatedByClient ? 'assigned Provider' : 'Client owner';
    return res.status(403).json({
      success: false,
      message: `Forbidden: Only the opponent ${requiredRole} has authorization to accept and activate this project proposal.`,
    });
  }

  const providerIds = project.providerIds || [];
  if (userRole === 'provider' && !providerIds.includes(userId)) {
    providerIds.push(userId);
  }

  const updated = await dbStore.updateProject(projectId, {
    status: 'active',
    acceptedBy: userId,
    acceptedAt: new Date().toISOString(),
    providerIds,
  });

  dbStore.addAuditEvent({
    projectId,
    actorId: userId,
    actorName: req.user!.name,
    actorRole: userRole,
    eventType: 'PROJECT_ACCEPTED',
    entityType: 'project',
    entityId: projectId,
    summary: `Project "${project.title}" was approved and activated by opponent counterpart ${req.user!.name} (${userRole}).`,
  });

  // Notify creator that their proposal was accepted
  const recipientId = project.createdBy || project.ownerId;
  if (recipientId && recipientId !== userId) {
    await notificationService.send({
      userId: recipientId,
      projectId,
      type: 'PROJECT_ACCEPTED' as any,
      title: 'Project Proposal Accepted!',
      body: `${req.user!.name} (${userRole}) has accepted and activated "${project.title}". Work and escrow releases are now active.`,
    });
  }

  return res.json({
    success: true,
    data: { project: updated },
    message: `Project proposal successfully accepted! Status is now ACTIVE.`,
  });
});

// POST /api/projects/:projectId/close - Close project after full payment settlement
router.post('/:projectId/close', authMiddleware, async (req: AuthRequest, res: Response) => {
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

  // Permission: Client owner, creator, assigned provider or admin can close
  const isCreatorOrOwner = project.createdBy === userId || project.ownerId === userId;
  const isAssignedProvider = project.providerIds && project.providerIds.includes(userId);
  if (!isCreatorOrOwner && !isAssignedProvider && userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You do not have permission to close this project.',
    });
  }

  if (project.status === 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Project is already closed and finalized.',
    });
  }

  // Verify full payment condition
  const allMilestones = Array.from(dbStore.milestones.values()).filter((m) => m.projectId === projectId);
  const totalSettledMinor = allMilestones.reduce(
    (sum, m) => sum + (m.paidMinor || (m.status === 'PAID' ? m.amountMinor : 0)),
    0
  );
  const totalBudgetMinor = project.totalAmountMinor || 0;
  const isFullyPaid =
    (totalBudgetMinor > 0 && totalSettledMinor >= totalBudgetMinor) ||
    (allMilestones.length > 0 && allMilestones.every((m) => m.status === 'PAID' || (m.paidMinor && m.paidMinor >= m.amountMinor)));

  if (!isFullyPaid && userRole !== 'admin') {
    return res.status(400).json({
      success: false,
      message: `Cannot close project: Full payment settlement required before closure. Settled: $${(totalSettledMinor / 100).toFixed(2)} USD of $${(totalBudgetMinor / 100).toFixed(2)} USD.`,
    });
  }

  const updated = await dbStore.updateProject(projectId, {
    status: 'completed',
  });

  dbStore.addAuditEvent({
    projectId,
    actorId: userId,
    actorName: req.user!.name,
    actorRole: userRole,
    eventType: 'PROJECT_COMPLETED',
    entityType: 'project',
    entityId: projectId,
    summary: `Project "${project.title}" closed and marked COMPLETED by ${req.user!.name} (${userRole}) following full escrow payment settlement.`,
  });

  return res.json({
    success: true,
    data: { project: updated },
    message: `Project "${project.title}" has been successfully closed and finalized.`,
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

// POST /api/projects/:projectId/tasks - Create a new task and correctly place/calculate the milestone
router.post('/:projectId/tasks', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const project = dbStore.projects.get(projectId);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found.' });
  }

  const {
    title,
    description,
    estimatedEffortHours,
    priority,
    deliverable,
    acceptanceCriteria,
    status: initialStatus,
    targetMilestoneId,
    createDedicatedMilestone,
  } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Task title is required.' });
  }

  // Find latest blueprint
  const blueprints = Array.from(dbStore.blueprints.values()).filter((b) => b.projectId === projectId);
  let blueprint = blueprints[blueprints.length - 1];
  if (!blueprint) {
    blueprint = {
      id: 'bp_' + Math.random().toString(36).substring(2, 9),
      projectId,
      version: 1,
      projectTitle: project.title,
      projectSummary: project.description,
      detectedProjectType: 'web_app',
      missingInformation: [],
      aiModel: 'meta-llama/Llama-3-70b-instruct',
      assumptions: [],
      risks: [],
      clarifyingQuestions: [],
      workstreams: [],
      suggestedMilestones: [],
      totalBudgetMinor: project.totalAmountMinor || 50000,
      currency: project.currency || 'USD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dbStore.blueprints.set(blueprint.id, blueprint);
  }

  // Count existing tasks to generate incremental ID: TASK-XXX
  const allTasks = blueprint.workstreams.flatMap((ws) => ws.tasks || []);
  let maxNum = 0;
  for (const t of allTasks) {
    const match = t.id.match(/TASK-(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  const nextTaskId = `TASK-${String(maxNum + 1).padStart(3, '0')}`;

  const taskHours = Number(estimatedEffortHours) > 0 ? Number(estimatedEffortHours) : 16;
  const taskStatus = initialStatus || 'todo';
  const newTask: any = {
    id: nextTaskId,
    title: title.trim(),
    description: description ? description.trim() : title.trim(),
    estimatedEffortHours: taskHours,
    priority: priority || 'medium',
    complexity: 'medium',
    deliverable: deliverable ? deliverable.trim() : title.trim(),
    acceptanceCriteria: Array.isArray(acceptanceCriteria) && acceptanceCriteria.length > 0
      ? acceptanceCriteria
      : [`Demonstrable working implementation of ${title.trim()}.`],
    dependencies: [],
    recommendedEvidence: ['repository_link', 'screenshot'],
    confidence: 1.0,
    status: taskStatus,
    assignedClientId: project.ownerId,
    assignedProviderId: project.assignedProviderId || (project.providerIds && project.providerIds[0]) || 'usr_provider_demo',
  };

  // Find project milestones
  const existingMilestones = Array.from(dbStore.milestones.values()).filter((m) => m.projectId === projectId);

  let affectedMilestone: any = null;

  if (targetMilestoneId && !createDedicatedMilestone) {
    // Attach to existing milestone
    affectedMilestone = existingMilestones.find((m) => m.id === targetMilestoneId);
  }

  if (affectedMilestone) {
    if (!affectedMilestone.taskIds) affectedMilestone.taskIds = [];
    if (!affectedMilestone.taskIds.includes(newTask.id)) {
      affectedMilestone.taskIds.push(newTask.id);
    }
    affectedMilestone.description = affectedMilestone.description
      ? `${affectedMilestone.description} • [${newTask.id}] ${newTask.title}`
      : `[${newTask.id}] ${newTask.title}`;

    (newTask.acceptanceCriteria || []).forEach((crit: string) => {
      affectedMilestone.acceptanceCriteria.push({
        id: 'crit_' + Math.random().toString(36).substring(2, 7),
        criterion: crit,
        deliverable: newTask.title,
        status: 'unverified',
      });
    });

    // Update milestone status based on task progress
    if (taskStatus === 'submitted') {
      affectedMilestone.status = 'SUBMITTED';
    }

    affectedMilestone.updatedAt = new Date().toISOString();
    dbStore.milestones.set(affectedMilestone.id, affectedMilestone);
    await dbStore.saveMilestone(affectedMilestone);

    // Put into matching workstream or first workstream
    let ws = blueprint.workstreams.find((w) => w.name.includes(affectedMilestone.title) || w.tasks.some((t: any) => affectedMilestone.taskIds.includes(t.id)));
    if (!ws && blueprint.workstreams.length > 0) ws = blueprint.workstreams[0];
    if (ws) {
      ws.tasks.push(newTask);
    } else {
      blueprint.workstreams.push({
        id: 'ws_' + Math.random().toString(36).substring(2, 7),
        name: affectedMilestone.title,
        description: affectedMilestone.description,
        tasks: [newTask],
      });
    }
  } else {
    // Create a new dedicated milestone for this task
    const nextIdx = existingMilestones.length + 1;
    const newMsId = `ms_${projectId}_${nextIdx}`;

    // Calculate milestone amount based on task effort hours and project budget
    const totalExistingHours = allTasks.reduce((sum, t) => sum + (t.estimatedEffortHours || 8), 0);
    const newTotalHours = totalExistingHours + taskHours;
    const projectTotalMinor = project.totalAmountMinor || blueprint.totalBudgetMinor || 50000;
    const calculatedAmountMinor = Math.max(1000, Math.round(projectTotalMinor * (taskHours / (newTotalHours || 1))));

    // Calculate initial milestone status based on task progress
    let initialMilestoneStatus: any = 'IN_PROGRESS';
    if (taskStatus === 'submitted') initialMilestoneStatus = 'SUBMITTED';
    else if (taskStatus === 'done') initialMilestoneStatus = 'APPROVED_FOR_PAYMENT';

    affectedMilestone = {
      id: newMsId,
      projectId,
      agreementId: project.currentAgreementId || `agr_${projectId}`,
      title: `Milestone ${nextIdx}: ${newTask.title}`,
      description: `[${newTask.id}] ${newTask.title} (${taskHours}h) • ${newTask.description}`,
      amountMinor: calculatedAmountMinor,
      paidMinor: 0,
      currency: project.currency || 'USD',
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      taskIds: [newTask.id],
      acceptanceCriteria: (newTask.acceptanceCriteria || []).map((crit: string) => ({
        id: 'crit_' + Math.random().toString(36).substring(2, 7),
        criterion: crit,
        deliverable: newTask.title,
        status: 'unverified',
      })),
      status: initialMilestoneStatus,
      progressPercent: taskStatus === 'done' ? 100 : taskStatus === 'submitted' ? 80 : taskStatus === 'in_progress' ? 50 : 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dbStore.milestones.set(newMsId, affectedMilestone);
    await dbStore.saveMilestone(affectedMilestone);

    // Create corresponding workstream for the new milestone
    blueprint.workstreams.push({
      id: 'ws_' + Math.random().toString(36).substring(2, 7),
      name: affectedMilestone.title,
      description: affectedMilestone.description,
      tasks: [newTask],
    });
  }

  blueprint.updatedAt = new Date().toISOString();
  dbStore.blueprints.set(blueprint.id, blueprint);
  await dbStore.saveBlueprint(blueprint);

  dbStore.addAuditEvent({
    projectId,
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorRole: req.user!.role,
    eventType: 'TASK_CREATED',
    entityType: 'task',
    entityId: newTask.id,
    summary: `Created new task [${newTask.id}] "${newTask.title}" (${taskHours}h). Milestone "${affectedMilestone.title}" allocated with status ${affectedMilestone.status}.`,
  });

  return res.status(201).json({
    success: true,
    data: {
      task: newTask,
      milestone: affectedMilestone,
      blueprint,
    },
    message: `Task [${newTask.id}] and Milestone "${affectedMilestone.title}" created successfully.`,
  });
});

// PATCH /api/projects/:projectId/tasks/:taskId - Update task status/progress and synchronize milestone
router.patch('/:projectId/tasks/:taskId', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { projectId, taskId } = req.params;
  const { status: newStatus } = req.body;

  const project = dbStore.projects.get(projectId);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found.' });
  }

  if (project.status === 'awaiting_approval') {
    return res.status(400).json({
      success: false,
      message: 'Cannot update task progress: Project proposal is awaiting counterpart acceptance. The project must be approved and activated before task progress can be recorded.',
      reason: 'Project proposal must be accepted and activated first before task progress can be updated.',
    });
  }

  if (project.status === 'completed' || (project.status as string) === 'closed') {
    return res.status(400).json({
      success: false,
      message: 'Cannot modify task: Project is completed and closed. All task statuses and workstreams are permanently locked for audit integrity.',
      reason: 'Closed project tasks are immutable.',
    });
  }

  const blueprints = Array.from(dbStore.blueprints.values()).filter((b) => b.projectId === projectId);
  const blueprint = blueprints[blueprints.length - 1];
  if (!blueprint) {
    return res.status(404).json({ success: false, message: 'Blueprint not found.' });
  }

  let foundTask: any = null;
  for (const ws of blueprint.workstreams) {
    for (const t of ws.tasks) {
      if (t.id === taskId) {
        foundTask = t;
        break;
      }
    }
    if (foundTask) break;
  }

  if (!foundTask) {
    return res.status(404).json({ success: false, message: `Task ${taskId} not found in project blueprint.` });
  }

  // Find corresponding milestone
  const milestones = Array.from(dbStore.milestones.values()).filter((m) => m.projectId === projectId);
  const affectedMilestone = milestones.find((m) => m.taskIds && m.taskIds.includes(taskId));

  // If milestone is already PAID, protect against reversion
  if (affectedMilestone && affectedMilestone.status === 'PAID' && newStatus !== 'done') {
    return res.status(409).json({
      success: false,
      message: `Cannot revert task '${foundTask.title}' to '${newStatus}': Associated milestone deliverable '${affectedMilestone.title}' has already been paid and settled via PayPal Sandbox.`,
      reason: `Associated milestone deliverable '${affectedMilestone.title}' is already PAID and settled. Tasks cannot be reverted away from done.`,
    });
  }

  if (newStatus) {
    foundTask.status = newStatus;
  }

  if (affectedMilestone) {
    // If task is submitted, milestone transitions to SUBMITTED if not already paid
    if (newStatus === 'submitted' && affectedMilestone.status !== 'PAID') {
      affectedMilestone.status = 'SUBMITTED';
    } else if (newStatus === 'done' && affectedMilestone.status !== 'PAID') {
      // Check if all tasks in milestone are done
      const allMsTasks = blueprint.workstreams.flatMap((ws) => ws.tasks).filter((t: any) => affectedMilestone.taskIds.includes(t.id));
      const allDone = allMsTasks.every((t: any) => t.status === 'done');
      if (allDone) {
        affectedMilestone.status = 'APPROVED_FOR_PAYMENT';
      }
    } else if (newStatus === 'in_progress' && affectedMilestone.status === 'CREATED') {
      affectedMilestone.status = 'IN_PROGRESS';
    }

    // Calculate milestone progress percent based on all its tasks
    const msTasks = blueprint.workstreams.flatMap((ws) => ws.tasks).filter((t: any) => affectedMilestone.taskIds.includes(t.id));
    if (affectedMilestone.status === 'PAID') {
      affectedMilestone.progressPercent = 100;
    } else if (msTasks.length > 0) {
      const totalScore = msTasks.reduce((sum: number, t: any) => {
        const score = t.status === 'done' ? 100 : t.status === 'submitted' ? 80 : t.status === 'in_progress' ? 50 : 0;
        return sum + score;
      }, 0);
      affectedMilestone.progressPercent = Math.round(totalScore / msTasks.length);
    }

    affectedMilestone.updatedAt = new Date().toISOString();
    dbStore.milestones.set(affectedMilestone.id, affectedMilestone);
    await dbStore.saveMilestone(affectedMilestone);
  }

  blueprint.updatedAt = new Date().toISOString();
  dbStore.blueprints.set(blueprint.id, blueprint);
  await dbStore.saveBlueprint(blueprint);

  dbStore.addAuditEvent({
    projectId,
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorRole: req.user!.role,
    eventType: 'TASK_UPDATED',
    entityType: 'task',
    entityId: taskId,
    summary: `Task [${taskId}] progress updated to "${newStatus}". Milestone "${affectedMilestone?.title || 'Deliverable'}" synced.`,
  });

  return res.json({
    success: true,
    data: {
      task: foundTask,
      milestone: affectedMilestone,
    },
    message: `Task progress updated to ${newStatus}. Milestone synchronized.`,
  });
});

// POST /api/projects/:projectId/clausora-ai (and legacy /copilot) - Interactive Project Clausora AI Agent
const handleClausoraAI = async (req: AuthRequest, res: Response, next: any) => {
  try {
    const { projectId } = req.params;
    const { question, history } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A question or prompt is required for Clausora AI.',
      });
    }

    const project = dbStore.projects.get(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project workspace not found.',
      });
    }

    const blueprint = Array.from(dbStore.blueprints.values()).find((b) => b.projectId === projectId);
    const milestones = Array.from(dbStore.milestones.values()).filter((m) => m.projectId === projectId);
    const evidence = Array.from(dbStore.evidence.values()).filter((e) =>
      milestones.some((m) => m.id === e.milestoneId)
    );
    const payments = Array.from(dbStore.payments.values()).filter((p) => p.projectId === projectId);

    const aiReply = await hfClient.runClausoraAI({
      project,
      blueprint,
      milestones,
      evidence,
      payments,
      history: history || [],
      userQuestion: question.trim(),
      userRole: req.user!.role,
      userName: req.user!.name,
    });

    return res.json({
      success: true,
      data: aiReply,
    });
  } catch (err) {
    next(err);
  }
};

router.post('/:projectId/clausora-ai', authMiddleware, handleClausoraAI);
router.post('/:projectId/copilot', authMiddleware, handleClausoraAI);

export default router;
