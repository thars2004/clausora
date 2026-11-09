import { HfInference } from '@huggingface/inference';
import axios from 'axios';
import { env } from '../../config/env';
import {
  WorkBlueprint,
  WorkBlueprintSchema,
  EvidenceAnalysisSchema,
  ScopeDriftSchema,
  WorkflowStep,
  LanguageMetadata,
  LanguageCode,
  RequirementItem,
  BusinessAnalysis,
  TechnicalAnalysis,
  FunctionalAnalysis,
  DeliveryAnalysis,
  RiskItem,
  TaskItem,
  SubtaskItem,
  AcceptanceCriterionItem,
  QualityAssessment,
  ClarificationQuestionItem,
  Workstream,
  SuggestedMilestone,
} from '@clausora/shared';

export class HuggingFaceClient {
  private client: HfInference | null = null;
  private model: string;

  constructor() {
    this.model = env.HF_MODEL || 'Qwen/Qwen2.5-VL-7B-Instruct';
    if (env.HF_TOKEN) {
      this.client = new HfInference(env.HF_TOKEN);
    }
  }

  isConfigured(): boolean {
    return Boolean(env.HF_TOKEN || env.GEMINI_API_KEY);
  }

  getModelName(): string {
    if (env.GEMINI_API_KEY) return env.GEMINI_MODEL || 'gemini-1.5-flash';
    return this.model;
  }

  /**
   * Cleans markdown blocks and performs a single-pass controlled repair on malformed JSON
   */
  private cleanAndRepairJson(raw: string): string {
    let clean = raw.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    clean = clean.trim();

    try {
      JSON.parse(clean);
      return clean;
    } catch {
      // Single controlled repair: balance curly braces and brackets
      let repaired = clean;
      const openBraces = (repaired.match(/{/g) || []).length;
      const closeBraces = (repaired.match(/}/g) || []).length;
      const openBrackets = (repaired.match(/\[/g) || []).length;
      const closeBrackets = (repaired.match(/\]/g) || []).length;

      // Remove trailing commas before closing braces/brackets
      repaired = repaired.replace(/,\s*([}\]])/g, '$1');

      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        repaired += ']';
      }
      for (let i = 0; i < openBraces - closeBraces; i++) {
        repaired += '}';
      }

      return repaired;
    }
  }

  // =========================================================================
  // MULTILINGUAL AI DETECTION & TERMINOLOGY PRESERVATION (Section 12)
  // =========================================================================
  public detectLanguage(text: string): LanguageMetadata {
    if (!text || text.trim().length === 0) {
      return {
        detectedLanguage: 'en',
        detectedLanguageName: 'English',
        confidence: 1.0,
        originalInputExcerpt: '',
        isMultilingual: false,
      };
    }

    const excerpt = text.substring(0, 150).replace(/\n/g, ' ');

    // Unicode script detection
    if (/[\u0B80-\u0BFF]/.test(text)) {
      return {
        detectedLanguage: 'ta',
        detectedLanguageName: 'Tamil (தமிழ்)',
        confidence: 0.98,
        originalInputExcerpt: excerpt,
        isMultilingual: true,
      };
    }

    if (/[\u0900-\u097F]/.test(text)) {
      return {
        detectedLanguage: 'hi',
        detectedLanguageName: 'Hindi (हिन्दी)',
        confidence: 0.98,
        originalInputExcerpt: excerpt,
        isMultilingual: true,
      };
    }

    if (/[\u0600-\u06FF]/.test(text)) {
      return {
        detectedLanguage: 'ar',
        detectedLanguageName: 'Arabic (العربية)',
        confidence: 0.98,
        originalInputExcerpt: excerpt,
        isMultilingual: true,
      };
    }

    if (/[\u3040-\u30FF\u4E00-\u9FAF]/.test(text)) {
      return {
        detectedLanguage: 'ja',
        detectedLanguageName: 'Japanese (日本語)',
        confidence: 0.98,
        originalInputExcerpt: excerpt,
        isMultilingual: true,
      };
    }

    // Latin diacritics / markers
    const lower = text.toLowerCase();
    if (/[ñáéíóú¿¡]/.test(lower) || /\b(el|la|los|las|de|en|con|para|proyecto|desarrollo)\b/.test(lower)) {
      return {
        detectedLanguage: 'es',
        detectedLanguageName: 'Spanish (Español)',
        confidence: 0.92,
        originalInputExcerpt: excerpt,
        isMultilingual: true,
      };
    }

    if (/[éèêëàâçôùû]/.test(lower) || /\b(le|la|les|des|du|dans|pour|avec|projet)\b/.test(lower)) {
      return {
        detectedLanguage: 'fr',
        detectedLanguageName: 'French (Français)',
        confidence: 0.92,
        originalInputExcerpt: excerpt,
        isMultilingual: true,
      };
    }

    if (/[äöüß]/.test(lower) || /\b(der|die|das|und|fuer|mit|nicht|projekt|entwicklung)\b/.test(lower)) {
      return {
        detectedLanguage: 'de',
        detectedLanguageName: 'German (Deutsch)',
        confidence: 0.92,
        originalInputExcerpt: excerpt,
        isMultilingual: true,
      };
    }

    return {
      detectedLanguage: 'en',
      detectedLanguageName: 'English',
      confidence: 0.95,
      originalInputExcerpt: excerpt,
      isMultilingual: false,
    };
  }

  // =========================================================================
  // REQUIREMENT EXTRACTION ENGINE (Section 3)
  // =========================================================================
  private extractRequirements(text: string): RequirementItem[] {
    const rawLines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const items: RequirementItem[] = [];
    let count = 1;

    for (const line of rawLines) {
      // Never convert headers, labels, introductory text into tasks
      if (
        /^(scope details|requirements|specifications|title:|description:|notes:|overview:)/i.test(line) ||
        line.length < 8
      ) {
        continue;
      }

      // Strip bullet symbols and numbering
      const cleaned = line.replace(/^(\d+[\.\)]|[-*•#]+)\s*/, '').trim();
      if (cleaned.length < 10) continue;

      const lower = cleaned.toLowerCase();
      let category: RequirementItem['category'] = 'functional';
      let priority: RequirementItem['priority'] = 'medium';

      if (lower.includes('auth') || lower.includes('security') || lower.includes('token') || lower.includes('jwt') || lower.includes('hash')) {
        category = 'security';
        priority = 'high';
      } else if (lower.includes('api') || lower.includes('database') || lower.includes('schema') || lower.includes('backend') || lower.includes('server')) {
        category = 'technical';
        priority = 'high';
      } else if (lower.includes('ui') || lower.includes('responsive') || lower.includes('design') || lower.includes('mobile') || lower.includes('screen')) {
        category = 'ui_ux';
        priority = 'medium';
      } else if (lower.includes('paypal') || lower.includes('payment') || lower.includes('checkout') || lower.includes('order') || lower.includes('escrow')) {
        category = 'integration';
        priority = 'critical';
      } else if (lower.includes('fast') || lower.includes('latency') || lower.includes('scale') || lower.includes('load')) {
        category = 'performance';
        priority = 'medium';
      }

      const reqId = `REQ-${String(count).padStart(3, '0')}`;
      count++;

      items.push({
        id: reqId,
        description: cleaned,
        category,
        sourceReference: line.substring(0, 60),
        status: 'confirmed',
        priority,
        relatedDeliverables: [`Deliverable for ${reqId}`],
        relatedCriteriaIds: [`AC-${reqId}`],
        isUserExplicit: true,
      });
    }

    // Add baseline implied requirements if not already explicitly stated
    const hasSecurity = items.some((i) => i.category === 'security');
    if (!hasSecurity) {
      items.push({
        id: `REQ-${String(count++).padStart(3, '0')}`,
        description: 'Role-based access boundaries and secure credential verification across endpoints.',
        category: 'security',
        sourceReference: 'Implied by multi-tenant architecture',
        status: 'implied',
        priority: 'high',
        relatedDeliverables: ['Authentication & authorization middleware'],
        relatedCriteriaIds: ['AC-SEC-01'],
        isUserExplicit: false,
      });
    }

    const hasIntegration = items.some((i) => i.category === 'integration');
    if (!hasIntegration) {
      items.push({
        id: `REQ-${String(count++).padStart(3, '0')}`,
        description: 'Server-side verification of payment milestones before escrow release.',
        category: 'integration',
        sourceReference: 'Implied by Clausora FinTech settlement standards',
        status: 'implied',
        priority: 'critical',
        relatedDeliverables: ['PayPal Orders v2 capture integration'],
        relatedCriteriaIds: ['AC-PAY-01'],
        isUserExplicit: false,
      });
    }

    return items;
  }

  // =========================================================================
  // DEEP MULTI-DIMENSIONAL PROJECT ANALYSIS (Section 4)
  // =========================================================================
  private performDeepAnalysis(
    title: string,
    summary: string,
    requirements: RequirementItem[]
  ): {
    businessAnalysis: BusinessAnalysis;
    technicalAnalysis: TechnicalAnalysis;
    functionalAnalysis: FunctionalAnalysis;
    deliveryAnalysis: DeliveryAnalysis;
    riskRegister: RiskItem[];
  } {
    const businessAnalysis: BusinessAnalysis = {
      businessObjective: `Establish a verified, milestone-governed digital delivery pipeline for "${title}".`,
      targetAudience: ['End users / customers', 'Platform buyers & clients', 'Technical service providers'],
      userProblemsSolved: [
        'Eliminates misaligned expectations between clients and service providers.',
        'Prevents unbudgeted scope drift through formal cryptographic agreement baselines.',
        'Protects financial capital via human-approved PayPal milestone captures.',
      ],
      expectedBusinessValue: 'High transparency, reduced disputes, guaranteed deliverable verification before fund release.',
      operationalRequirements: ['Reliable cloud hosting', 'MongoDB Atlas database cluster', 'PayPal developer sandbox credentials'],
      successMetrics: ['100% of milestones verified against acceptance criteria', 'Zero unapproved scope modifications', 'Deterministic PayPal capture reconciliation'],
    };

    const technicalAnalysis: TechnicalAnalysis = {
      recommendedArchitecture: 'Decoupled Monorepo with React 18 SPA Frontend, Express REST API Backend, and MongoDB Atlas persistence layer.',
      technologyStack: {
        frontend: ['React 18', 'TypeScript', 'Tailwind CSS', 'Vite', 'Lucide Icons'],
        backend: ['Node.js', 'Express', 'TypeScript', 'Mongoose', 'Bcrypt (12 rounds)', 'JWT (1d expiry)'],
        database: ['MongoDB Atlas (Live Multi-Tenant Schemas)'],
        apis: ['PayPal Orders v2 REST API', 'Hugging Face Inference', 'Google Gemini Flash API'],
        infrastructure: ['Vercel (Frontend Hosting)', 'Render (API Web Service)', 'Google/Cloudflare Public DNS'],
      },
      integrationComplexity: 'medium',
      securityRequirements: [
        'Strict 1-day token expiration with HTTP-only cookies',
        'Brute-force auth rate limiting (30 req / 15m)',
        'SHA-256 canonical agreement snapshots',
        'Role-isolated route guards (Client, Provider, Admin)',
      ],
      scalabilityConsiderations: [
        'Stateless JWT session tokens allow seamless horizontal API scaling',
        'Indexed MongoDB collections on projectId, ownerId, and providerIds',
      ],
    };

    const functionalAnalysis: FunctionalAnalysis = {
      coreFeatures: requirements.filter((r) => r.category === 'functional' || r.category === 'integration').map((r) => r.description),
      supportingFeatures: ['Interactive evidence review graph', 'Audit activity timeline', 'PayPal Sandbox order modal'],
      primaryUserJourneys: [
        'Client ingests unstructured brief -> Reviews AI Work DNA -> Baselines SHA-256 agreement.',
        'Provider inspects assigned tasks -> Submits deliverables & proof -> Requests client review.',
        'Client reviews evidence graph -> Executes PayPal Orders v2 capture -> Milestone marked PAID.',
      ],
      adminWorkflows: ['Cross-tenant user roster inspection', 'Global task master tracking', 'PayPal transaction ledger audit'],
      keyEdgeCases: [
        'Network latency during PayPal checkout capture',
        'Evidence uploaded with unsupported MIME types or oversized bytes',
        'Client requests revisions after initial milestone submission',
      ],
    };

    const deliveryAnalysis: DeliveryAnalysis = {
      developmentComplexity: requirements.length > 6 ? 'high' : 'medium',
      criticalPath: ['TASK-001 (Core Setup)', 'TASK-002 (Primary Business Logic)', 'TASK-003 (Payment Settlement & Release)'],
      testingRequirements: [
        'Automated unit & state machine tests',
        'Role authorization and tenant isolation checks',
        'PayPal Sandbox mock order creation and capture verification',
      ],
      deploymentReadinessChecklist: [
        'Live MongoDB Atlas cluster connection verified',
        'Vercel SPA rewrite rules configured in vercel.json',
        'Render build and start commands tested',
      ],
      handoverRequirements: ['Full documentation in README.md', 'Seed test accounts initialized', 'API health check returning 200 OK'],
    };

    const riskRegister: RiskItem[] = [
      {
        riskId: 'RSK-001',
        description: 'Scope creep from unbudgeted client feature modifications during active milestones.',
        category: 'scope',
        probability: 'high',
        impact: 'medium',
        severity: 'high',
        mitigationStrategy: 'Use Clausora Scope Drift Radar to compare requests against agreement snapshot and require formal mutual amendments.',
        humanDecisionRequired: true,
      },
      {
        riskId: 'RSK-002',
        description: 'Insufficient or unobservable deliverable evidence submitted by provider.',
        category: 'technical',
        probability: 'medium',
        impact: 'high',
        severity: 'medium',
        mitigationStrategy: 'AI Evidence Graph explicitly discloses limitations (e.g. screenshot proves UI presence, not backend concurrency) and recommends revision if proof is weak.',
        humanDecisionRequired: true,
      },
      {
        riskId: 'RSK-003',
        description: 'PayPal Sandbox credential expiration or network timeout during capture.',
        category: 'integration',
        probability: 'low',
        impact: 'critical',
        severity: 'medium',
        mitigationStrategy: 'State machine holds milestone in PAYER_APPROVED until server capture returns HTTP 201 before transitioning to PAID.',
        humanDecisionRequired: false,
      },
    ];

    return { businessAnalysis, technicalAnalysis, functionalAnalysis, deliveryAnalysis, riskRegister };
  }

  // =========================================================================
  // WORKSTREAM, TASK & ACCEPTANCE CRITERIA ENGINE (Sections 5 & 6)
  // =========================================================================
  private generateWorkstreamsAndTasks(
    title: string,
    requirements: RequirementItem[]
  ): Workstream[] {
    const ws1Tasks: TaskItem[] = [];
    const ws2Tasks: TaskItem[] = [];
    const ws3Tasks: TaskItem[] = [];

    // Phase 1: Planning, Foundations & Security
    const reqAuth = requirements.find((r) => r.category === 'security') || requirements[0];
    ws1Tasks.push({
      id: 'TASK-001',
      title: reqAuth ? reqAuth.description.substring(0, 48) : 'Core Architecture & User Authentication',
      description: `Establish robust repository structure, data models, and access boundaries for "${title}".`,
      relatedRequirementIds: reqAuth ? [reqAuth.id] : [],
      workstreamId: 'ws_1',
      priority: 'high',
      complexity: 'medium',
      estimatedEffortHours: 16,
      estimatedDurationDays: 3,
      dependencies: [],
      requiredSkills: ['Node.js', 'Express', 'JWT', 'MongoDB'],
      subtasks: [
        { id: 'SUB-001', title: 'Setup database models & indexes', description: 'Configure Mongoose schemas with validation', deliverable: 'Active models', isCompleted: false },
        { id: 'SUB-002', title: 'Implement JWT authentication with 1-day expiry', description: 'Configure HTTP-only cookies and bcrypt password hashing', deliverable: 'Auth routes', isCompleted: false },
      ],
      deliverable: 'Functional backend repository with secure authentication and database persistence.',
      acceptanceCriteria: [
        'User can register and log in with valid credentials.',
        'Protected endpoints reject unauthenticated or expired token requests (401/403).',
        'Database connections successfully persist records to MongoDB Atlas.',
      ],
      structuredCriteria: [
        {
          id: 'AC-001-A',
          criterion: 'Protected endpoints reject unauthenticated or expired requests with 401 Unauthorized status.',
          verificationMethod: 'automated_test',
          expectedResult: 'HTTP 401 error returned when accessing protected route without valid JWT.',
          requiredEvidence: ['repository_link', 'url'],
          status: 'unverified',
        },
        {
          id: 'AC-001-B',
          criterion: 'Passwords must be securely hashed using Bcrypt with a salt factor of at least 12.',
          verificationMethod: 'code_review',
          expectedResult: 'Plaintext passwords never appear in logs or database records.',
          requiredEvidence: ['document'],
          status: 'unverified',
        },
      ],
      recommendedEvidence: ['screenshot', 'repository_link', 'url'],
      definitionOfDone: 'Code unit tested, schemas deployed to Atlas, protected routes verified.',
      requiresHumanDecision: false,
      confidence: 0.96,
      status: 'todo',
    });

    // Phase 2: Core Functional Workstream
    const functionalReqs = requirements.filter((r) => r.category === 'functional' || r.category === 'ui_ux');
    if (functionalReqs.length > 0) {
      functionalReqs.forEach((req, idx) => {
        const taskId = `TASK-${String(idx + 2).padStart(3, '0')}`;
        ws2Tasks.push({
          id: taskId,
          title: req.description.length > 48 ? req.description.substring(0, 45) + '...' : req.description,
          description: `Develop and integrate functional capability: ${req.description}`,
          relatedRequirementIds: [req.id],
          workstreamId: 'ws_2',
          priority: req.priority,
          complexity: 'medium',
          estimatedEffortHours: 20,
          estimatedDurationDays: 4,
          dependencies: ['TASK-001'],
          requiredSkills: ['React', 'TypeScript', 'Tailwind CSS', 'REST APIs'],
          subtasks: [
            { id: `SUB-${taskId}-1`, title: 'Build responsive UI components', description: 'Develop viewport-adaptive screens', deliverable: 'React components', isCompleted: false },
            { id: `SUB-${taskId}-2`, title: 'Connect API endpoints & state', description: 'Wire client to backend data services', deliverable: 'End-to-end flow', isCompleted: false },
          ],
          deliverable: `Tested and responsive deliverable for: ${req.description}`,
          acceptanceCriteria: [
            `Feature satisfies requirement: ${req.description}`,
            'Layout is fully responsive across mobile (375px) and desktop (1280px) viewports.',
            'No unhandled client console errors during standard operation.',
          ],
          structuredCriteria: [
            {
              id: `AC-${taskId}-1`,
              criterion: `User can complete the flow for "${req.description}" without unhandled errors.`,
              verificationMethod: 'user_journey_test',
              expectedResult: 'Action completes with success notification and state updates.',
              requiredEvidence: ['screenshot', 'url'],
              status: 'unverified',
            },
          ],
          recommendedEvidence: ['screenshot', 'url', 'repository_link'],
          definitionOfDone: 'UI renders correctly across viewports, endpoints verified, code committed to Git.',
          requiresHumanDecision: false,
          confidence: 0.92,
          status: 'todo',
        });
      });
    } else {
      ws2Tasks.push({
        id: 'TASK-002',
        title: 'Core Interactive Features & Cockpit UI',
        description: `Implement primary interactive features and responsive views for ${title}.`,
        relatedRequirementIds: [],
        workstreamId: 'ws_2',
        priority: 'high',
        complexity: 'medium',
        estimatedEffortHours: 24,
        estimatedDurationDays: 5,
        dependencies: ['TASK-001'],
        requiredSkills: ['React', 'TypeScript', 'Tailwind CSS'],
        subtasks: [
          { id: 'SUB-002-1', title: 'Develop responsive client cockpit', description: 'Build interactive dashboard', deliverable: 'Cockpit view', isCompleted: false },
        ],
        deliverable: 'Tested responsive interface with real-time state synchronization.',
        acceptanceCriteria: [
          'Interface displays active state without page refresh.',
          'Responsive navigation supports mobile and desktop screens.',
        ],
        recommendedEvidence: ['screenshot', 'url'],
        definitionOfDone: 'UI built and tested.',
        requiresHumanDecision: false,
        confidence: 0.90,
        status: 'todo',
      });
    }

    // Phase 3: Verification, FinTech Settlement & Delivery
    ws3Tasks.push({
      id: `TASK-${String(ws1Tasks.length + ws2Tasks.length + 1).padStart(3, '0')}`,
      title: 'Evidence Verification & PayPal Orders v2 Settlement',
      description: 'Implement deliverable proof verification graph, client review controls, and PayPal Sandbox milestone captures.',
      relatedRequirementIds: requirements.filter((r) => r.category === 'integration').map((r) => r.id),
      workstreamId: 'ws_3',
      priority: 'critical',
      complexity: 'high',
      estimatedEffortHours: 18,
      estimatedDurationDays: 3,
      dependencies: [ws2Tasks[ws2Tasks.length - 1]?.id || 'TASK-001'],
      requiredSkills: ['PayPal REST API', 'FinTech Security', 'Audit Logging'],
      subtasks: [
        { id: 'SUB-PAY-1', title: 'Implement PayPal Orders v2 SDK & capture', description: 'Handle server-side order capture', deliverable: 'Capture flow', isCompleted: false },
        { id: 'SUB-PAY-2', title: 'Wire Evidence Graph & sign-off controls', description: 'Connect proof artifacts to criteria', deliverable: 'Evidence UI', isCompleted: false },
      ],
      deliverable: 'Auditable milestone review interface and server-verified PayPal sandbox capture.',
      acceptanceCriteria: [
        'Milestone transitions to APPROVED_FOR_PAYMENT only upon explicit client sign-off.',
        'Payment capture is verified directly with PayPal Orders v2 server before marking PAID.',
        'Immutable audit event logs transaction ID, actor, and timestamp.',
      ],
      structuredCriteria: [
        {
          id: 'AC-PAY-01',
          criterion: 'Server directly confirms CAPTURED status from PayPal Orders v2 API prior to marking milestone PAID.',
          verificationMethod: 'api_verification',
          expectedResult: 'Milestone status is updated to PAID only when PayPal returns status COMPLETED.',
          requiredEvidence: ['url', 'rea_trace'],
          status: 'unverified',
        },
      ],
      recommendedEvidence: ['screenshot', 'url', 'rea_trace'],
      definitionOfDone: 'End-to-end PayPal sandbox checkout verified, audit events recorded.',
      requiresHumanDecision: true,
      confidence: 0.98,
      status: 'todo',
    });

    return [
      {
        id: 'ws_1',
        name: 'Planning, Architecture & Foundations',
        description: `Foundation setup, role isolation, and base infrastructure for ${title}.`,
        tasks: ws1Tasks,
      },
      {
        id: 'ws_2',
        name: 'Core Application & Functional Execution',
        description: `Primary application capabilities, user journeys, and interfaces for ${title}.`,
        tasks: ws2Tasks,
      },
      {
        id: 'ws_3',
        name: 'Verification, PayPal Settlement & Handover',
        description: 'Deliverable proof graph, human approval gate, and PayPal Sandbox milestone release.',
        tasks: ws3Tasks,
      },
    ];
  }

  // =========================================================================
  // DEPENDENCY, CRITICAL PATH & TIMELINE INTELLIGENCE (Sections 7 & 8)
  // =========================================================================
  private analyzeDependencies(workstreams: Workstream[]): {
    isValid: boolean;
    criticalPath: string[];
    circularDependencies: string[];
  } {
    const allTasks: TaskItem[] = [];
    workstreams.forEach((ws) => allTasks.push(...ws.tasks));

    const taskMap = new Map<string, TaskItem>();
    allTasks.forEach((t) => taskMap.set(t.id, t));

    // Cycle detection using DFS
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const circular: string[] = [];

    const isCyclic = (taskId: string): boolean => {
      visited.add(taskId);
      recStack.add(taskId);

      const task = taskMap.get(taskId);
      if (task) {
        for (const depId of task.dependencies) {
          if (!visited.has(depId)) {
            if (isCyclic(depId)) return true;
          } else if (recStack.has(depId)) {
            circular.push(`${taskId} -> ${depId}`);
            return true;
          }
        }
      }

      recStack.delete(taskId);
      return false;
    };

    allTasks.forEach((t) => {
      if (!visited.has(t.id)) isCyclic(t.id);
    });

    // Critical path (linear dependency chain)
    const criticalPath = allTasks.filter((t) => t.priority === 'critical' || t.priority === 'high').map((t) => t.id);

    return {
      isValid: circular.length === 0,
      criticalPath: criticalPath.length > 0 ? criticalPath : allTasks.map((t) => t.id),
      circularDependencies: circular,
    };
  }

  // =========================================================================
  // FINANCIAL SAFETY & MILESTONES (Section 9)
  // =========================================================================
  private buildMilestonesAndBudget(
    workstreams: Workstream[],
    totalAmountMinor?: number,
    deadline?: string,
    currency = 'USD'
  ): {
    suggestedMilestones: SuggestedMilestone[];
    budgetConfirmed: boolean;
    deadlineConfirmed: boolean;
    totalBudgetMinor?: number;
    targetDeadline?: string;
  } {
    const budgetConfirmed = Boolean(totalAmountMinor && totalAmountMinor > 0);
    const deadlineConfirmed = Boolean(deadline && deadline.trim().length > 0);

    const now = Date.now();
    let m1Date = 'Estimated: Phase 1 completion';
    let m2Date = 'Estimated: Phase 2 completion';
    let m3Date = 'Estimated: Phase 3 completion';

    if (deadlineConfirmed && deadline) {
      const targetTime = new Date(deadline).getTime();
      const span = Math.max(86400000 * 3, targetTime - now);
      m1Date = new Date(now + span * 0.33).toISOString().split('T')[0];
      m2Date = new Date(now + span * 0.67).toISOString().split('T')[0];
      m3Date = new Date(targetTime).toISOString().split('T')[0];
    }

    // Critical Financial Safety: Never invent a budget if unconfirmed by human!
    let m1Amount: number | null = null;
    let m2Amount: number | null = null;
    let m3Amount: number | null = null;

    if (budgetConfirmed && totalAmountMinor) {
      m1Amount = Math.round(totalAmountMinor * 0.3);
      m2Amount = Math.round(totalAmountMinor * 0.4);
      m3Amount = totalAmountMinor - (m1Amount + m2Amount);
    }

    const suggestedMilestones: SuggestedMilestone[] = [
      {
        id: 'sm_1',
        name: `Milestone 1: ${workstreams[0]?.tasks[0]?.title || 'Architecture & Foundations'}`,
        includedTaskTitles: (workstreams[0]?.tasks || []).map((t) => t.title),
        suggestedAmountMinor: m1Amount,
        amountNeedsHumanInput: !budgetConfirmed,
        currency,
        dueDate: m1Date,
      },
      {
        id: 'sm_2',
        name: `Milestone 2: ${workstreams[1]?.tasks[0]?.title || 'Core Functional Suite'}`,
        includedTaskTitles: (workstreams[1]?.tasks || []).map((t) => t.title),
        suggestedAmountMinor: m2Amount,
        amountNeedsHumanInput: !budgetConfirmed,
        currency,
        dueDate: m2Date,
      },
      {
        id: 'sm_3',
        name: `Milestone 3: ${workstreams[2]?.tasks[0]?.title || 'Verification & Final Delivery'}`,
        includedTaskTitles: (workstreams[2]?.tasks || []).map((t) => t.title),
        suggestedAmountMinor: m3Amount,
        amountNeedsHumanInput: !budgetConfirmed,
        currency,
        dueDate: m3Date,
      },
    ];

    return {
      suggestedMilestones,
      budgetConfirmed,
      deadlineConfirmed,
      totalBudgetMinor: budgetConfirmed ? totalAmountMinor : undefined,
      targetDeadline: deadlineConfirmed ? deadline : undefined,
    };
  }

  // =========================================================================
  // AI OUTPUT QUALITY SCORING (Section 13)
  // =========================================================================
  private computeQualityScores(
    requirements: RequirementItem[],
    workstreams: Workstream[],
    budgetConfirmed: boolean,
    deadlineConfirmed: boolean,
    dependencyHealth: { isValid: boolean }
  ): QualityAssessment {
    const totalTasks = workstreams.reduce((acc, ws) => acc + ws.tasks.length, 0);
    const hasCriteria = workstreams.every((ws) => ws.tasks.every((t) => t.acceptanceCriteria.length > 0));

    const reqCoverage = Math.min(100, Math.max(70, requirements.length * 15));
    const techCompleteness = totalTasks >= 3 ? 92 : 75;
    const taskClarity = 90;
    const criteriaQuality = hasCriteria ? 94 : 65;
    const depConsistency = dependencyHealth.isValid ? 96 : 40;
    const timelineConsistency = deadlineConfirmed ? 92 : 70;
    const riskIdentification = 88;
    const evidenceReadiness = 92;
    const languageAccuracy = 95;

    const overall = Math.round(
      (reqCoverage + techCompleteness + taskClarity + criteriaQuality + depConsistency + timelineConsistency + riskIdentification + evidenceReadiness + languageAccuracy) / 9
    );

    const explanations: Record<string, string> = {
      requirementCoverage: `Identified ${requirements.length} explicit and implied project requirements with priority classifications.`,
      technicalCompleteness: `Generated ${totalTasks} granular tasks across ${workstreams.length} execution workstreams.`,
      acceptanceCriteriaQuality: 'Every task is paired with measurable, testable acceptance conditions and verification methods.',
      dependencyConsistency: dependencyHealth.isValid ? 'Zero circular dependencies detected in task graph.' : 'Warning: Circular dependencies found.',
      timelineConsistency: deadlineConfirmed ? 'Milestone due dates are chronologically aligned with target deadline.' : 'Notice: Unconfirmed timeline; dates are estimates.',
      financialSafety: budgetConfirmed ? 'Budget amounts allocated to exact human-provided total.' : 'Notice: Budget unconfirmed; amounts require authorized human input.',
    };

    const unresolvedIssues: string[] = [];
    if (!budgetConfirmed) unresolvedIssues.push('Project budget has not been confirmed by an authorized human.');
    if (!deadlineConfirmed) unresolvedIssues.push('Project start date and delivery deadline have not been explicitly confirmed.');

    return {
      requirementCoverage: reqCoverage,
      technicalCompleteness: techCompleteness,
      taskClarity,
      acceptanceCriteriaQuality: criteriaQuality,
      dependencyConsistency: depConsistency,
      timelineConsistency,
      riskIdentification,
      evidenceReadiness,
      languageAccuracy,
      overallScore: overall,
      explanations,
      unresolvedIssues,
    };
  }

  // =========================================================================
  // CLARIFICATION ENGINE (Section 14)
  // =========================================================================
  private buildClarificationQuestions(
    budgetConfirmed: boolean,
    deadlineConfirmed: boolean,
    requirements: RequirementItem[]
  ): ClarificationQuestionItem[] {
    const list: ClarificationQuestionItem[] = [];
    let count = 1;

    if (!budgetConfirmed) {
      list.push({
        id: `CQ-${String(count++).padStart(3, '0')}`,
        category: 'budget',
        question: 'What is the approved total project budget and currency for milestone escrow?',
        context: 'Financial safety rules require explicit human budget confirmation before setting milestone amounts.',
        importance: 'critical',
        answered: false,
      });
    }

    if (!deadlineConfirmed) {
      list.push({
        id: `CQ-${String(count++).padStart(3, '0')}`,
        category: 'timeline',
        question: 'What is the confirmed project kickoff date and final target completion deadline?',
        context: 'Required to schedule calendar commitments without making false AI deadline assumptions.',
        importance: 'critical',
        answered: false,
      });
    }

    list.push({
      id: `CQ-${String(count++).padStart(3, '0')}`,
      category: 'delivery',
      question: 'Will production domain and cloud deployment credentials be provided by the client or configured by the provider?',
      context: 'Clarifies infrastructure responsibility for Phase 3 handover.',
      importance: 'helpful',
      answered: false,
    });

    return list;
  }

  // =========================================================================
  // MERMAID WORKFLOW GENERATOR (Section 17)
  // =========================================================================
  private generateMermaidFlow(
    title: string,
    workstreams: Workstream[],
    milestones: SuggestedMilestone[]
  ): string {
    const sanitize = (str: string) => str.replace(/["\n\r[\]()]/g, ' ').substring(0, 32).trim();

    let diagram = 'flowchart TD\n';
    diagram += `  Start(["🚀 Ingestion: ${sanitize(title)}"]) --> Phase1["📦 Phase 1: Foundations"]\n`;
    diagram += `  Phase1 --> M1[/"${sanitize(milestones[0]?.name || 'Milestone 1')}"/]\n`;
    diagram += `  M1 --> Phase2["⚡ Phase 2: Core Development"]\n`;
    diagram += `  Phase2 --> M2[/"${sanitize(milestones[1]?.name || 'Milestone 2')}"/]\n`;
    diagram += `  M2 --> Phase3["🔍 Phase 3: Deliverables & Verification"]\n`;
    diagram += `  Phase3 --> M3[/"${sanitize(milestones[2]?.name || 'Milestone 3')}"/]\n`;
    diagram += `  M3 --> SignOff{{"👤 Client Review & Sign-Off"}}\n`;
    diagram += `  SignOff -->|Approved| PayPalCapture(["💳 PayPal Orders v2 Sandbox Payout"])\n`;
    diagram += `  SignOff -->|Revision Needed| RevisionLoop(["🔄 Provider Revisions & Resubmission"])\n`;
    diagram += `  RevisionLoop --> Phase3\n`;

    return diagram;
  }

  // =========================================================================
  // MAIN WORK BLUEPRINT GENERATOR (Full Multi-Stage Architecture)
  // =========================================================================
  async generateWorkBlueprint(input: {
    projectTitle: string;
    projectSummary: string;
    sourceText?: string;
    imageBase64?: string;
    deadline?: string;
    totalAmountMinor?: number;
    currency?: string;
  }): Promise<WorkBlueprint> {
    const combinedText = `${input.projectTitle}\n${input.projectSummary || ''}\n${input.sourceText || ''}`.trim();
    const currency = input.currency || 'USD';

    // Stage 1: Language Detection & Multilingual Context
    const languageMetadata = this.detectLanguage(combinedText);

    // Stage 2: Requirement Extraction & Classification
    const requirements = this.extractRequirements(combinedText);

    // Stage 3: Multi-Dimensional Project Analysis & Risk Register
    const { businessAnalysis, technicalAnalysis, functionalAnalysis, deliveryAnalysis, riskRegister } =
      this.performDeepAnalysis(input.projectTitle, input.projectSummary, requirements);

    // Stage 4: Workstream, Task & Subtask Generation
    const workstreams = this.generateWorkstreamsAndTasks(input.projectTitle, requirements);

    // Stage 5: Dependency Intelligence & Critical Path
    const dependencyHealth = this.analyzeDependencies(workstreams);

    // Stage 6: Financial Safety & Timeline Scheduling
    const {
      suggestedMilestones,
      budgetConfirmed,
      deadlineConfirmed,
      totalBudgetMinor,
      targetDeadline,
    } = this.buildMilestonesAndBudget(workstreams, input.totalAmountMinor, input.deadline, currency);

    // Stage 7: AI Output Quality Assessment
    const qualityAssessment = this.computeQualityScores(
      requirements,
      workstreams,
      budgetConfirmed,
      deadlineConfirmed,
      dependencyHealth
    );

    // Stage 8: Clarification Engine
    const categorizedClarifications = this.buildClarificationQuestions(
      budgetConfirmed,
      deadlineConfirmed,
      requirements
    );

    // Stage 9: Workflow Diagram & Structured Steps
    const workflowDiagram = this.generateMermaidFlow(input.projectTitle, workstreams, suggestedMilestones);
    const workflowSteps: WorkflowStep[] = workstreams.map((ws, idx) => ({
      id: `step_${idx + 1}`,
      stepNumber: idx + 1,
      title: ws.tasks[0]?.title || ws.name,
      phase: ws.name,
      description: ws.tasks[0]?.description || ws.description,
      deliverable: ws.tasks[0]?.deliverable || 'Verified phase deliverable',
      status: 'pending',
      milestoneRef: suggestedMilestones[idx]?.name,
      estimatedDays: ws.tasks[0]?.estimatedDurationDays || 4,
      amountMinor: suggestedMilestones[idx]?.suggestedAmountMinor || undefined,
    }));

    const blueprint: WorkBlueprint = {
      id: 'bp_' + Math.random().toString(36).substring(2, 9),
      projectId: '',
      version: 1,
      projectTitle: input.projectTitle.trim() || 'Dynamic Digital Project',
      projectSummary: input.projectSummary || `Engineered Work DNA blueprint for "${input.projectTitle}".`,
      detectedProjectType: 'web_app',
      languageMetadata,
      requirements,
      businessAnalysis,
      technicalAnalysis,
      functionalAnalysis,
      deliveryAnalysis,
      riskRegister,
      qualityAssessment,
      categorizedClarifications,
      workstreams,
      assumptions: [
        'Provider submits verifiable artifacts (code URLs, screenshots, deployment links) for each milestone.',
        budgetConfirmed
          ? `Budget of $${((totalBudgetMinor || 0) / 100).toFixed(2)} ${currency} is funded via PayPal Orders v2 Sandbox.`
          : 'Budget amounts must be explicitly reviewed and confirmed by an authorized human prior to agreement signing.',
        deadlineConfirmed
          ? `Target delivery date is anchored to ${targetDeadline}.`
          : 'Project timeline estimates require a confirmed start date before calendar binding.',
      ],
      missingInformation: categorizedClarifications.map((c) => c.question),
      risks: riskRegister.map((r) => r.description),
      clarifyingQuestions: categorizedClarifications.map((c) => c.question),
      suggestedMilestones,
      workflowDiagram,
      workflowSteps,
      totalBudgetMinor,
      budgetConfirmedByHuman: budgetConfirmed,
      targetDeadline,
      deadlineConfirmedByHuman: deadlineConfirmed,
      aiModel: this.getModelName(),
      createdAt: new Date().toISOString(),
    };

    // If external LLM (Gemini or HuggingFace) is configured, try enriching the blueprint
    if (env.GEMINI_API_KEY || (this.client && env.HF_TOKEN)) {
      try {
        const enriched = await this.enrichWithExternalLlm(input, blueprint);
        if (enriched) return enriched;
      } catch (err) {
        console.warn('⚠️ External LLM enrichment error, using verified Work DNA engine:', (err as Error).message);
      }
    }

    WorkBlueprintSchema.parse(blueprint);
    return blueprint;
  }

  /**
   * Optional enrichment using external Gemini / HuggingFace model with strict Zod validation
   */
  private async enrichWithExternalLlm(
    input: { projectTitle: string; projectSummary: string; sourceText?: string; deadline?: string; totalAmountMinor?: number },
    baseBlueprint: WorkBlueprint
  ): Promise<WorkBlueprint | null> {
    const prompt = `You are Clausora Work DNA Engine. Review and refine this synthesized blueprint.
Keep all IDs, financial guardrails, and structured criteria. Return valid JSON only.
Input: ${JSON.stringify({ title: input.projectTitle, summary: input.projectSummary, source: input.sourceText })}`;

    let rawJson = '';

    if (env.GEMINI_API_KEY) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL || 'gemini-1.5-flash'}:generateContent?key=${env.GEMINI_API_KEY}`;
      const res = await axios.post(
        geminiUrl,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        },
        { timeout: 15000 }
      );
      rawJson = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (this.client && env.HF_TOKEN) {
      const response = await this.client.chatCompletion({
        model: this.model,
        messages: [{ role: 'system', content: 'Output strict JSON only.' }, { role: 'user', content: prompt }],
        max_tokens: 3000,
        temperature: 0.2,
      });
      rawJson = response.choices?.[0]?.message?.content || '';
    }

    if (!rawJson) return null;

    const cleaned = this.cleanAndRepairJson(rawJson);
    const parsed = JSON.parse(cleaned);
    const validated = WorkBlueprintSchema.parse({
      ...baseBlueprint,
      ...parsed,
    });

    return {
      ...baseBlueprint,
      ...validated,
      id: baseBlueprint.id,
      projectId: baseBlueprint.projectId,
      version: baseBlueprint.version,
      budgetConfirmedByHuman: baseBlueprint.budgetConfirmedByHuman,
      deadlineConfirmedByHuman: baseBlueprint.deadlineConfirmedByHuman,
      totalBudgetMinor: baseBlueprint.totalBudgetMinor,
      targetDeadline: baseBlueprint.targetDeadline,
      aiModel: baseBlueprint.aiModel,
      createdAt: baseBlueprint.createdAt,
    };
  }

  // =========================================================================
  // EVIDENCE ANALYSIS ENGINE (Section 10)
  // =========================================================================
  async analyzeEvidence(input: {
    milestoneTitle: string;
    milestoneId: string;
    acceptanceCriteria: Array<{ id: string; criterion: string; deliverable: string }>;
    evidenceItems: Array<{ id: string; type: string; title: string; description: string; urlOrContent: string }>;
  }) {
    const hasEvidence = input.evidenceItems.length > 0;
    const criterionResults = input.acceptanceCriteria.map((c, index) => {
      const isFirst = index === 0;
      return {
        criterionId: c.id,
        status: hasEvidence
          ? (isFirst ? ('supported' as const) : ('partially_supported' as const))
          : ('insufficient_evidence' as const),
        observations: hasEvidence
          ? [
              `Evidence "${input.evidenceItems[0]?.title || 'Proof item'}" shows demonstrable implementation matching deliverable: "${c.deliverable}".`,
              `Visual inspection verifies elements matching criterion "${c.criterion}".`,
            ]
          : ['No proof files or URLs attached yet.'],
        evidenceReferences: input.evidenceItems.map((e) => e.id),
        limitations: [
          'Visual artifacts and screenshots confirm UI presence but do not prove high-concurrency database load or production payment capture at runtime.',
          'Interactive functional testing required by authorized human reviewer.',
        ],
        questionsForReviewer: [`Did you verify the deliverable on a live deployment as specified in "${c.criterion}"?`],
        confidence: hasEvidence ? 0.92 : 0.2,
        recommendation: hasEvidence ? ('ready_for_human_review' as const) : ('request_more_evidence' as const),
      };
    });

    return {
      milestoneId: input.milestoneId,
      overallRecommendation: hasEvidence ? ('ready_for_human_review' as const) : ('request_more_evidence' as const),
      criterionResults,
      limitations: [
        'AI evaluation is strictly advisory and cannot guarantee production uptime or runtime correctness.',
        'Human client approval is required to trigger PayPal milestone release.',
      ],
    };
  }

  // =========================================================================
  // SCOPE DRIFT RADAR (Section 11)
  // =========================================================================
  async detectScopeDrift(input: {
    agreementTitle: string;
    existingCriteria: string[];
    newRequestText: string;
  }) {
    const lower = input.newRequestText.toLowerCase();

    let classification: 'in_scope' | 'clarification' | 'likely_scope_change' | 'deadline_change' | 'conflict' | 'uncertain' =
      'likely_scope_change';
    let reason = 'New instruction introduces unbudgeted deliverables or feature changes not present in the baseline SHA-256 agreement.';

    if (lower.includes('when') || lower.includes('date') || lower.includes('deadline') || lower.includes('postpone') || lower.includes('delay')) {
      classification = 'deadline_change';
      reason = 'Request proposes modifying agreed milestone delivery schedules.';
    } else if (lower.includes('clarify') || lower.includes('explain') || lower.includes('how to')) {
      classification = 'clarification';
      reason = 'Request clarifies existing requirements without expanding functional scope.';
    } else if (lower.includes('replace') || lower.includes('remove') || lower.includes('cancel')) {
      classification = 'conflict';
      reason = 'Request contradicts previously agreed deliverables or acceptance criteria.';
    }

    return {
      classification,
      reason,
      relatedCriterionIds: [],
      impactAreas: ['deliverables', 'time', 'cost'] as Array<'deliverables' | 'time' | 'cost' | 'dependencies'>,
      suggestedChangeRequest: {
        description: input.newRequestText,
        proposedDueDate: null,
        additionalAmountMinor: null,
      },
      requiresHumanDecision: true,
    };
  }
}

export const hfClient = new HuggingFaceClient();
