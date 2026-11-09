import { z } from 'zod';

export const LanguageMetadataSchema = z.object({
  detectedLanguage: z.enum(['en', 'ta', 'hi', 'es', 'fr', 'de', 'ar', 'ja', 'other']).default('en'),
  detectedLanguageName: z.string().default('English'),
  confidence: z.number().min(0).max(1).default(1.0),
  originalInputExcerpt: z.string().default(''),
  translatedSummary: z.string().optional(),
  isMultilingual: z.boolean().default(false),
});

export const RequirementItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  category: z.enum(['functional', 'technical', 'security', 'ui_ux', 'performance', 'integration', 'compliance', 'operational']).default('functional'),
  sourceReference: z.string().default(''),
  status: z.enum(['confirmed', 'implied', 'recommended', 'missing', 'conflicted', 'out_of_scope']).default('confirmed'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  relatedDeliverables: z.array(z.string()).default([]),
  relatedCriteriaIds: z.array(z.string()).default([]),
  isUserExplicit: z.boolean().default(true),
});

export const BusinessAnalysisSchema = z.object({
  businessObjective: z.string().default(''),
  targetAudience: z.array(z.string()).default([]),
  userProblemsSolved: z.array(z.string()).default([]),
  expectedBusinessValue: z.string().default(''),
  operationalRequirements: z.array(z.string()).default([]),
  successMetrics: z.array(z.string()).default([]),
});

export const TechnicalAnalysisSchema = z.object({
  recommendedArchitecture: z.string().default(''),
  technologyStack: z.object({
    frontend: z.array(z.string()).default([]),
    backend: z.array(z.string()).default([]),
    database: z.array(z.string()).default([]),
    apis: z.array(z.string()).default([]),
    infrastructure: z.array(z.string()).default([]),
  }).default({ frontend: [], backend: [], database: [], apis: [], infrastructure: [] }),
  integrationComplexity: z.enum(['low', 'medium', 'high', 'very_high']).default('medium'),
  securityRequirements: z.array(z.string()).default([]),
  scalabilityConsiderations: z.array(z.string()).default([]),
});

export const FunctionalAnalysisSchema = z.object({
  coreFeatures: z.array(z.string()).default([]),
  supportingFeatures: z.array(z.string()).default([]),
  primaryUserJourneys: z.array(z.string()).default([]),
  adminWorkflows: z.array(z.string()).default([]),
  keyEdgeCases: z.array(z.string()).default([]),
});

export const DeliveryAnalysisSchema = z.object({
  developmentComplexity: z.enum(['low', 'medium', 'high']).default('medium'),
  criticalPath: z.array(z.string()).default([]),
  testingRequirements: z.array(z.string()).default([]),
  deploymentReadinessChecklist: z.array(z.string()).default([]),
  handoverRequirements: z.array(z.string()).default([]),
});

export const RiskItemSchema = z.object({
  riskId: z.string(),
  description: z.string(),
  category: z.enum(['technical', 'scope', 'timeline', 'integration', 'security', 'budget']).default('technical'),
  probability: z.enum(['low', 'medium', 'high']).default('medium'),
  impact: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  mitigationStrategy: z.string().default(''),
  humanDecisionRequired: z.boolean().default(false),
});

export const SubtaskItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().default(''),
  deliverable: z.string().default(''),
  isCompleted: z.boolean().default(false),
});

export const AcceptanceCriterionItemSchema = z.object({
  id: z.string(),
  criterion: z.string(),
  verificationMethod: z.enum([
    'automated_test',
    'visual_inspection',
    'api_verification',
    'code_review',
    'security_scan',
    'user_journey_test',
  ]).default('visual_inspection'),
  expectedResult: z.string().default(''),
  requiredEvidence: z.array(z.enum(['screenshot', 'url', 'document', 'repository_link', 'video', 'rea_trace'])).default(['screenshot', 'url']),
  status: z.enum(['unverified', 'supported', 'partially_supported', 'not_supported', 'insufficient_evidence']).default('unverified'),
});

export const TaskItemSchema = z.object({
  id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
  title: z.string().min(1, 'Task title is required'),
  description: z.string().default(''),
  relatedRequirementIds: z.array(z.string()).default([]),
  workstreamId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  complexity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  estimatedEffortHours: z.number().default(8),
  estimatedDurationDays: z.number().default(2),
  dependencies: z.array(z.string()).default([]),
  requiredSkills: z.array(z.string()).default([]),
  subtasks: z.array(SubtaskItemSchema).default([]),
  deliverable: z.string().min(1, 'Deliverable description is required'),
  acceptanceCriteria: z.array(z.string()).default([]),
  structuredCriteria: z.array(AcceptanceCriterionItemSchema).default([]),
  recommendedEvidence: z.array(z.enum(['screenshot', 'url', 'document', 'repository_link', 'video', 'rea_trace'])).default(['screenshot', 'url']),
  definitionOfDone: z.string().default('Code tested, deliverables documented and verified against acceptance criteria.'),
  requiresHumanDecision: z.boolean().default(false),
  confidence: z.number().min(0).max(1).default(0.85),
  status: z.enum(['todo', 'in_progress', 'submitted', 'needs_revision', 'done']).default('todo'),
});

export const QualityAssessmentSchema = z.object({
  requirementCoverage: z.number().min(0).max(100).default(85),
  technicalCompleteness: z.number().min(0).max(100).default(85),
  taskClarity: z.number().min(0).max(100).default(90),
  acceptanceCriteriaQuality: z.number().min(0).max(100).default(85),
  dependencyConsistency: z.number().min(0).max(100).default(90),
  timelineConsistency: z.number().min(0).max(100).default(85),
  riskIdentification: z.number().min(0).max(100).default(85),
  evidenceReadiness: z.number().min(0).max(100).default(90),
  languageAccuracy: z.number().min(0).max(100).default(95),
  overallScore: z.number().min(0).max(100).default(88),
  explanations: z.record(z.string()).default({}),
  unresolvedIssues: z.array(z.string()).default([]),
});

export const ClarificationQuestionItemSchema = z.object({
  id: z.string(),
  category: z.enum(['business', 'technical', 'timeline', 'budget', 'delivery']).default('technical'),
  question: z.string(),
  context: z.string().default(''),
  importance: z.enum(['critical', 'helpful', 'optional']).default('helpful'),
  answered: z.boolean().default(false),
  answer: z.string().optional(),
});

export const WorkstreamSchema = z.object({
  id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
  name: z.string().min(1, 'Workstream name is required'),
  description: z.string().default(''),
  tasks: z.array(TaskItemSchema).min(1, 'Each workstream requires at least one task'),
});

export const SuggestedMilestoneSchema = z.object({
  id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
  name: z.string().min(1, 'Milestone name is required'),
  includedTaskTitles: z.array(z.string()).default([]),
  suggestedAmountMinor: z.number().nullable().default(null),
  amountNeedsHumanInput: z.boolean().default(true),
  currency: z.string().default('USD'),
  dueDate: z.string().optional(),
});

export const WorkflowStepSchema = z.object({
  id: z.string(),
  stepNumber: z.number(),
  title: z.string(),
  phase: z.string(),
  description: z.string(),
  deliverable: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed']).default('pending'),
  milestoneRef: z.string().optional(),
  estimatedDays: z.number().optional(),
  amountMinor: z.number().optional(),
});

export const WorkBlueprintSchema = z.object({
  projectTitle: z.string().min(1, 'Project title is required'),
  projectSummary: z.string().min(1, 'Project summary is required'),
  detectedProjectType: z.enum(['web_app', 'mobile_app', 'design', 'content', 'other']).default('web_app'),
  languageMetadata: LanguageMetadataSchema.optional(),
  requirements: z.array(RequirementItemSchema).default([]),
  businessAnalysis: BusinessAnalysisSchema.optional(),
  technicalAnalysis: TechnicalAnalysisSchema.optional(),
  functionalAnalysis: FunctionalAnalysisSchema.optional(),
  deliveryAnalysis: DeliveryAnalysisSchema.optional(),
  riskRegister: z.array(RiskItemSchema).default([]),
  qualityAssessment: QualityAssessmentSchema.optional(),
  categorizedClarifications: z.array(ClarificationQuestionItemSchema).default([]),
  workstreams: z.array(WorkstreamSchema).min(1, 'At least one workstream is required'),
  assumptions: z.array(z.string()).default([]),
  missingInformation: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  clarifyingQuestions: z.array(z.string()).default([]),
  suggestedMilestones: z.array(SuggestedMilestoneSchema).default([]),
  workflowDiagram: z.string().optional(),
  workflowSteps: z.array(WorkflowStepSchema).default([]),
  totalBudgetMinor: z.number().optional(),
  budgetConfirmedByHuman: z.boolean().default(false),
  targetDeadline: z.string().optional(),
  deadlineConfirmedByHuman: z.boolean().default(false),
});

export const CriterionAnalysisResultSchema = z.object({
  criterionId: z.string(),
  status: z.enum(['supported', 'partially_supported', 'not_supported', 'insufficient_evidence']),
  observations: z.array(z.string()).min(1, 'Observations are required'),
  evidenceReferences: z.array(z.string()).default([]),
  limitations: z.array(z.string()).default([]),
  questionsForReviewer: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.8),
  recommendation: z.enum(['ready_for_human_review', 'request_more_evidence', 'revision_suggested']),
});

export const EvidenceAnalysisSchema = z.object({
  milestoneId: z.string(),
  overallRecommendation: z.enum(['ready_for_human_review', 'request_more_evidence', 'revision_suggested']),
  criterionResults: z.array(CriterionAnalysisResultSchema),
  limitations: z.array(z.string()).default([]),
});

export const ScopeDriftSchema = z.object({
  classification: z.enum([
    'in_scope',
    'clarification',
    'likely_scope_change',
    'deadline_change',
    'conflict',
    'uncertain',
  ]),
  reason: z.string().min(1, 'Reasoning is required'),
  relatedCriterionIds: z.array(z.string()).default([]),
  impactAreas: z.array(z.enum(['cost', 'time', 'deliverables', 'dependencies'])).default([]),
  suggestedChangeRequest: z.object({
    description: z.string(),
    proposedDueDate: z.string().nullable().default(null),
    additionalAmountMinor: z.number().nullable().default(null),
  }),
  requiresHumanDecision: z.boolean().default(true),
});

export const ReaReportSchema = z.object({
  targetName: z.string().min(1),
  targetType: z.enum(['native', 'web', 'electron', 'js_runtime', 'apk', 'api']).default('web'),
  overview: z.string(),
  observedBehaviors: z.array(z.string()).default([]),
  discoveredEndpointsOrFunctions: z.array(z.string()).default([]),
  limitations: z.array(z.string()).default([]),
  evidenceArtifacts: z.array(
    z.object({
      name: z.string(),
      kind: z.string(),
      details: z.string(),
    })
  ).default([]),
  clientId: z.string().optional(),
  providerId: z.string().optional(),
  generatedAt: z.string().default(() => new Date().toISOString()),
});

// HTTP Request Schemas
export const RegisterInputSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['client', 'provider', 'admin']).default('client'),
});

export const LoginInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const CreateProjectInputSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().default(''),
  sourceType: z.enum(['text', 'file', 'url', 'github', 'rea']).default('text'),
  sourceContent: z.string().optional(),
  clientId: z.string().optional(),
  providerId: z.string().optional(),
  deadline: z.string().optional(),
  totalAmountMinor: z.number().int().positive().optional(),
  currency: z.string().default('USD'),
});

export const CreateMilestoneInputSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().default(''),
  amountMinor: z.number().int().positive('Amount must be positive in minor currency units (cents)'),
  currency: z.string().length(3).default('USD'),
  dueDate: z.string(),
  clientId: z.string().optional(),
  acceptanceCriteria: z.array(
    z.object({
      criterion: z.string().min(1),
      deliverable: z.string().min(1),
    })
  ).min(1, 'At least one acceptance criterion is required'),
});

export const CreatePaymentOrderInputSchema = z.object({
  milestoneId: z.string().min(1),
});

export const CapturePaymentInputSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().optional(),
});

