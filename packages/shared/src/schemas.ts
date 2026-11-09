import { z } from 'zod';

export const TaskItemSchema = z.object({
  id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
  title: z.string().min(1, 'Task title is required'),
  description: z.string().default(''),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dependencies: z.array(z.string()).default([]),
  deliverable: z.string().min(1, 'Deliverable description is required'),
  acceptanceCriteria: z.array(z.string()).min(1, 'At least one acceptance criterion is required'),
  recommendedEvidence: z.array(z.enum(['screenshot', 'url', 'document', 'repository_link', 'video', 'rea_trace'])).default(['screenshot', 'url']),
  confidence: z.number().min(0).max(1).default(0.85),
  status: z.enum(['todo', 'in_progress', 'submitted', 'needs_revision', 'done']).default('todo'),
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

export const WorkBlueprintSchema = z.object({
  projectTitle: z.string().min(1, 'Project title is required'),
  projectSummary: z.string().min(1, 'Project summary is required'),
  detectedProjectType: z.enum(['web_app', 'mobile_app', 'design', 'content', 'other']).default('web_app'),
  workstreams: z.array(WorkstreamSchema).min(1, 'At least one workstream is required'),
  assumptions: z.array(z.string()).default([]),
  missingInformation: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  clarifyingQuestions: z.array(z.string()).default([]),
  suggestedMilestones: z.array(SuggestedMilestoneSchema).default([]),
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

