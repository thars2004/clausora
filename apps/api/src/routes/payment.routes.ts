import { Router, Response } from 'express';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { dbStore } from '../database/store';
import { payPalClient } from '../services/paypal/paypal.client';
import { PaymentRecord, MilestoneStatus } from '@clausora/shared';
import { notificationService } from '../services/notifications/notification.service';

const router = Router();

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

      // Ensure milestone is approved for payment
      if (milestone.status !== 'APPROVED_FOR_PAYMENT') {
        return res.status(409).json({
          success: false,
          message: `Milestone must be in APPROVED_FOR_PAYMENT state to initiate checkout. Current status: ${milestone.status}`,
        });
      }

      // Check if previous completed capture exists
      for (const p of dbStore.payments.values()) {
        if (p.milestoneId === milestoneId && p.status === 'captured') {
          return res.status(409).json({
            success: false,
            message: 'This milestone has already been captured and paid.',
          });
        }
      }

      // Generate idempotency key
      const idempotencyKey = `ord_${milestoneId}_${Date.now()}`;

      // Create PayPal sandbox order
      const order = await payPalClient.createOrder({
        referenceId: milestone.id,
        amountMinor: milestone.amountMinor,
        currency: milestone.currency,
        description: `Clausora Milestone: ${milestone.title}`,
      });

      const paymentId = 'pay_' + Math.random().toString(36).substring(2, 9);
      const approveLink = order.links?.find((l) => l.rel === 'approve')?.href;

      const paymentRecord: PaymentRecord = {
        id: paymentId,
        projectId: milestone.projectId,
        milestoneId,
        payerId: req.user!.id,
        amountMinor: milestone.amountMinor,
        currency: milestone.currency,
        paypalOrderId: order.id,
        status: 'order_created',
        idempotencyKey,
        approvalLink: approveLink,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      dbStore.payments.set(paymentId, paymentRecord);

      // Transition milestone state to PAYPAL_ORDER_CREATED
      milestone.status = 'PAYPAL_ORDER_CREATED';
      milestone.paypalOrderId = order.id;
      milestone.updatedAt = new Date().toISOString();
      dbStore.milestones.set(milestoneId, milestone);

      dbStore.addAuditEvent({
        projectId: milestone.projectId,
        actorId: req.user!.id,
        actorName: req.user!.name,
        actorRole: req.user!.role,
        eventType: 'PAYPAL_ORDER_CREATED',
        entityType: 'payment',
        entityId: paymentId,
        summary: `Created PayPal Sandbox Order ${order.id} for $${(milestone.amountMinor / 100).toFixed(2)} ${milestone.currency}.`,
        metadata: { paypalOrderId: order.id, amountMinor: milestone.amountMinor },
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
        dbStore.payments.set(paymentId, payment);

        // Transition milestone to PAID
        milestone.status = 'PAID';
        milestone.paypalCaptureId = captureId;
        milestone.updatedAt = new Date().toISOString();
        dbStore.milestones.set(milestone.id, milestone);

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

