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

export interface ProjectPaymentDetails {
  payerEmail?: string;
  paypalMerchantId?: string;
  billingName?: string;
  taxId?: string;
  billingAddress?: string;
  paymentMethod?: 'paypal_sandbox' | 'credit_card' | 'bank_wire';
  escrowTerms?: string;
  payoutNotes?: string;
  updatedAt?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  ownerName?: string;
  clientName?: string;
  assignedProviderId?: string;
  assignedProviderName?: string;
  providerIds: string[];
  createdBy?: string;
  creatorRole?: UserRole;
  acceptedBy?: string;
  acceptedAt?: string;
  status: ProjectStatus;
  sourceAssets: string[];
  currentAgreementId: string;
  deadline?: string;
  totalAmountMinor?: number;
  settledAmountMinor?: number;
  currency?: string;
  paymentDetails?: ProjectPaymentDetails;
  workflowDiagram?: string;
  isDeleted?: boolean;
  deletedAt?: string;
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

export type LanguageCode = 'en' | 'ta' | 'hi' | 'es' | 'fr' | 'de' | 'ar' | 'ja' | 'other';

export interface LanguageMetadata {
  detectedLanguage: LanguageCode;
  detectedLanguageName: string;
  confidence: number;
  originalInputExcerpt: string;
  translatedSummary?: string;
  isMultilingual: boolean;
}

export type RequirementCategory =
  | 'functional'
  | 'technical'
  | 'security'
  | 'ui_ux'
  | 'performance'
  | 'integration'
  | 'compliance'
  | 'operational';

export type RequirementStatus =
  | 'confirmed'
  | 'implied'
  | 'recommended'
  | 'missing'
  | 'conflicted'
  | 'out_of_scope';

export interface RequirementItem {
  id: string; // e.g. REQ-001
  description: string;
  category: RequirementCategory;
  sourceReference: string;
  status: RequirementStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  relatedDeliverables: string[];
  relatedCriteriaIds: string[];
  isUserExplicit: boolean;
}

export interface BusinessAnalysis {
  businessObjective: string;
  targetAudience: string[];
  userProblemsSolved: string[];
  expectedBusinessValue: string;
  operationalRequirements: string[];
  successMetrics: string[];
}

export interface TechnicalAnalysis {
  recommendedArchitecture: string;
  technologyStack: {
    frontend: string[];
    backend: string[];
    database: string[];
    apis: string[];
    infrastructure: string[];
  };
  integrationComplexity: 'low' | 'medium' | 'high' | 'very_high';
  securityRequirements: string[];
  scalabilityConsiderations: string[];
}

export interface FunctionalAnalysis {
  coreFeatures: string[];
  supportingFeatures: string[];
  primaryUserJourneys: string[];
  adminWorkflows: string[];
  keyEdgeCases: string[];
}

export interface DeliveryAnalysis {
  developmentComplexity: 'low' | 'medium' | 'high';
  criticalPath: string[]; // task IDs in order
  testingRequirements: string[];
  deploymentReadinessChecklist: string[];
  handoverRequirements: string[];
}

export interface RiskItem {
  riskId: string; // e.g. RSK-001
  description: string;
  category: 'technical' | 'scope' | 'timeline' | 'integration' | 'security' | 'budget';
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high' | 'critical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigationStrategy: string;
  humanDecisionRequired: boolean;
}

export interface SubtaskItem {
  id: string; // e.g. SUB-001
  title: string;
  description: string;
  deliverable: string;
  isCompleted: boolean;
}

export interface AcceptanceCriterionItem {
  id: string; // e.g. AC-001
  criterion: string;
  verificationMethod:
    | 'automated_test'
    | 'visual_inspection'
    | 'api_verification'
    | 'code_review'
    | 'security_scan'
    | 'user_journey_test';
  expectedResult: string;
  requiredEvidence: Array<'screenshot' | 'url' | 'document' | 'repository_link' | 'video' | 'rea_trace'>;
  status: 'unverified' | 'supported' | 'partially_supported' | 'not_supported' | 'insufficient_evidence';
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  relatedRequirementIds?: string[];
  workstreamId?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  complexity?: 'low' | 'medium' | 'high' | 'critical';
  estimatedEffortHours?: number;
  estimatedDurationDays?: number;
  dependencies: string[];
  requiredSkills?: string[];
  subtasks?: SubtaskItem[];
  deliverable: string;
  acceptanceCriteria: string[]; // flat strings for backward compatibility
  structuredCriteria?: AcceptanceCriterionItem[]; // rich testable criteria
  recommendedEvidence: Array<'screenshot' | 'url' | 'document' | 'repository_link' | 'video' | 'rea_trace'>;
  definitionOfDone?: string;
  requiresHumanDecision?: boolean;
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

export interface QualityAssessment {
  requirementCoverage: number; // 0-100
  technicalCompleteness: number; // 0-100
  taskClarity: number; // 0-100
  acceptanceCriteriaQuality: number; // 0-100
  dependencyConsistency: number; // 0-100
  timelineConsistency: number; // 0-100
  riskIdentification: number; // 0-100
  evidenceReadiness: number; // 0-100
  languageAccuracy: number; // 0-100
  overallScore: number; // 0-100
  explanations: Record<string, string>;
  unresolvedIssues: string[];
}

export interface ClarificationQuestionItem {
  id: string;
  category: 'business' | 'technical' | 'timeline' | 'budget' | 'delivery';
  question: string;
  context: string;
  importance: 'critical' | 'helpful' | 'optional';
  answered: boolean;
  answer?: string;
}

export interface WorkBlueprint {
  id: string;
  projectId: string;
  version: number;
  projectTitle: string;
  projectSummary: string;
  detectedProjectType: 'web_app' | 'mobile_app' | 'design' | 'content' | 'other';
  languageMetadata?: LanguageMetadata;
  requirements?: RequirementItem[];
  businessAnalysis?: BusinessAnalysis;
  technicalAnalysis?: TechnicalAnalysis;
  functionalAnalysis?: FunctionalAnalysis;
  deliveryAnalysis?: DeliveryAnalysis;
  riskRegister?: RiskItem[];
  qualityAssessment?: QualityAssessment;
  categorizedClarifications?: ClarificationQuestionItem[];
  workstreams: Workstream[];
  assumptions: string[];
  missingInformation: string[];
  risks: string[];
  clarifyingQuestions: string[];
  suggestedMilestones: SuggestedMilestone[];
  workflowDiagram?: string;
  workflowSteps?: WorkflowStep[];
  totalBudgetMinor?: number;
  budgetConfirmedByHuman?: boolean;
  currency?: string;
  targetDeadline?: string;
  deadlineConfirmedByHuman?: boolean;
  aiModel: string;
  createdAt: string;
  updatedAt?: string;
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
  | 'PARTIALLY_PAID'
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
  paidMinor?: number; // integer minor units paid so far
  currency: string; // e.g. USD
  dueDate: string;
  taskIds: string[];
  progressPercent?: number; // 0 to 100 calculated from task progress
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
