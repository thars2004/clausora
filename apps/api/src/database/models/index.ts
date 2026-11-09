import mongoose, { Schema } from 'mongoose';

// 1. User Model
const UserSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: ['client', 'provider', 'admin'], required: true, index: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);

// 2. Project Model
const ProjectSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    ownerId: { type: String, required: true, index: true }, // Client owner
    providerIds: { type: [String], default: [], index: true }, // Assigned providers
    status: {
      type: String,
      enum: ['draft', 'analysing', 'awaiting_approval', 'active', 'completed', 'paused', 'disputed'],
      default: 'draft',
      index: true,
    },
    sourceAssets: { type: [String], default: [] },
    currentAgreementId: { type: String, default: '' },
    deadline: { type: String },
    totalAmountMinor: { type: Number },
    currency: { type: String, default: 'USD' },
    workflowDiagram: { type: String },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

export const ProjectModel = mongoose.models.Project || mongoose.model('Project', ProjectSchema);

// 3. Milestone Model
const MilestoneSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    projectId: { type: String, required: true, index: true },
    agreementId: { type: String, default: '', index: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    amountMinor: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    dueDate: { type: String, required: true },
    taskIds: { type: [String], default: [] },
    acceptanceCriteria: {
      type: [
        {
          id: String,
          criterion: String,
          deliverable: String,
          status: {
            type: String,
            enum: ['unverified', 'supported', 'partially_supported', 'not_supported', 'insufficient_evidence'],
            default: 'unverified',
          },
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: [
        'CREATED',
        'IN_PROGRESS',
        'SUBMITTED',
        'AI_REVIEWED',
        'AWAITING_CLIENT_DECISION',
        'REVISION_REQUESTED',
        'MORE_EVIDENCE_REQUIRED',
        'APPROVED_FOR_PAYMENT',
        'PAYPAL_ORDER_CREATED',
        'PAYER_APPROVED',
        'PAYMENT_CAPTURED',
        'PAID',
        'CANCELLED',
        'DISPUTED',
      ],
      default: 'CREATED',
      index: true,
    },
    approvedBy: { type: String },
    approvedAt: { type: String },
    paypalOrderId: { type: String, index: true },
    paypalCaptureId: { type: String, index: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

export const MilestoneModel = mongoose.models.Milestone || mongoose.model('Milestone', MilestoneSchema);

// 4. Agreement Model
const AgreementSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    projectId: { type: String, required: true, index: true },
    version: { type: Number, required: true },
    canonicalSnapshot: { type: Schema.Types.Mixed, required: true },
    snapshotHash: { type: String, required: true, index: true }, // SHA-256
    currency: { type: String, default: 'USD' },
    totalAmountMinor: { type: Number, required: true },
    status: {
      type: String,
      enum: ['draft', 'awaiting_approval', 'approved', 'superseded', 'disputed'],
      default: 'draft',
      index: true,
    },
    approvals: {
      type: [
        {
          userId: String,
          userName: String,
          role: String,
          decision: String,
          note: String,
          createdAt: String,
          snapshotHashSeen: String,
        },
      ],
      default: [],
    },
    createdBy: { type: String, required: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
    approvedAt: { type: String },
  },
  { timestamps: true }
);

export const AgreementModel = mongoose.models.Agreement || mongoose.model('Agreement', AgreementSchema);

// 5. WorkBlueprint Model
const WorkBlueprintSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    projectId: { type: String, required: true, index: true },
    version: { type: Number, default: 1 },
    projectTitle: { type: String, required: true },
    projectSummary: { type: String, default: '' },
    detectedProjectType: { type: String, default: 'web_app' },
    languageMetadata: { type: Schema.Types.Mixed },
    requirements: { type: [Schema.Types.Mixed], default: [] },
    businessAnalysis: { type: Schema.Types.Mixed },
    technicalAnalysis: { type: Schema.Types.Mixed },
    functionalAnalysis: { type: Schema.Types.Mixed },
    deliveryAnalysis: { type: Schema.Types.Mixed },
    riskRegister: { type: [Schema.Types.Mixed], default: [] },
    qualityAssessment: { type: Schema.Types.Mixed },
    categorizedClarifications: { type: [Schema.Types.Mixed], default: [] },
    workstreams: { type: [Schema.Types.Mixed], default: [] },
    assumptions: { type: [String], default: [] },
    missingInformation: { type: [String], default: [] },
    risks: { type: [String], default: [] },
    clarifyingQuestions: { type: [String], default: [] },
    suggestedMilestones: { type: [Schema.Types.Mixed], default: [] },
    workflowDiagram: { type: String },
    workflowSteps: { type: [Schema.Types.Mixed], default: [] },
    totalBudgetMinor: { type: Number },
    budgetConfirmedByHuman: { type: Boolean, default: false },
    targetDeadline: { type: String },
    deadlineConfirmedByHuman: { type: Boolean, default: false },
    aiModel: { type: String, default: 'Qwen/Qwen2.5-VL-7B-Instruct' },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

export const WorkBlueprintModel = mongoose.models.WorkBlueprint || mongoose.model('WorkBlueprint', WorkBlueprintSchema);

// 6. Evidence Model
const EvidenceSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    projectId: { type: String, required: true, index: true },
    milestoneId: { type: String, required: true, index: true },
    taskId: { type: String },
    uploadedBy: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ['image', 'document', 'url', 'repository', 'note', 'video', 'rea_trace'],
      default: 'image',
    },
    title: { type: String, required: true },
    urlOrContent: { type: String, required: true },
    description: { type: String, default: '' },
    sha256: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

export const EvidenceModel = mongoose.models.Evidence || mongoose.model('Evidence', EvidenceSchema);

// 7. AiReview Model
const AiReviewSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    projectId: { type: String, required: true, index: true },
    milestoneId: { type: String, required: true, index: true },
    evidenceIds: { type: [String], default: [] },
    criterionResults: { type: [Schema.Types.Mixed], default: [] },
    overallRecommendation: { type: String, default: 'ready_for_human_review' },
    limitations: { type: [String], default: [] },
    modelId: { type: String, default: 'Qwen/Qwen2.5-VL-7B-Instruct' },
    promptVersion: { type: String, default: '1.0' },
    rawResponseHash: { type: String, default: '' },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

export const AiReviewModel = mongoose.models.AiReview || mongoose.model('AiReview', AiReviewSchema);

// 8. ScopeChangeRequest Model
const ScopeChangeRequestSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    projectId: { type: String, required: true, index: true },
    baseAgreementId: { type: String, default: '' },
    incomingText: { type: String, required: true },
    classification: {
      type: String,
      enum: ['in_scope', 'clarification', 'likely_scope_change', 'deadline_change', 'conflict', 'uncertain'],
      required: true,
      index: true,
    },
    reason: { type: String, required: true },
    relatedCriterionIds: { type: [String], default: [] },
    impactAreas: { type: [String], default: [] },
    suggestedChangeRequest: { type: Schema.Types.Mixed, default: {} },
    requiresHumanDecision: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['proposed', 'accepted', 'rejected', 'superseded'],
      default: 'proposed',
      index: true,
    },
    createdBy: { type: String, required: true },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

export const ScopeChangeRequestModel =
  mongoose.models.ScopeChangeRequest || mongoose.model('ScopeChangeRequest', ScopeChangeRequestSchema);

// 9. Payment Model
const PaymentSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    projectId: { type: String, required: true, index: true },
    milestoneId: { type: String, required: true, index: true },
    payerId: { type: String, required: true, index: true },
    amountMinor: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    paypalOrderId: { type: String, required: true, unique: true, index: true },
    paypalCaptureId: { type: String, index: true },
    status: {
      type: String,
      enum: ['not_started', 'order_created', 'payer_approved', 'captured', 'failed', 'refunded'],
      default: 'order_created',
      index: true,
    },
    idempotencyKey: { type: String, required: true, unique: true, index: true },
    approvalLink: { type: String },
    createdAt: { type: String, default: () => new Date().toISOString() },
    updatedAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

export const PaymentModel = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);

// 10. AuditEvent Model
const AuditEventSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    projectId: { type: String, required: true, index: true },
    actorId: { type: String, required: true, index: true },
    actorName: { type: String, required: true },
    actorRole: { type: String, required: true },
    eventType: { type: String, required: true, index: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true, index: true },
    summary: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: String, default: () => new Date().toISOString(), index: true },
  },
  { timestamps: true }
);

export const AuditEventModel = mongoose.models.AuditEvent || mongoose.model('AuditEvent', AuditEventSchema);

// 11. Notification Model
const NotificationSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    projectId: { type: String, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

export const NotificationModel = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);

