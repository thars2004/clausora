import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { dbStore } from '../database/store';

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

export default router;

