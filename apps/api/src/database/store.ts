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
  PasswordResetOtp,
  EmailLog,
} from '@clausora/shared';
import { isDbConnected } from './connection';
import {
  UserModel,
  ProjectModel,
  MilestoneModel,
  AgreementModel,
  WorkBlueprintModel,
  EvidenceModel,
  AiReviewModel,
  ScopeChangeRequestModel,
  PaymentModel,
  AuditEventModel,
  NotificationModel,
  PasswordResetOtpModel,
  EmailLogModel,
} from './models';

class ClausoraLiveStore {
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
  otps: Map<string, PasswordResetOtp> = new Map();
  emailLogs: EmailLog[] = [];

  /**
   * Initializes store by loading all live data from MongoDB Atlas
   */
  async syncFromLiveDatabase(): Promise<void> {
    if (!isDbConnected()) return;

    try {
      console.log('🔄 Syncing live collections from MongoDB Atlas...');

      const [
        liveUsers,
        liveProjects,
        liveMilestones,
        liveAgreements,
        liveBlueprints,
        liveEvidence,
        liveReviews,
        liveScope,
        livePayments,
        liveAudit,
        liveNotifs,
        liveOtps,
        liveEmailLogs,
      ] = await Promise.all([
        UserModel.find().lean(),
        ProjectModel.find().lean(),
        MilestoneModel.find().lean(),
        AgreementModel.find().lean(),
        WorkBlueprintModel.find().lean(),
        EvidenceModel.find().lean(),
        AiReviewModel.find().lean(),
        ScopeChangeRequestModel.find().lean(),
        PaymentModel.find().lean(),
        AuditEventModel.find().sort({ createdAt: -1 }).limit(100).lean(),
        NotificationModel.find().sort({ createdAt: -1 }).limit(50).lean(),
        PasswordResetOtpModel.find({ used: false }).lean(),
        EmailLogModel.find().sort({ createdAt: -1 }).limit(100).lean(),
      ]);

      liveUsers.forEach((u: any) => this.users.set(u.id, u));
      liveProjects.forEach((p: any) => this.projects.set(p.id, p));
      liveMilestones.forEach((m: any) => this.milestones.set(m.id, m));
      liveAgreements.forEach((a: any) => this.agreements.set(a.id, a));
      liveBlueprints.forEach((b: any) => this.blueprints.set(b.id, b));
      liveEvidence.forEach((e: any) => this.evidence.set(e.id, e));
      liveReviews.forEach((r: any) => this.aiReviews.set(r.id, r));
      liveScope.forEach((s: any) => this.scopeChangeRequests.set(s.id, s));
      livePayments.forEach((p: any) => this.payments.set(p.id, p));
      this.auditEvents = liveAudit as any[];
      this.notifications = liveNotifs as any[];
      (liveOtps || []).forEach((o: any) => this.otps.set(o.email.toLowerCase(), o));
      this.emailLogs = (liveEmailLogs || []) as any[];

      console.log(`✅ Synced with MongoDB Atlas: ${this.users.size} users, ${this.projects.size} projects, ${this.milestones.size} milestones.`);
    } catch (err: any) {
      console.warn('⚠️ Error during initial Atlas sync:', err.message);
    }
  }

  // --- Users Persistence ---
  findUserById(userId: string): (User & { passwordHash?: string }) | undefined {
    return this.users.get(userId);
  }

  findUserByEmail(email: string): (User & { passwordHash?: string }) | undefined {
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase()) return u;
    }
    return undefined;
  }

  async saveUser(user: User & { passwordHash: string }): Promise<void> {
    this.users.set(user.id, user);
    if (isDbConnected()) {
      try {
        await UserModel.findOneAndUpdate({ id: user.id }, user, { upsert: true, new: true });
        console.log(`✅ [MongoDB Atlas] User saved: ${user.name} (${user.email}, ${user.role})`);
      } catch (err: any) {
        console.warn('⚠️ Atlas UserModel save error:', err.message);
      }
    }
  }

  async updateUser(userId: string, data: Partial<User & { passwordHash?: string }>): Promise<User | null> {
    const existing = this.users.get(userId);
    const updated = {
      ...(existing || {}),
      ...data,
      id: userId,
    } as User & { passwordHash: string };

    this.users.set(userId, updated);

    if (isDbConnected()) {
      try {
        await UserModel.findOneAndUpdate({ id: userId }, { $set: data }, { new: true, upsert: true });
        console.log(`✅ [MongoDB Atlas] User updated: ${userId} (${updated.email})`);
      } catch (err: any) {
        console.warn('⚠️ Atlas UserModel update error:', err.message);
      }
    }
    return updated;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const existed = this.users.delete(userId);
    if (isDbConnected()) {
      try {
        // Soft-delete user in MongoDB Atlas so DB details, audit trails, and references are preserved
        await UserModel.findOneAndUpdate(
          { id: userId },
          { $set: { isDeleted: true, deletedAt: new Date().toISOString() } },
          { new: true }
        );
        console.log(`✅ [MongoDB Atlas] User soft-deleted (DB details preserved): ${userId}`);
      } catch (err: any) {
        console.warn('⚠️ Atlas UserModel delete error:', err.message);
      }
    }
    return existed;
  }

  // --- Projects Persistence ---
  async saveProject(project: Project & { ownerId: string; providerIds: string[]; sourceAssets: string[]; createdBy?: string; creatorRole?: string; acceptedBy?: string; acceptedAt?: string }): Promise<void> {
    this.projects.set(project.id, project);
    if (isDbConnected()) {
      try {
        await ProjectModel.findOneAndUpdate({ id: project.id }, project, { upsert: true, new: true });
        console.log(`✅ [MongoDB Atlas] Project saved: ${project.title} (${project.id})`);
      } catch (err: any) {
        console.warn('⚠️ Atlas ProjectModel save error:', err.message);
      }
    }
  }

  async updateProject(projectId: string, data: Partial<any>): Promise<any> {
    const existing = this.projects.get(projectId);
    const updated = {
      ...(existing || {}),
      ...data,
      id: projectId,
      updatedAt: new Date().toISOString(),
    };
    this.projects.set(projectId, updated as any);
    if (isDbConnected()) {
      try {
        await ProjectModel.findOneAndUpdate({ id: projectId }, { $set: updated }, { new: true, upsert: true });
        console.log(`✅ [MongoDB Atlas] Project updated: ${projectId}`);
      } catch (err: any) {
        console.warn('⚠️ Atlas ProjectModel update error:', err.message);
      }
    }
    return updated;
  }

  async deleteProject(projectId: string): Promise<boolean> {
    const existed = this.projects.delete(projectId);
    if (isDbConnected()) {
      try {
        // Soft-delete project to preserve DB details, audit logs, and agreement history
        await ProjectModel.findOneAndUpdate(
          { id: projectId },
          { $set: { isDeleted: true, deletedAt: new Date().toISOString() } },
          { new: true }
        );
        console.log(`✅ [MongoDB Atlas] Project soft-deleted (DB details preserved): ${projectId}`);
      } catch (err: any) {
        console.warn('⚠️ Atlas ProjectModel soft-delete error:', err.message);
      }
    }
    return existed;
  }

  // --- Milestones Persistence ---
  async saveMilestone(milestone: Milestone): Promise<void> {
    this.milestones.set(milestone.id, milestone);
    if (isDbConnected()) {
      try {
        await MilestoneModel.findOneAndUpdate({ id: milestone.id }, milestone, { upsert: true, new: true });
        console.log(`✅ [MongoDB Atlas] Milestone saved: ${milestone.title} (${milestone.id})`);
      } catch (err: any) {
        console.warn('⚠️ Atlas MilestoneModel save error:', err.message);
      }
    }
  }

  // --- Agreements Persistence ---
  async saveAgreement(agreement: Agreement): Promise<void> {
    this.agreements.set(agreement.id, agreement);
    if (isDbConnected()) {
      try {
        await AgreementModel.findOneAndUpdate({ id: agreement.id }, agreement, { upsert: true, new: true });
        console.log(`✅ [MongoDB Atlas] Agreement saved: v${agreement.version} (${agreement.id})`);
      } catch (err: any) {
        console.warn('⚠️ Atlas AgreementModel save error:', err.message);
      }
    }
  }

  // --- Blueprints Persistence ---
  async saveBlueprint(blueprint: WorkBlueprint): Promise<void> {
    this.blueprints.set(blueprint.id, blueprint);
    if (isDbConnected()) {
      try {
        await WorkBlueprintModel.findOneAndUpdate({ id: blueprint.id }, blueprint, { upsert: true, new: true });
        console.log(`✅ [MongoDB Atlas] Blueprint saved: ${blueprint.projectTitle} (${blueprint.id})`);
      } catch (err: any) {
        console.warn('⚠️ Atlas WorkBlueprintModel save error:', err.message);
      }
    }
  }

  // --- Evidence Persistence ---
  async saveEvidence(evidence: EvidenceItem): Promise<void> {
    this.evidence.set(evidence.id, evidence);
    if (isDbConnected()) {
      try {
        await EvidenceModel.findOneAndUpdate({ id: evidence.id }, evidence, { upsert: true, new: true });
        console.log(`✅ [MongoDB Atlas] Evidence saved: ${evidence.title} (${evidence.id})`);
      } catch (err: any) {
        console.warn('⚠️ Atlas EvidenceModel save error:', err.message);
      }
    }
  }

  // --- AI Reviews Persistence ---
  async saveAiReview(review: AiReview): Promise<void> {
    this.aiReviews.set(review.id, review);
    if (isDbConnected()) {
      try {
        await AiReviewModel.findOneAndUpdate({ id: review.id }, review, { upsert: true, new: true });
        console.log(`✅ [MongoDB Atlas] AI Review saved: ${review.id}`);
      } catch (err: any) {
        console.warn('⚠️ Atlas AiReviewModel save error:', err.message);
      }
    }
  }

  // --- Scope Changes Persistence ---
  async saveScopeChange(req: ScopeChangeRequest): Promise<void> {
    this.scopeChangeRequests.set(req.id, req);
    if (isDbConnected()) {
      try {
        await ScopeChangeRequestModel.findOneAndUpdate({ id: req.id }, req, { upsert: true, new: true });
        console.log(`✅ [MongoDB Atlas] Scope Change saved: ${req.id}`);
      } catch (err: any) {
        console.warn('⚠️ Atlas ScopeChangeRequestModel save error:', err.message);
      }
    }
  }

  // --- Payments Persistence ---
  async savePayment(payment: PaymentRecord): Promise<void> {
    this.payments.set(payment.id, payment);
    if (isDbConnected()) {
      try {
        await PaymentModel.findOneAndUpdate({ id: payment.id }, payment, { upsert: true, new: true });
        console.log(`✅ [MongoDB Atlas] Payment saved: ${payment.id}`);
      } catch (err: any) {
        console.warn('⚠️ Atlas PaymentModel save error:', err.message);
      }
    }
  }

  // --- Audit Events ---
  addAuditEvent(event: Omit<AuditEvent, 'id' | 'createdAt'>): AuditEvent {
    const fullEvent: AuditEvent = {
      ...event,
      id: 'aud_' + Math.random().toString(36).substring(2, 10),
      createdAt: new Date().toISOString(),
    };
    this.auditEvents.unshift(fullEvent);
    if (isDbConnected()) {
      AuditEventModel.create(fullEvent).catch((err) =>
        console.warn('Atlas AuditEventModel save error:', err.message)
      );
    }
    return fullEvent;
  }

  // --- Notifications ---
  addNotification(notif: Omit<InAppNotification, 'id' | 'createdAt' | 'read'>): InAppNotification {
    const fullNotification: InAppNotification = {
      ...notif,
      id: 'notif_' + Math.random().toString(36).substring(2, 10),
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.unshift(fullNotification);
    if (isDbConnected()) {
      NotificationModel.create(fullNotification).catch((err) =>
        console.warn('Atlas NotificationModel save error:', err.message)
      );
    }
    return fullNotification;
  }

  // --- Password Recovery OTPs ---
  async saveOtp(otpRecord: PasswordResetOtp): Promise<void> {
    const emailKey = otpRecord.email.toLowerCase().trim();
    this.otps.set(emailKey, otpRecord);
    if (isDbConnected()) {
      try {
        await PasswordResetOtpModel.deleteMany({ email: emailKey });
        await PasswordResetOtpModel.create(otpRecord);
      } catch (err: any) {
        console.warn('Atlas PasswordResetOtpModel save error:', err.message);
      }
    }
  }

  async getValidOtp(email: string, otp: string): Promise<PasswordResetOtp | null> {
    const emailKey = email.toLowerCase().trim();
    let record = this.otps.get(emailKey);
    if (!record && isDbConnected()) {
      try {
        const dbOtp: any = await PasswordResetOtpModel.findOne({ email: emailKey, used: false })
          .sort({ createdAt: -1 })
          .lean();
        if (dbOtp) {
          record = dbOtp;
          this.otps.set(emailKey, dbOtp);
        }
      } catch (err: any) {
        console.warn('Atlas PasswordResetOtpModel fetch error:', err.message);
      }
    }
    if (!record) return null;
    if (record.used) return null;
    if (new Date(record.expiresAt).getTime() < Date.now()) return null;
    if (record.otp !== otp.trim()) {
      record.attempts = (record.attempts || 0) + 1;
      return null;
    }
    return record;
  }

  async markOtpUsed(email: string, otp: string): Promise<void> {
    const emailKey = email.toLowerCase().trim();
    const record = this.otps.get(emailKey);
    if (record) {
      record.used = true;
    }
    if (isDbConnected()) {
      try {
        await PasswordResetOtpModel.updateMany({ email: emailKey, otp: otp.trim() }, { used: true });
      } catch (err: any) {
        console.warn('Atlas PasswordResetOtpModel update error:', err.message);
      }
    }
  }

  // --- Transactional Email Logs ---
  addEmailLog(log: Omit<EmailLog, 'id' | 'createdAt'>): EmailLog {
    const fullLog: EmailLog = {
      ...log,
      id: 'eml_' + Math.random().toString(36).substring(2, 10),
      createdAt: new Date().toISOString(),
    };
    this.emailLogs.unshift(fullLog);
    if (isDbConnected()) {
      EmailLogModel.create(fullLog).catch((err: any) =>
        console.warn('Atlas EmailLogModel save error:', err.message)
      );
    }
    return fullLog;
  }

  getEmailLogs(toEmail?: string): EmailLog[] {
    if (!toEmail) return this.emailLogs;
    const normalized = toEmail.toLowerCase().trim();
    return this.emailLogs.filter((e) => e.to.toLowerCase() === normalized);
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
    this.otps.clear();
    this.emailLogs = [];
  }
}

export const dbStore = new ClausoraLiveStore();
