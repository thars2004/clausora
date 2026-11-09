import { ReaInspectionReport, WorkBlueprint } from '@clausora/shared';
import { hfClient } from '../ai/huggingface.client';

export class ReaService {
  /**
   * Transforms an REA (Reverse Engineer Anything) inspection report into a structured Work Blueprint
   */
  async transformReaReportToBlueprint(report: ReaInspectionReport): Promise<WorkBlueprint> {
    const summary = `Reverse-Engineered Application Specification based on REA inspection of ${report.targetName} (${report.targetType}).\nOverview: ${report.overview}`;
    const sourceText = `Target: ${report.targetName}\nType: ${report.targetType}\nObserved Behaviors:\n${report.observedBehaviors.map((b) => `- ${b}`).join('\n')}\nEndpoints / Functions Discovered:\n${report.discoveredEndpointsOrFunctions.map((e) => `- ${e}`).join('\n')}\nLimitations:\n${report.limitations.map((l) => `- ${l}`).join('\n')}`;

    const blueprint = await hfClient.generateWorkBlueprint({
      projectTitle: `${report.targetName} — Reconstructed Deliverables`,
      projectSummary: summary,
      sourceText,
    });

    // Add REA specific tags and recommended evidence
    blueprint.workstreams.forEach((ws) => {
      ws.tasks.forEach((t) => {
        if (!t.recommendedEvidence.includes('rea_trace')) {
          t.recommendedEvidence.push('rea_trace');
        }
      });
    });

    blueprint.assumptions.push(
      'Reverse engineering evidence derived from local REA inspection with authorized access.'
    );

    return blueprint;
  }

  /**
   * Sample REA Report for testing and judges
   */
  getSampleReaReport(): ReaInspectionReport {
    return {
      targetName: 'Acme SaaS Booking Engine & Client Portal',
      targetType: 'web',
      overview: 'Fullstack booking application with client onboarding, schedule selection, payment checkout trigger, and admin dashboard.',
      observedBehaviors: [
        'User registers and receives session token via HTTP Bearer header.',
        'Client creates booking session; front-end calls POST /api/bookings with serviceId and timestamp.',
        'Milestone approval calls POST /api/payments/milestones/:id/create-order.',
        'Client redirects to PayPal sandbox approval flow and returns with orderId token.',
        'Server captures PayPal order and marks booking status verified in database.'
      ],
      discoveredEndpointsOrFunctions: [
        'POST /api/auth/login',
        'GET /api/projects/:id',
        'POST /api/payments/milestones/:id/create-order',
        'POST /api/payments/:id/capture',
        'GET /api/audit-trail'
      ],
      limitations: [
        'REA dynamic tracer verified HTTP responses in sandbox; load testing above 50 concurrent requests was not inspected.',
        'Third-party external webhooks verified in sandbox environment only.'
      ],
      evidenceArtifacts: [
        {
          name: 'Network Trace Scenario 1: PayPal Checkout',
          kind: 'HAR / Network Log',
          details: 'Recorded 200 OK responses on order creation and capture endpoints.'
        },
        {
          name: 'DOM Snapshot: Verification Confirmation Screen',
          kind: 'DOM Tree Snapshot',
          details: 'Verified paid badge with transaction capture reference.'
        }
      ],
      generatedAt: new Date().toISOString(),
    };
  }
}

export const reaService = new ReaService();

