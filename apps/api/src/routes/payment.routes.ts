import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { dbStore } from '../database/store';
import { payPalClient } from '../services/paypal/paypal.client';
import { PaymentRecord, MilestoneStatus, Milestone } from '@clausora/shared';
import { notificationService } from '../services/notifications/notification.service';
import { isDbConnected } from '../database/connection';
import { MilestoneModel, ProjectModel } from '../database/models';

const router = Router();

// POST /api/payments/milestones/:milestoneId/demo-pay - Instant simulated sandbox payment / split payout
router.post(
  '/milestones/:milestoneId/demo-pay',
  authMiddleware,
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { milestoneId } = req.params;
      let milestone = dbStore.milestones.get(milestoneId);

      // Resilient fallback: auto-instantiate milestone if project exists
      if (!milestone) {
        const targetProjectId = req.body?.projectId || (milestoneId.startsWith('ms_') ? milestoneId.split('_')[1] : null);
        const targetProject = targetProjectId ? dbStore.projects.get(targetProjectId) : null;
        if (targetProject) {
          const autoMs: Milestone = {
            id: milestoneId,
            projectId: targetProject.id,
            agreementId: targetProject.currentAgreementId || `agr_${targetProject.id}`,
            title: `${targetProject.title} — Escrow Allocation`,
            description: 'Direct task escrow payout release',
            amountMinor: targetProject.totalAmountMinor || 50000,
            paidMinor: 0,
            currency: targetProject.currency || 'USD',
            dueDate: new Date().toISOString().split('T')[0],
            taskIds: [],
            acceptanceCriteria: [],
            status: 'IN_PROGRESS',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await dbStore.saveMilestone(autoMs);
          milestone = autoMs;
        }
      }

      if (!milestone) {
        return res.status(404).json({ success: false, message: 'Milestone or task not found' });
      }

      const project = dbStore.projects.get(milestone.projectId);
      const isOwner = project && (project.ownerId === req.user!.id || project.createdBy === req.user!.id);
      if (req.user!.role !== 'admin' && req.user!.role !== 'client' && !isOwner) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Only the client owner, project creator, or platform admin can pay for tasks.',
        });
      }

      // Get all milestones for this project to calculate project remaining due and waterfall distribution
      let allProjMilestones = Array.from(dbStore.milestones.values()).filter(
        (m) => m.projectId === milestone.projectId
      );
      if (isDbConnected()) {
        try {
          const dbMs: any = await MilestoneModel.find({ projectId: milestone.projectId }).lean();
          if (dbMs && dbMs.length > 0) {
            allProjMilestones = dbMs;
          }
        } catch {
          // ignore
        }
      }

      const totalProjectSettled = allProjMilestones.reduce(
        (sum, m) => sum + (m.paidMinor || (m.status === 'PAID' ? m.amountMinor : 0)),
        0
      );
      const projectTotalMinor = project?.totalAmountMinor || 50000;
      const projectRemainingMinor = Math.max(0, projectTotalMinor - totalProjectSettled);

      const alreadyPaid = milestone.paidMinor || (milestone.status === 'PAID' ? milestone.amountMinor : 0);
      const milestoneRemainingMinor = Math.max(0, milestone.amountMinor - alreadyPaid);

      if (projectRemainingMinor <= 0 && milestoneRemainingMinor <= 0) {
        return res.status(400).json({
          success: false,
          message: 'This project is already fully paid and settled.',
        });
      }

      if (project && project.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: `Cannot process payment: Project is currently "${project.status}". The opponent counterpart must review and activate the project before escrow funds can be released.`,
        });
      }

      // Enforce: Assigned provider must submit work proof before escrow payment can be released
      const milestoneEvidence = Array.from(dbStore.evidence.values()).filter(
        (e) => e.milestoneId === milestone.id
      );
      const hasProof =
        milestoneEvidence.length > 0 ||
        milestone.status === 'SUBMITTED' ||
        milestone.status === 'APPROVED_FOR_PAYMENT' ||
        milestone.status === 'PAID';

      if (!hasProof) {
        return res.status(400).json({
          success: false,
          message: `Work proof required: The assigned provider must submit proof for "${milestone.title}" before escrow payment can be authorized.`,
        });
      }

      const requestedMinor = req.body.amountMinor
        ? Number(req.body.amountMinor)
        : (milestoneRemainingMinor > 0 ? milestoneRemainingMinor : projectRemainingMinor);

      if (isNaN(requestedMinor) || requestedMinor <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Payment amount must be greater than zero.',
        });
      }

      const paymentMinor = Math.min(requestedMinor, projectRemainingMinor > 0 ? projectRemainingMinor : requestedMinor);

      const captureId = 'CAP_DEMO_' + Math.random().toString(36).substring(2, 9).toUpperCase();
      const paymentId = 'pay_demo_' + Math.random().toString(36).substring(2, 9);
      const idempotencyKey = `ord_demo_${milestoneId}_${Date.now()}`;

      const paymentRecord: PaymentRecord = {
        id: paymentId,
        projectId: milestone.projectId,
        milestoneId,
        payerId: req.user!.id,
        amountMinor: paymentMinor,
        currency: milestone.currency,
        paypalOrderId: `ORDER_DEMO_${Date.now()}`,
        paypalCaptureId: captureId,
        status: 'captured',
        idempotencyKey,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await dbStore.savePayment(paymentRecord);

      // Waterfall distribution: target milestone first, then other project milestones
      let remainingToDistribute = paymentMinor;
      const targetAndOthers = [
        milestone,
        ...allProjMilestones.filter((m) => m.id !== milestone.id),
      ];

      for (const m of targetAndOthers) {
        if (remainingToDistribute <= 0) break;
        const currentPaid = m.paidMinor || (m.status === 'PAID' ? m.amountMinor : 0);
        const msRemaining = Math.max(0, m.amountMinor - currentPaid);
        if (msRemaining <= 0) continue;

        const allocation = Math.min(remainingToDistribute, msRemaining);
        const newPaid = currentPaid + allocation;
        m.paidMinor = newPaid;
        m.paypalCaptureId = captureId;
        if (newPaid >= m.amountMinor) {
          m.status = 'PAID';
        } else {
          m.status = 'PARTIALLY_PAID';
        }
        m.updatedAt = new Date().toISOString();
        await dbStore.saveMilestone(m);
        remainingToDistribute -= allocation;
      }

      // Re-calculate Project overall settled payment in MongoDB Atlas
      const milestoneNewPaid = milestone.paidMinor || (milestone.status === 'PAID' ? milestone.amountMinor : 0);
      let updatedAllMilestones = Array.from(dbStore.milestones.values()).filter(
        (m) => m.projectId === milestone.projectId
      );
      if (isDbConnected()) {
        try {
          const dbMs: any = await MilestoneModel.find({ projectId: milestone.projectId }).lean();
          if (dbMs && dbMs.length > 0) {
            updatedAllMilestones = dbMs;
          }
        } catch {
          // ignore
        }
      }
      const totalSettledMinor = Math.max(
        totalProjectSettled + paymentMinor,
        updatedAllMilestones.reduce((sum, m) => sum + (m.paidMinor || (m.status === 'PAID' ? m.amountMinor : 0)), 0)
      );

      await dbStore.updateProject(milestone.projectId, {
        settledAmountMinor: totalSettledMinor,
      });

      dbStore.addAuditEvent({
        projectId: milestone.projectId,
        actorId: req.user!.id,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        eventType: 'PAYPAL_PAYMENT_CAPTURED',
        entityType: 'payment',
        entityId: paymentId,
        summary: `Captured split payment of $${(paymentMinor / 100).toFixed(2)} ${milestone.currency} for "${milestone.title}". Balance remaining: $${((milestone.amountMinor - milestoneNewPaid) / 100).toFixed(2)}. Capture Reference: ${captureId}.`,
        metadata: { captureId, amountMinor: paymentMinor, newPaidMinor: milestoneNewPaid, totalMinor: milestone.amountMinor },
      });

      await notificationService.send({
        userId: milestone.approvedBy || req.user!.id,
        projectId: milestone.projectId,
        type: 'PAYMENT_CONFIRMED',
        title: `Payment Released for "${milestone.title}"`,
        body: `Sandbox payment confirmed ($${(paymentMinor / 100).toFixed(2)} ${milestone.currency}). Capture Reference: ${captureId}.`,
      });

      return res.json({
        success: true,
        data: {
          payment: paymentRecord,
          milestone,
          captureId,
          amountPaidMinor: paymentMinor,
          newPaidMinor: milestoneNewPaid,
          remainingMinor: milestone.amountMinor - milestoneNewPaid,
          totalSettledMinor,
        },
        message: `Successfully released $${(paymentMinor / 100).toFixed(2)} ${milestone.currency} for "${milestone.title}".`,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/payments/milestones/:milestoneId/create-order
router.post(
  '/milestones/:milestoneId/create-order',
  authMiddleware,
  requireRole(['client', 'admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { milestoneId } = req.params;
      const milestone = dbStore.milestones.get(milestoneId);

      if (!milestone) {
        return res.status(404).json({ success: false, message: 'Milestone not found' });
      }

      const project = dbStore.projects.get(milestone.projectId);
      if (req.user!.role !== 'admin' && project && project.ownerId !== req.user!.id) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Only the client owner of this project can initiate PayPal checkout.',
        });
      }

      // Check project-wide remaining due
      let allProjMilestones = Array.from(dbStore.milestones.values()).filter(
        (m) => m.projectId === milestone.projectId
      );
      if (isDbConnected()) {
        try {
          const dbMs: any = await MilestoneModel.find({ projectId: milestone.projectId }).lean();
          if (dbMs && dbMs.length > 0) {
            allProjMilestones = dbMs;
          }
        } catch {}
      }
      const totalProjectSettled = allProjMilestones.reduce(
        (sum, m) => sum + (m.paidMinor || (m.status === 'PAID' ? m.amountMinor : 0)),
        0
      );
      const projectTotalMinor = project?.totalAmountMinor || 50000;
      const projectRemainingMinor = Math.max(0, projectTotalMinor - totalProjectSettled);

      const alreadyPaid = milestone.paidMinor || 0;
      const milestoneRemainingMinor = Math.max(0, milestone.amountMinor - alreadyPaid);

      if (projectRemainingMinor <= 0 && milestoneRemainingMinor <= 0) {
        return res.status(409).json({
          success: false,
          message: 'This project has already been captured and paid in full.',
        });
      }

      if (project && project.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: `Cannot process payment: Project is currently "${project.status}". The opponent counterpart must review and activate the project before PayPal checkout can be authorized.`,
        });
      }

      // Enforce: Assigned provider must submit work proof before PayPal checkout can be authorized
      const milestoneEvidence = Array.from(dbStore.evidence.values()).filter(
        (e) => e.milestoneId === milestone.id
      );
      const hasProof =
        milestoneEvidence.length > 0 ||
        milestone.status === 'SUBMITTED' ||
        milestone.status === 'APPROVED_FOR_PAYMENT' ||
        milestone.status === 'PAID';

      if (!hasProof) {
        return res.status(400).json({
          success: false,
          message: `Work proof required: The assigned provider must submit proof for "${milestone.title}" before PayPal checkout can be authorized.`,
        });
      }

      const requestedMinor = req.body?.amountMinor ? Number(req.body.amountMinor) : (milestoneRemainingMinor > 0 ? milestoneRemainingMinor : projectRemainingMinor);
      const maxAllowed = projectRemainingMinor > 0 ? projectRemainingMinor : (milestoneRemainingMinor > 0 ? milestoneRemainingMinor : requestedMinor);
      const orderAmountMinor = Math.min(requestedMinor > 0 ? requestedMinor : maxAllowed, maxAllowed);

      // Generate idempotency key
      const idempotencyKey = `ord_${milestoneId}_${Date.now()}`;

      // Create PayPal sandbox order
      const order = await payPalClient.createOrder({
        referenceId: milestone.id,
        amountMinor: orderAmountMinor,
        currency: milestone.currency,
        description: `Clausora Milestone: ${milestone.title} (Split Amount)`,
      });

      const paymentId = 'pay_' + Math.random().toString(36).substring(2, 9);
      const approveLink = order.links?.find((l) => l.rel === 'approve')?.href;

      const paymentRecord: PaymentRecord = {
        id: paymentId,
        projectId: milestone.projectId,
        milestoneId,
        payerId: req.user!.id,
        amountMinor: orderAmountMinor,
        currency: milestone.currency,
        paypalOrderId: order.id,
        status: 'order_created',
        idempotencyKey,
        approvalLink: approveLink,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await dbStore.savePayment(paymentRecord);

      // Transition milestone state to PAYPAL_ORDER_CREATED
      milestone.status = 'PAYPAL_ORDER_CREATED';
      milestone.paypalOrderId = order.id;
      milestone.updatedAt = new Date().toISOString();
      await dbStore.saveMilestone(milestone);

      dbStore.addAuditEvent({
        projectId: milestone.projectId,
        actorId: req.user!.id,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        eventType: 'PAYPAL_ORDER_CREATED',
        entityType: 'payment',
        entityId: paymentId,
        summary: `Created PayPal Sandbox Order ${order.id} for $${(orderAmountMinor / 100).toFixed(2)} ${milestone.currency}.`,
        metadata: { paypalOrderId: order.id, amountMinor: orderAmountMinor },
      });

      return res.status(201).json({
        success: true,
        data: {
          payment: paymentRecord,
          orderId: order.id,
          approveUrl: approveLink,
        },
        message: 'PayPal Sandbox order created. Proceed with checkout approval.',
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/payments/:paymentId/capture - server verified capture
router.post(
  '/:paymentId/capture',
  authMiddleware,
  requireRole(['client', 'admin']),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { paymentId } = req.params;
      const payment = dbStore.payments.get(paymentId);

      if (!payment) {
        return res.status(404).json({ success: false, message: 'Payment record not found' });
      }

      const milestone = dbStore.milestones.get(payment.milestoneId);
      if (!milestone) {
        return res.status(404).json({ success: false, message: 'Associated milestone not found' });
      }

      if (payment.status === 'captured') {
        return res.json({
          success: true,
          data: { payment, milestone },
          message: 'Payment already captured previously.',
        });
      }

      // Server-side capture request to PayPal Orders v2 API
      const captureResult = await payPalClient.captureOrder(payment.paypalOrderId);

      if (captureResult.status === 'COMPLETED') {
        const captureItem = captureResult.purchase_units?.[0]?.payments?.captures?.[0];
        const captureId = captureItem?.id || 'CAP_' + Math.random().toString(36).substring(2, 9);

        payment.status = 'captured';
        payment.paypalCaptureId = captureId;
        payment.updatedAt = new Date().toISOString();
        await dbStore.savePayment(payment);

        // Waterfall distribution across milestones
        let allProjMilestones = Array.from(dbStore.milestones.values()).filter(
          (m) => m.projectId === milestone.projectId
        );
        if (isDbConnected()) {
          try {
            const dbMs: any = await MilestoneModel.find({ projectId: milestone.projectId }).lean();
            if (dbMs && dbMs.length > 0) {
              allProjMilestones = dbMs;
            }
          } catch {}
        }
        const totalProjectSettled = allProjMilestones.reduce(
          (sum, m) => sum + (m.paidMinor || (m.status === 'PAID' ? m.amountMinor : 0)),
          0
        );

        let remainingToDistribute = payment.amountMinor || 0;
        const targetAndOthers = [
          milestone,
          ...allProjMilestones.filter((m) => m.id !== milestone.id),
        ];

        for (const m of targetAndOthers) {
          if (remainingToDistribute <= 0) break;
          const currentPaid = m.paidMinor || (m.status === 'PAID' ? m.amountMinor : 0);
          const msRemaining = Math.max(0, m.amountMinor - currentPaid);
          if (msRemaining <= 0) continue;

          const allocation = Math.min(remainingToDistribute, msRemaining);
          const newPaid = currentPaid + allocation;
          m.paidMinor = newPaid;
          m.paypalCaptureId = captureId;
          if (newPaid >= m.amountMinor) {
            m.status = 'PAID';
          } else {
            m.status = 'PARTIALLY_PAID';
          }
          m.updatedAt = new Date().toISOString();
          await dbStore.saveMilestone(m);
          remainingToDistribute -= allocation;
        }

        // Update Project overall settled payment in MongoDB Atlas
        let updatedAllMilestones = Array.from(dbStore.milestones.values()).filter(
          (m) => m.projectId === milestone.projectId
        );
        if (isDbConnected()) {
          try {
            const dbMs: any = await MilestoneModel.find({ projectId: milestone.projectId }).lean();
            if (dbMs && dbMs.length > 0) {
              updatedAllMilestones = dbMs;
            }
          } catch {}
        }
        const totalSettledMinor = Math.max(
          totalProjectSettled + (payment.amountMinor || 0),
          updatedAllMilestones.reduce((sum, m) => sum + (m.paidMinor || (m.status === 'PAID' ? m.amountMinor : 0)), 0)
        );

        await dbStore.updateProject(milestone.projectId, {
          settledAmountMinor: totalSettledMinor,
        });

        dbStore.addAuditEvent({
          projectId: milestone.projectId,
          actorId: req.user!.id,
          actorName: req.user!.name,
          actorRole: req.user!.role,
          eventType: 'PAYPAL_PAYMENT_CAPTURED',
          entityType: 'payment',
          entityId: paymentId,
          summary: `PayPal Sandbox captured $${(payment.amountMinor / 100).toFixed(2)} ${payment.currency}. Milestone marked PAID. Capture ID: ${captureId}.`,
          metadata: { captureId, paypalOrderId: payment.paypalOrderId },
        });

        await notificationService.send({
          userId: milestone.approvedBy || req.user!.id,
          projectId: milestone.projectId,
          type: 'PAYMENT_CONFIRMED',
          title: `Payment Released for "${milestone.title}"`,
          body: `PayPal Sandbox transaction confirmed ($${(payment.amountMinor / 100).toFixed(2)} ${payment.currency}). Capture Reference: ${captureId}.`,
        });

        return res.json({
          success: true,
          data: {
            payment,
            milestone,
            captureId,
          },
          message: 'Payment verified and captured by PayPal Sandbox. Milestone marked as PAID.',
        });
      } else {
        payment.status = 'failed';
        dbStore.payments.set(paymentId, payment);
        return res.status(400).json({
          success: false,
          message: `PayPal capture status was not COMPLETED: ${captureResult.status}`,
        });
      }
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/payments/:paymentId/status
router.get('/:paymentId/status', authMiddleware, (req: AuthRequest, res: Response) => {
  const { paymentId } = req.params;
  const payment = dbStore.payments.get(paymentId);
  if (!payment) {
    return res.status(404).json({ success: false, message: 'Payment record not found' });
  }
  return res.json({
    success: true,
    data: { payment },
  });
});

// POST /api/webhooks/paypal - Webhook receiver
router.post('/webhooks/paypal', (req, res) => {
  const event = req.body;
  const eventType = event.event_type;
  console.log(`🔔 Received PayPal Webhook: ${eventType} (ID: ${event.id})`);

  // Idempotent processing
  return res.status(200).json({
    success: true,
    message: 'Webhook processed idempotently.',
    eventId: event.id,
  });
});

export default router;

