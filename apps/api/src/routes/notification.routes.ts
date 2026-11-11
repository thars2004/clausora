import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { dbStore } from '../database/store';
import { emailService } from '../services/email/email.service';

const router = Router();

// GET /api/notifications
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const userNotifs = dbStore.notifications
    .filter((n) => n.userId === userId || !n.userId)
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  return res.json({
    success: true,
    data: { notifications: userNotifs },
  });
});

// PATCH /api/notifications/:notificationId/read
router.patch('/:notificationId/read', authMiddleware, (req: AuthRequest, res: Response) => {
  const { notificationId } = req.params;
  const notif = dbStore.notifications.find((n) => n.id === notificationId);
  if (notif) {
    notif.read = true;
  }
  return res.json({
    success: true,
    message: 'Notification marked as read.',
  });
});

// GET /api/notifications/emails - Audit log of sent transactional emails
router.get('/emails', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  // Admins can see all transactional emails, regular users see emails sent to them
  const filterEmail = user.role === 'admin' ? undefined : user.email;
  const emails = dbStore.getEmailLogs(filterEmail);
  return res.json({
    success: true,
    data: { emails },
  });
});

// GET /api/notifications/email-status - Status of SMTP / email dispatch system
router.get('/email-status', authMiddleware, (_req: AuthRequest, res: Response) => {
  const status = emailService.getStatus();
  return res.json({
    success: true,
    data: { status },
  });
});

// POST /api/notifications/test-email - Trigger a live test email to any recipient
router.post('/test-email', authMiddleware, async (req: AuthRequest, res: Response, next) => {
  try {
    const toEmail = req.body?.to?.trim() || req.user?.email;
    if (!toEmail) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email address is required.',
      });
    }

    const result = await emailService.sendTestEmail(toEmail);
    return res.json({
      success: result.success,
      message: result.message,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

