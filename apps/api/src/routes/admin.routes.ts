import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { dbStore } from '../database/store';
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

// GET /api/admin/users - master users directory
router.get('/users', authMiddleware, requireRole(['admin']), (req: AuthRequest, res: Response) => {
  const users = Array.from(dbStore.users.values()).map((u) => {
    const projectCount = Array.from(dbStore.projects.values()).filter(
      (p) => p.ownerId === u.id || p.providerIds.includes(u.id)
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

  return res.json({
    success: true,
    data: { users },
  });
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
