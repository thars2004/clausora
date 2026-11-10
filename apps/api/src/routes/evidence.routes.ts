import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { dbStore } from '../database/store';
import { storageService } from '../services/storage/storage.service';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });
const router = Router();

// POST /api/milestones/:milestoneId/evidence - submit proof
router.post('/milestones/:milestoneId/evidence', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response, next) => {
  try {
    const { milestoneId } = req.params;
    const milestone = dbStore.milestones.get(milestoneId);
    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found' });
    }

    const { type, title, description, urlOrContent } = req.body;
    let finalUrlOrContent = urlOrContent || '';
    let sha256 = '';

    if (req.file) {
      const saved = storageService.saveFile(req.file);
      finalUrlOrContent = saved.storageKey;
      sha256 = saved.sha256;
    }

    const evidenceId = 'evi_' + Math.random().toString(36).substring(2, 9);
    const item = {
      id: evidenceId,
      projectId: milestone.projectId,
      milestoneId,
      uploadedBy: req.user!.id,
      type: type || (req.file ? (req.file.mimetype.startsWith('image/') ? 'image' : 'document') : 'url'),
      title: title || (req.file ? req.file.originalname : 'Work Evidence Item'),
      urlOrContent: finalUrlOrContent,
      description: description || '',
      sha256,
      createdAt: new Date().toISOString(),
    };

    await dbStore.saveEvidence(item);

    // Transition milestone status to SUBMITTED if currently CREATED or IN_PROGRESS
    if (milestone.status === 'CREATED' || milestone.status === 'IN_PROGRESS') {
      milestone.status = 'SUBMITTED';
      milestone.updatedAt = new Date().toISOString();
      await dbStore.saveMilestone(milestone);
    }

    dbStore.addAuditEvent({
      projectId: milestone.projectId,
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      eventType: 'EVIDENCE_SUBMITTED',
      entityType: 'evidence',
      entityId: evidenceId,
      summary: `Submitted evidence "${item.title}" (${item.type}) for milestone "${milestone.title}".`,
    });

    return res.status(201).json({
      success: true,
      data: { evidence: item },
      message: 'Evidence submitted successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/milestones/:milestoneId/evidence
router.get('/milestones/:milestoneId/evidence', authMiddleware, (req: AuthRequest, res: Response) => {
  const { milestoneId } = req.params;
  const items = Array.from(dbStore.evidence.values()).filter((e) => e.milestoneId === milestoneId);
  return res.json({
    success: true,
    data: { evidence: items },
  });
});

// GET /api/milestones/:milestoneId/review
router.get('/milestones/:milestoneId/review', authMiddleware, (req: AuthRequest, res: Response) => {
  const { milestoneId } = req.params;
  const reviews = Array.from(dbStore.aiReviews.values()).filter((r) => r.milestoneId === milestoneId);
  const latestReview = reviews[reviews.length - 1] || null;

  return res.json({
    success: true,
    data: { review: latestReview },
  });
});

// GET /api/projects/:projectId/evidence - all evidence for a project
router.get('/projects/:projectId/evidence', authMiddleware, (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const items = Array.from(dbStore.evidence.values()).filter((e) => e.projectId === projectId);
  return res.json({
    success: true,
    data: { evidence: items },
  });
});

export default router;

