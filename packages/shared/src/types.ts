export type UserRole = 'client' | 'provider' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export type ProjectStatus =
  | 'draft'
  | 'analysing'
  | 'awaiting_approval'
  | 'active'
  | 'completed'
  | 'paused'
  | 'disputed';

export interface Project {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  providerIds: string[];
  status: ProjectStatus;
  sourceAssets: string[];
  currentAgreementId: string;
  deadline?: string;
  totalAmountMinor?: number;
  currency?: string;
  workflowDiagram?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SourceAsset {
  id: string;
  projectId: string;
  uploadedBy: string;
  type: 'pdf' | 'docx' | 'image' | 'text' | 'url' | 'repository_link' | 'rea_report' | 'document';
  name: string;
  urlOrKey: string;
  mimeType?: string;
  sizeBytes?: number;
  sha256?: string;
  extractedText?: string;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  dependencies: string[];
  deliverable: string;
  acceptanceCriteria: string[];
  recommendedEvidence: Array<'screenshot' | 'url' | 'document' | 'repository_link' | 'video' | 'rea_trace'>;
  confidence: number;
  status: 'todo' | 'in_progress' | 'submitted' | 'needs_revision' | 'done';
  assignedClientId?: string;
  assignedProviderId?: string;
}

export interface Workstream {
  id: string;
  name: string;
  description: string;
  tasks: TaskItem[];
}

export interface SuggestedMilestone {
  id: string;
  name: string;
  includedTaskTitles: string[];
  suggestedAmountMinor: number | null;
  amountNeedsHumanInput: boolean;
  currency: string;
  dueDate?: string;
}

export interface WorkflowStep {
  id: string;
  stepNumber: number;
  title: string;
  phase: string;
  description: string;
  deliverable: string;
  status: 'pending' | 'in_progress' | 'completed';
  milestoneRef?: string;
  estimatedDays?: number;
  amountMinor?: number;
}

export interface WorkBlueprint {
  id: string;
  projectId: string;
  version: number;
  projectTitle: string;
  projectSummary: string;
  detectedProjectType: 'web_app' | 'mobile_app' | 'design' | 'content' | 'other';
  workstreams: Workstream[];
  assumptions: string[];
  missingInformation: string[];
  risks: string[];
  clarifyingQuestions: string[];
  suggestedMilestones: SuggestedMilestone[];
  workflowDiagram?: string;
  workflowSteps?: WorkflowStep[];
  totalBudgetMinor?: number;
  targetDeadline?: string;
  aiModel: string;
  createdAt: string;
}

export type AgreementStatus = 'draft' | 'awaiting_approval' | 'approved' | 'superseded' | 'disputed';

export interface AgreementApproval {
  userId: string;
  userName: string;
  role: UserRole;
  decision: 'approved' | 'requested_changes';
  note?: string;
  createdAt: string;
  snapshotHashSeen: string;
}

export interface Agreement {
  id: string;
  projectId: string;
  version: number;
  canonicalSnapshot: {
    projectTitle: string;
    projectSummary: string;
    workstreams: Workstream[];
    milestones: SuggestedMilestone[];
    totalAmountMinor: number;
    currency: string;
  };
  snapshotHash: string; // SHA-256 fingerprint
  currency: string;
  totalAmountMinor: number; // in cents
  status: AgreementStatus;
  approvals: AgreementApproval[];
  createdBy: string;
  createdAt: string;
  approvedAt?: string;
}

export type MilestoneStatus =
  | 'CREATED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'AI_REVIEWED'
  | 'AWAITING_CLIENT_DECISION'
  | 'REVISION_REQUESTED'
  | 'MORE_EVIDENCE_REQUIRED'
  | 'APPROVED_FOR_PAYMENT'
  | 'PAYPAL_ORDER_CREATED'
  | 'PAYER_APPROVED'
  | 'PAYMENT_CAPTURED'
  | 'PAID'
  | 'CANCELLED'
  | 'DISPUTED';

export interface Milestone {
  id: string;
  projectId: string;
  agreementId: string;
  title: string;
  description: string;
  amountMinor: number; // integer minor units
  currency: string; // e.g. USD
  dueDate: string;
  taskIds: string[];
  acceptanceCriteria: Array<{
    id: string;
    criterion: string;
    deliverable: string;
    status: 'unverified' | 'supported' | 'partially_supported' | 'not_supported' | 'insufficient_evidence';
  }>;
  status: MilestoneStatus;
  approvedBy?: string;
  approvedAt?: string;
  paypalOrderId?: string;
  paypalCaptureId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceItem {
  id: string;
  projectId: string;
  milestoneId: string;
  taskId?: string;
  uploadedBy: string;
  type: 'image' | 'document' | 'url' | 'repository' | 'note' | 'video' | 'rea_trace';
  title: string;
  urlOrContent: string;
  description: string;
  sha256?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CriterionAnalysisResult {
  criterionId: string;
  status: 'supported' | 'partially_supported' | 'not_supported' | 'insufficient_evidence';
  observations: string[];
  evidenceReferences: string[];
  limitations: string[];
  questionsForReviewer: string[];
  confidence: number;
  recommendation: 'ready_for_human_review' | 'request_more_evidence' | 'revision_suggested';
}

export interface AiReview {
  id: string;
  projectId: string;
  milestoneId: string;
  evidenceIds: string[];
  criterionResults: CriterionAnalysisResult[];
  overallRecommendation: 'ready_for_human_review' | 'request_more_evidence' | 'revision_suggested';
  limitations: string[];
  modelId: string;
  promptVersion: string;
  rawResponseHash: string;
  createdAt: string;
}

export type ScopeDriftClassification =
  | 'in_scope'
  | 'clarification'
  | 'likely_scope_change'
  | 'deadline_change'
  | 'conflict'
  | 'uncertain';

export interface ScopeChangeRequest {
  id: string;
  projectId: string;
  baseAgreementId: string;
  incomingText: string;
  classification: ScopeDriftClassification;
  reason: string;
  relatedCriterionIds: string[];
  impactAreas: Array<'cost' | 'time' | 'deliverables' | 'dependencies'>;
  suggestedChangeRequest: {
    description: string;
    proposedDueDate?: string | null;
    additionalAmountMinor?: number | null;
  };
  requiresHumanDecision: boolean;
  status: 'proposed' | 'accepted' | 'rejected' | 'superseded';
  createdBy: string;
  createdAt: string;
}

export type PaymentStatus =
  | 'not_started'
  | 'order_created'
  | 'payer_approved'
  | 'captured'
  | 'failed'
  | 'refunded';

export interface PaymentRecord {
  id: string;
  projectId: string;
  milestoneId: string;
  payerId: string;
  amountMinor: number;
  currency: string;
  paypalOrderId: string;
  paypalCaptureId?: string;
  status: PaymentStatus;
  idempotencyKey: string;
  approvalLink?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEvent {
  id: string;
  projectId: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole | 'system' | 'ai';
  eventType: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface InAppNotification {
  id: string;
  userId: string;
  projectId?: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface ReaInspectionReport {
  targetName: string;
  targetType: 'native' | 'web' | 'electron' | 'js_runtime' | 'apk' | 'api';
  overview: string;
  observedBehaviors: string[];
  discoveredEndpointsOrFunctions: string[];
  limitations: string[];
  evidenceArtifacts: Array<{
    name: string;
    kind: string;
    details: string;
  }>;
  generatedAt: string;
}

export interface AdminOverviewStats {
  totalUsers: number;
  totalClients: number;
  totalProviders: number;
  totalProjects: number;
  totalMilestones: number;
  totalVolumeMinor: number;
  settledVolumeMinor: number;
  pendingVolumeMinor: number;
  activeScopeDriftAlerts: number;
  aiAnalysesPerformed: number;
}

export interface AnalyticsData {
  milestoneDistribution: {
    paid: number;
    approvedForPayment: number;
    awaitingDecision: number;
    inProgress: number;
    created: number;
  };
  financialSummary: {
    settledCents: number;
    pendingCents: number;
    currency: string;
  };
  scopeDriftSummary: {
    likelyScopeChanges: number;
    clarifications: number;
    inScope: number;
  };
  aiReviewMetrics: {
    avgConfidence: number;
    reviewsGenerated: number;
    limitationsCount: number;
  };
}
