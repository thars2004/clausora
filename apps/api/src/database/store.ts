import {
  User,
  Project,
  SourceAsset,
  WorkBlueprint,
  Agreement,
  Milestone,
  EvidenceItem,
  AiReview,
  ScopeChangeRequest,
  PaymentRecord,
  AuditEvent,
  InAppNotification,
} from '@clausora/shared';

// High-speed resilient in-memory collections (backed by MongoDB if configured)
class ClausoraStore {
  users: Map<string, User & { passwordHash: string }> = new Map();
  projects: Map<string, Project & { ownerId: string; providerIds: string[]; sourceAssets: string[] }> = new Map();
  sourceAssets: Map<string, SourceAsset> = new Map();
  blueprints: Map<string, WorkBlueprint> = new Map();
  agreements: Map<string, Agreement> = new Map();
  milestones: Map<string, Milestone> = new Map();
  evidence: Map<string, EvidenceItem> = new Map();
  aiReviews: Map<string, AiReview> = new Map();
  scopeChangeRequests: Map<string, ScopeChangeRequest> = new Map();
  payments: Map<string, PaymentRecord> = new Map();
  auditEvents: AuditEvent[] = [];
  notifications: InAppNotification[] = [];

  // Audit logger helper
  addAuditEvent(event: Omit<AuditEvent, 'id' | 'createdAt'>): AuditEvent {
    const fullEvent: AuditEvent = {
      ...event,
      id: 'aud_' + Math.random().toString(36).substring(2, 10),
      createdAt: new Date().toISOString(),
    };
    this.auditEvents.unshift(fullEvent);
    return fullEvent;
  }

  // Notification helper
  addNotification(notif: Omit<InAppNotification, 'id' | 'createdAt' | 'read'>): InAppNotification {
    const fullNotification: InAppNotification = {
      ...notif,
      id: 'notif_' + Math.random().toString(36).substring(2, 10),
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.unshift(fullNotification);
    return fullNotification;
  }

  clearAll(): void {
    this.users.clear();
    this.projects.clear();
    this.sourceAssets.clear();
    this.blueprints.clear();
    this.agreements.clear();
    this.milestones.clear();
    this.evidence.clear();
    this.aiReviews.clear();
    this.scopeChangeRequests.clear();
    this.payments.clear();
    this.auditEvents = [];
    this.notifications = [];
  }
}

export const dbStore = new ClausoraStore();
