import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { dbStore } from '../database/store';
import { reaService } from '../services/rea/rea.service';
import { ReaReportSchema, Project, ProjectStatus } from '@clausora/shared';

const router = Router();

// GET /api/rea/sample - get sample REA inspection report
router.get('/sample', (req, res) => {
  const sample = reaService.getSampleReaReport();
  return res.json({
    success: true,
    data: { report: sample },
  });
});

// POST /api/rea/import-report - ingest REA reverse engineered report
router.post('/import-report', authMiddleware, async (req: AuthRequest, res: Response, next) => {
  try {
    const parsed = ReaReportSchema.parse(req.body);

    const projectId = 'proj_rea_' + Math.random().toString(36).substring(2, 8);
    const userId = req.user!.id;
    const userRole = req.user!.role;

    let finalOwnerId = userId;
    let finalProviderIds: string[] = [];
    if (userRole === 'client') {
      finalOwnerId = userId;
      if (req.body.providerId) finalProviderIds.push(req.body.providerId);
    } else if (userRole === 'provider') {
      finalOwnerId = req.body.clientId || userId;
      finalProviderIds.push(userId);
    } else {
      finalOwnerId = req.body.clientId || userId;
      if (req.body.providerId) finalProviderIds.push(req.body.providerId);
    }

    // Create project
    const project: Project = {
      id: projectId,
      title: `${parsed.targetName} (REA Reconstructed)`,
      description: parsed.overview,
      ownerId: finalOwnerId,
      providerIds: finalProviderIds,
      status: 'analysing',
      sourceAssets: [],
      currentAgreementId: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await dbStore.saveProject(project);

    // Save REA report as source asset
    const assetId = 'asset_rea_' + Math.random().toString(36).substring(2, 8);
    dbStore.sourceAssets.set(assetId, {
      id: assetId,
      projectId,
      uploadedBy: userId,
      type: 'rea_report',
      name: `REA_Inspection_${parsed.targetName}.json`,
      urlOrKey: 'memory/rea_report',
      mimeType: 'application/json',
      sizeBytes: JSON.stringify(parsed).length,
      extractedText: JSON.stringify(parsed, null, 2),
      createdAt: new Date().toISOString(),
    });
    project.sourceAssets.push(assetId);

    // Transform REA report into Work Blueprint
    const blueprint = await reaService.transformReaReportToBlueprint(parsed);
    blueprint.projectId = projectId;
    await dbStore.saveBlueprint(blueprint);

    project.status = 'awaiting_approval';
    await dbStore.saveProject(project);

    dbStore.addAuditEvent({
      projectId,
      actorId: userId,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      eventType: 'REA_REPORT_IMPORTED',
      entityType: 'project',
      entityId: projectId,
      summary: `Imported REA Reverse-Engineering Report for "${parsed.targetName}". Generated Work Blueprint with runtime traces mapped to deliverables.`,
    });

    return res.status(201).json({
      success: true,
      data: {
        project,
        blueprint,
      },
      message: 'REA inspection report successfully synthesized into Work Blueprint.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
