import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { hfClient } from '../services/ai/huggingface.client';

const router = Router();

// GET /api/ai/status
router.get('/status', (req, res) => {
  return res.json({
    success: true,
    data: {
      provider: 'Hugging Face Inference',
      model: hfClient.getModelName(),
      isConfigured: hfClient.isConfigured(),
      primaryTask: 'Multimodal Vision-Language (Qwen2.5-VL-7B-Instruct)',
    },
  });
});

// POST /api/ai/analyse-project
router.post('/analyse-project', authMiddleware, async (req: AuthRequest, res: Response, next) => {
  try {
    const { title, summary, briefText } = req.body;
    const blueprint = await hfClient.generateWorkBlueprint({
      projectTitle: title,
      projectSummary: summary,
      sourceText: briefText,
    });
    return res.json({
      success: true,
      data: { blueprint },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/analyse-evidence
router.post('/analyse-evidence', authMiddleware, async (req: AuthRequest, res: Response, next) => {
  try {
    const { milestoneId, milestoneTitle, acceptanceCriteria, evidenceItems } = req.body;
    const result = await hfClient.analyzeEvidence({
      milestoneId,
      milestoneTitle,
      acceptanceCriteria,
      evidenceItems,
    });
    return res.json({
      success: true,
      data: { result },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/detect-scope-drift
router.post('/detect-scope-drift', authMiddleware, async (req: AuthRequest, res: Response, next) => {
  try {
    const { agreementTitle, existingCriteria, newRequestText } = req.body;
    const result = await hfClient.detectScopeDrift({
      agreementTitle,
      existingCriteria,
      newRequestText,
    });
    return res.json({
      success: true,
      data: { result },
    });
  } catch (err) {
    next(err);
  }
});

export default router;

