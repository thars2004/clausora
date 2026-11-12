import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { dbStore } from '../database/store';
import { isDbConnected } from '../database/connection';
import { UserModel, ProjectModel } from '../database/models';
import { AdminOverviewStats, AnalyticsData } from '@clausora/shared';

const router = Router();

// GET /api/admin/stats - master overview stats
router.get('/stats', authMiddleware, requireRole(['admin']), (req: AuthRequest, res: Response) => {
  const users = Array.from(dbStore.users.values());
  const clients = users.filter((u) => u.role === 'client');
  const providers = users.filter((u) => u.role === 'provider');
  const projects = Array.from(dbStore.projects.values());
  const milestones = Array.from(dbStore.milestones.values());
  const payments = Array.from(dbStore.payments.values());
  const scopeRequests = Array.from(dbStore.scopeChangeRequests.values());
  const aiReviews = Array.from(dbStore.aiReviews.values());

  const settledVolumeMinor = payments
    .filter((p) => p.status === 'captured')
    .reduce((acc, curr) => acc + curr.amountMinor, 0);

  const pendingVolumeMinor = milestones
    .filter((m) => m.status !== 'PAID')
    .reduce((acc, curr) => acc + curr.amountMinor, 0);

  const totalVolumeMinor = settledVolumeMinor + pendingVolumeMinor;

  const stats: AdminOverviewStats = {
    totalUsers: users.length,
    totalClients: clients.length,
    totalProviders: providers.length,
    totalProjects: projects.length,
    totalMilestones: milestones.length,
    totalVolumeMinor,
    settledVolumeMinor,
    pendingVolumeMinor,
    activeScopeDriftAlerts: scopeRequests.filter((r) => r.status === 'proposed').length,
    aiAnalysesPerformed: aiReviews.length + projects.length,
  };

  return res.json({
    success: true,
    data: { stats },
  });
});

// GET /api/admin/users - master users directory with live Atlas sync
router.get('/users', authMiddleware, requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  let sourceUsers: any[] = [];
  if (isDbConnected()) {
    try {
      sourceUsers = await UserModel.find().lean();
    } catch {
      sourceUsers = Array.from(dbStore.users.values());
    }
  } else {
    sourceUsers = Array.from(dbStore.users.values());
  }

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

  const users = sourceUsers.map((u: any) => {
    const projectCount = allProjects.filter(
      (p) => p.ownerId === u.id || (p.providerIds && Array.isArray(p.providerIds) && p.providerIds.includes(u.id))
    ).length;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      projectCount,
      createdAt: u.createdAt,
    };
  });

  // Newest First: Sort users descending by registration/creation date
  users.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return res.json({
    success: true,
    data: { users },
  });
});

// PUT /api/admin/users/:userId - update user details & role
router.put('/users/:userId', authMiddleware, requireRole(['admin']), async (req: AuthRequest, res: Response, next) => {
  try {
    const { userId } = req.params;
    const { name, email, role, password } = req.body;

    const existing: any = dbStore.users.get(userId) || (isDbConnected() ? await UserModel.findOne({ id: userId }).lean() : null);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'User not found in system.' });
    }

    if (role && !['client', 'provider', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Must be client, provider, or admin.' });
    }

    const updates: any = {};
    if (name) updates.name = name.trim();
    if (email) updates.email = email.toLowerCase().trim();
    if (role) updates.role = role;
    if (password && password.trim().length >= 6) {
      updates.passwordHash = await bcrypt.hash(password.trim(), 12);
    }

    const updatedUser = await dbStore.updateUser(userId, updates);

    dbStore.addAuditEvent({
      projectId: 'system',
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      eventType: 'USER_UPDATED',
      entityType: 'user',
      entityId: userId,
      summary: `Admin updated user account "${updates.name || existing.name}" (${userId}, role: ${updates.role || existing.role}).`,
    });

    return res.json({
      success: true,
      data: { user: updatedUser },
      message: `User "${updates.name || existing.name}" updated successfully.`,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/users/:userId - delete user account from live database
router.delete('/users/:userId', authMiddleware, requireRole(['admin']), async (req: AuthRequest, res: Response, next) => {
  try {
    const { userId } = req.params;

    if (req.user!.id === userId) {
      return res.status(400).json({
        success: false,
        message: 'Security constraint: You cannot delete your own active administrator account.',
      });
    }

    const existing: any = dbStore.users.get(userId) || (isDbConnected() ? await UserModel.findOne({ id: userId }).lean() : null);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'User not found in database.' });
    }

    await dbStore.deleteUser(userId);

    dbStore.addAuditEvent({
      projectId: 'system',
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorRole: req.user!.role,
      eventType: 'USER_DELETED',
      entityType: 'user',
      entityId: userId,
      summary: `Admin deleted user account "${existing.name}" (${existing.email}, ${userId}).`,
    });

    return res.json({
      success: true,
      message: `User "${existing.name}" (${existing.email}) deleted successfully.`,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/payments - master payments settlement ledger
router.get('/payments', authMiddleware, requireRole(['admin']), (req: AuthRequest, res: Response) => {
  const payments = Array.from(dbStore.payments.values()).map((p) => {
    const milestone = dbStore.milestones.get(p.milestoneId);
    const project = dbStore.projects.get(p.projectId);
    const payer = dbStore.users.get(p.payerId);
    return {
      ...p,
      milestoneTitle: milestone?.title || 'Milestone',
      projectTitle: project?.title || 'Project',
      payerName: payer?.name || 'Authorized Client',
      payerEmail: payer?.email || '',
    };
  });

  // Newest First: Sort payments descending by payment transaction date
  payments.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return res.json({
    success: true,
    data: { payments },
  });
});

// GET /api/admin/tasks - master task list across all blueprints
router.get('/tasks', authMiddleware, requireRole(['admin']), (req: AuthRequest, res: Response) => {
  const allTasks: any[] = [];
  dbStore.blueprints.forEach((bp) => {
    const project = dbStore.projects.get(bp.projectId);
    const client = project ? dbStore.users.get(project.ownerId) : null;
    bp.workstreams.forEach((ws) => {
      ws.tasks.forEach((t) => {
        allTasks.push({
          ...t,
          workstreamName: ws.name,
          projectId: bp.projectId,
          projectTitle: bp.projectTitle,
          clientName: client?.name || 'Acme Client',
          clientEmail: client?.email || '',
        });
      });
    });
  });

  return res.json({
    success: true,
    data: { tasks: allTasks },
  });
});

// GET /api/admin/analytics - full system analytics data
router.get('/analytics', authMiddleware, (req: AuthRequest, res: Response) => {
  const milestones = Array.from(dbStore.milestones.values());
  const payments = Array.from(dbStore.payments.values());
  const scopeRequests = Array.from(dbStore.scopeChangeRequests.values());
  const aiReviews = Array.from(dbStore.aiReviews.values());

  const milestoneDistribution = {
    paid: milestones.filter((m) => m.status === 'PAID').length,
    approvedForPayment: milestones.filter((m) => m.status === 'APPROVED_FOR_PAYMENT').length,
    awaitingDecision: milestones.filter((m) => m.status === 'AWAITING_CLIENT_DECISION').length,
    inProgress: milestones.filter((m) => m.status === 'IN_PROGRESS').length,
    created: milestones.filter((m) => m.status === 'CREATED').length,
  };

  const settledCents = payments
    .filter((p) => p.status === 'captured')
    .reduce((sum, curr) => sum + curr.amountMinor, 0);

  const pendingCents = milestones
    .filter((m) => m.status !== 'PAID')
    .reduce((sum, curr) => sum + curr.amountMinor, 0);

  const scopeDriftSummary = {
    likelyScopeChanges: scopeRequests.filter((r) => r.classification === 'likely_scope_change').length,
    clarifications: scopeRequests.filter((r) => r.classification === 'clarification').length,
    inScope: scopeRequests.filter((r) => r.classification === 'in_scope').length,
  };

  const avgConfidence = aiReviews.length > 0
    ? Number((aiReviews.reduce((sum, r) => {
        const critAvg = r.criterionResults.length > 0
          ? r.criterionResults.reduce((cSum, c) => cSum + c.confidence, 0) / r.criterionResults.length
          : 0.9;
        return sum + critAvg;
      }, 0) / aiReviews.length).toFixed(2))
    : 0.92;

  const limitationsCount = aiReviews.reduce((sum, r) => sum + r.limitations.length, 0);

  const analytics: AnalyticsData = {
    milestoneDistribution,
    financialSummary: {
      settledCents,
      pendingCents,
      currency: 'USD',
    },
    scopeDriftSummary,
    aiReviewMetrics: {
      avgConfidence,
      reviewsGenerated: aiReviews.length,
      limitationsCount,
    },
  };

  return res.json({
    success: true,
    data: { analytics },
  });
});

export default router;

