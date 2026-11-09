import bcrypt from 'bcryptjs';
import { dbStore } from './database/store';
import { DEMO_USERS, computeSha256, canonicalStringify } from '@clausora/shared';

export async function seedDemoData() {
  console.log('🌱 Seeding demo accounts and hackathon walkthrough project...');

  // 1. Seed Users
  const clientPassHash = await bcrypt.hash(DEMO_USERS.CLIENT.password, 10);
  const providerPassHash = await bcrypt.hash(DEMO_USERS.PROVIDER.password, 10);
  const judgePassHash = await bcrypt.hash(DEMO_USERS.JUDGE.password, 10);
  const adminPassHash = await bcrypt.hash(DEMO_USERS.ADMIN.password, 10);

  const clientUser = {
    id: 'usr_client_demo',
    name: DEMO_USERS.CLIENT.name,
    email: DEMO_USERS.CLIENT.email,
    role: DEMO_USERS.CLIENT.role,
    passwordHash: clientPassHash,
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  };

  const providerUser = {
    id: 'usr_provider_demo',
    name: DEMO_USERS.PROVIDER.name,
    email: DEMO_USERS.PROVIDER.email,
    role: DEMO_USERS.PROVIDER.role,
    passwordHash: providerPassHash,
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  };

  const judgeUser = {
    id: 'usr_judge_demo',
    name: DEMO_USERS.JUDGE.name,
    email: DEMO_USERS.JUDGE.email,
    role: DEMO_USERS.JUDGE.role,
    passwordHash: judgePassHash,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  };

  const adminUser = {
    id: 'usr_admin_demo',
    name: DEMO_USERS.ADMIN.name,
    email: DEMO_USERS.ADMIN.email,
    role: DEMO_USERS.ADMIN.role,
    passwordHash: adminPassHash,
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  };

  dbStore.users.set(clientUser.id, clientUser);
  dbStore.users.set(providerUser.id, providerUser);
  dbStore.users.set(judgeUser.id, judgeUser);
  dbStore.users.set(adminUser.id, adminUser);

  // 2. Seed Project
  const projectId = 'proj_hackathon_demo';
  const project = {
    id: projectId,
    title: 'Acme Booking Engine & Customer Portal',
    description: 'Build a responsive booking website with customer login, service catalog, calendar scheduling, admin management, and human-approved PayPal milestone payments.',
    ownerId: clientUser.id,
    providerIds: [providerUser.id],
    status: 'active' as const,
    sourceAssets: ['asset_demo_brief'],
    currentAgreementId: 'agr_demo_v1',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  dbStore.projects.set(projectId, project);

  // 3. Seed Source Asset
  dbStore.sourceAssets.set('asset_demo_brief', {
    id: 'asset_demo_brief',
    projectId,
    uploadedBy: clientUser.id,
    type: 'document',
    name: 'Acme_Booking_Portal_Brief_v1.pdf',
    urlOrKey: 'uploads/acme_brief.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 245000,
    sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    extractedText: 'Project Scope: Responsive booking platform with client authorization, calendar sync, and PayPal milestone releases upon verification.',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  });

  // 4. Seed Work Blueprint
  const blueprint = {
    id: 'bp_demo_1',
    projectId,
    version: 1,
    projectTitle: project.title,
    projectSummary: project.description,
    detectedProjectType: 'web_app' as const,
    workstreams: [
      {
        id: 'ws_1',
        name: 'Authentication & Data Architecture',
        description: 'Secure JWT role verification, database models, and REST endpoints.',
        tasks: [
          {
            id: 'task_1',
            title: 'Role-Based Authentication & Route Protection',
            description: 'Implement login and registration supporting Client and Provider personas.',
            priority: 'high' as const,
            dependencies: [],
            deliverable: 'JWT auth endpoints with session tokens.',
            acceptanceCriteria: [
              'Client and Provider personas authenticate with email/password.',
              'Unauthorized requests receive 401 response.',
            ],
            recommendedEvidence: ['screenshot' as const, 'repository_link' as const],
            confidence: 0.95,
            status: 'done' as const,
          },
        ],
      },
      {
        id: 'ws_2',
        name: 'Milestone Execution & Evidence Verification',
        description: 'Evidence Graph mapping and AI limitation reviews.',
        tasks: [
          {
            id: 'task_2',
            title: 'Evidence Review & PayPal Sandbox Integration',
            description: 'Map visual proof to criteria and release payment through PayPal Sandbox.',
            priority: 'high' as const,
            dependencies: ['task_1'],
            deliverable: 'Tested PayPal Orders v2 sandbox checkout with backend capture.',
            acceptanceCriteria: [
              'Server creates PayPal order with minor units (cents).',
              'Payment captured verified server-side before milestone changes to PAID.',
              'Immutable audit log generated for each transition.',
            ],
            recommendedEvidence: ['screenshot' as const, 'rea_trace' as const],
            confidence: 0.96,
            status: 'in_progress' as const,
          },
        ],
      },
    ],
    assumptions: [
      'Provider delivers demonstrable screenshots or code repository links prior to milestone approval.',
      'All test payments run via PayPal Sandbox developer environment.',
    ],
    missingInformation: ['Specific custom webhook URL endpoints if running behind firewalls.'],
    risks: ['Scope drift caused by unstructured client change requests.'],
    clarifyingQuestions: ['Is multi-currency auto-conversion needed for international providers?'],
    suggestedMilestones: [
      {
        id: 'sm_1',
        name: 'Milestone 1: Foundation & Authentication UI',
        includedTaskTitles: ['Role-Based Authentication & Route Protection'],
        suggestedAmountMinor: 40000,
        amountNeedsHumanInput: false,
        currency: 'USD',
        dueDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
      },
      {
        id: 'sm_2',
        name: 'Milestone 2: Evidence Verification & PayPal Sandbox Release',
        includedTaskTitles: ['Evidence Review & PayPal Sandbox Integration'],
        suggestedAmountMinor: 60000,
        amountNeedsHumanInput: false,
        currency: 'USD',
        dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      },
    ],
    aiModel: 'Qwen/Qwen2.5-VL-7B-Instruct',
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  };
  dbStore.blueprints.set(blueprint.id, blueprint);

  // 5. Seed Agreement & SHA-256 Fingerprint
  const snapshot = {
    projectTitle: blueprint.projectTitle,
    projectSummary: blueprint.projectSummary,
    workstreams: blueprint.workstreams,
    milestones: blueprint.suggestedMilestones,
    totalAmountMinor: 100000, // $1,000.00
    currency: 'USD',
  };
  const snapshotHash = await computeSha256(canonicalStringify(snapshot));

  const agreement = {
    id: 'agr_demo_v1',
    projectId,
    version: 1,
    canonicalSnapshot: snapshot,
    snapshotHash,
    currency: 'USD',
    totalAmountMinor: 100000,
    status: 'approved' as const,
    approvals: [
      {
        userId: clientUser.id,
        userName: clientUser.name,
        role: clientUser.role,
        decision: 'approved' as const,
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        snapshotHashSeen: snapshotHash,
      },
      {
        userId: providerUser.id,
        userName: providerUser.name,
        role: providerUser.role,
        decision: 'approved' as const,
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        snapshotHashSeen: snapshotHash,
      },
    ],
    createdBy: clientUser.id,
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    approvedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  };
  dbStore.agreements.set(agreement.id, agreement);

  // 6. Seed Milestone 1 (Completed & Paid via PayPal Sandbox)
  const ms1 = {
    id: 'ms_demo_1',
    projectId,
    agreementId: agreement.id,
    title: 'Milestone 1: Foundation & Authentication UI',
    description: 'Deliver core project structure, authentication forms, and route protection.',
    amountMinor: 40000, // $400.00
    currency: 'USD',
    dueDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    taskIds: ['task_1'],
    acceptanceCriteria: [
      {
        id: 'crit_1_1',
        criterion: 'Registration, login, and JWT middleware functioning without errors.',
        deliverable: 'Authentication Endpoints',
        status: 'supported' as const,
      },
    ],
    status: 'PAID' as const,
    approvedBy: clientUser.id,
    approvedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    paypalOrderId: 'PAYPAL_SANDBOX_ORD_883294',
    paypalCaptureId: 'CAPTURE_SANDBOX_774921',
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  };
  dbStore.milestones.set(ms1.id, ms1);

  // 7. Seed Milestone 2 (Ready for Review & PayPal Checkout Demonstration!)
  const ms2 = {
    id: 'ms_demo_2',
    projectId,
    agreementId: agreement.id,
    title: 'Milestone 2: Evidence Verification & PayPal Sandbox Release',
    description: 'Verify deliverable proof against acceptance criteria, review AI observations, and release payment.',
    amountMinor: 60000, // $600.00
    currency: 'USD',
    dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    taskIds: ['task_2'],
    acceptanceCriteria: [
      {
        id: 'crit_2_1',
        criterion: 'Interactive client evidence graph links submitted proof to criteria.',
        deliverable: 'Evidence Review Module',
        status: 'supported' as const,
      },
      {
        id: 'crit_2_2',
        criterion: 'PayPal Orders v2 sandbox checkout creates order and captures payment verified server-side.',
        deliverable: 'PayPal Sandbox Integration',
        status: 'partially_supported' as const,
      },
    ],
    status: 'AWAITING_CLIENT_DECISION' as const,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  dbStore.milestones.set(ms2.id, ms2);

  // 8. Seed Evidence for Milestone 2
  const evi1 = {
    id: 'evi_demo_1',
    projectId,
    milestoneId: ms2.id,
    taskId: 'task_2',
    uploadedBy: providerUser.id,
    type: 'image' as const,
    title: 'UI Verification Screenshot — Evidence Graph & Approval Modal',
    urlOrContent: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    description: 'Screenshot demonstrating functional Evidence Graph UI with client decision actions.',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  };
  dbStore.evidence.set(evi1.id, evi1);

  // 9. Seed AI Review for Milestone 2
  dbStore.aiReviews.set('rev_demo_2', {
    id: 'rev_demo_2',
    projectId,
    milestoneId: ms2.id,
    evidenceIds: [evi1.id],
    criterionResults: [
      {
        criterionId: 'crit_2_1',
        status: 'supported',
        observations: [
          'Evidence item "UI Verification Screenshot" exhibits responsive node mapping and interactive criteria tags.',
          'UI layout aligns with approved specification guidelines.'
        ],
        evidenceReferences: [evi1.id],
        limitations: [
          'Visual artifacts prove UI presence but do not verify edge-case error toasts or network failure recovery.'
        ],
        questionsForReviewer: [
          'Did you verify that the modal is accessible via keyboard navigation?'
        ],
        confidence: 0.94,
        recommendation: 'ready_for_human_review',
      },
      {
        criterionId: 'crit_2_2',
        status: 'partially_supported',
        observations: [
          'Order creation endpoint verified in sandbox.',
          'Pending final client approval to trigger live capture execution.'
        ],
        evidenceReferences: [evi1.id],
        limitations: [
          'Runtime payment capture can only occur after explicit human client approval.'
        ],
        questionsForReviewer: [
          'Confirm that the test milestone amount of $600.00 matches agreed deliverables.'
        ],
        confidence: 0.89,
        recommendation: 'ready_for_human_review',
      },
    ],
    overallRecommendation: 'ready_for_human_review',
    limitations: [
      'AI analysis is strictly advisory. It cannot release funds or override human client decisions.',
      'Production verification requires PayPal developer sandbox capture.'
    ],
    modelId: 'Qwen/Qwen2.5-VL-7B-Instruct',
    promptVersion: '1.0',
    rawResponseHash: 'sha_981a8b72e10c',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  });

  // 10. Seed Scope Drift Request
  dbStore.scopeChangeRequests.set('scr_demo_1', {
    id: 'scr_demo_1',
    projectId,
    baseAgreementId: agreement.id,
    incomingText: 'Can you also add multi-language support (Spanish and French) with an instant currency converter to the header?',
    classification: 'likely_scope_change',
    reason: 'The request introduces multi-language localization and live FX rate queries, which were not part of Agreement v1.',
    relatedCriterionIds: ['crit_1_1'],
    impactAreas: ['cost', 'time', 'deliverables'],
    suggestedChangeRequest: {
      description: 'Scope Amendment: Add i18n localization (ES, FR) + FX rate header widget. Estimated +$250.00 and +3 days delivery.',
      proposedDueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
      additionalAmountMinor: 25000,
    },
    requiresHumanDecision: true,
    status: 'proposed',
    createdBy: clientUser.id,
    createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
  });

  // 11. Seed Audit Timeline
  const events = [
    {
      actorId: clientUser.id,
      actorName: clientUser.name,
      actorRole: clientUser.role,
      eventType: 'PROJECT_CREATED',
      entityType: 'project',
      entityId: projectId,
      summary: 'Client created project "Acme Booking Engine & Customer Portal".',
    },
    {
      actorId: 'ai',
      actorName: 'Work DNA Engine (Qwen2.5-VL)',
      actorRole: 'ai' as const,
      eventType: 'WORK_BLUEPRINT_GENERATED',
      entityType: 'workBlueprint',
      entityId: blueprint.id,
      summary: 'Generated Work Blueprint with 2 workstreams, 2 milestones, and risk analysis.',
    },
    {
      actorId: clientUser.id,
      actorName: clientUser.name,
      actorRole: clientUser.role,
      eventType: 'AGREEMENT_APPROVED',
      entityType: 'agreement',
      entityId: agreement.id,
      summary: `Approved Agreement v1 with SHA-256 fingerprint: ${snapshotHash.substring(0, 16)}...`,
    },
    {
      actorId: clientUser.id,
      actorName: clientUser.name,
      actorRole: clientUser.role,
      eventType: 'PAYPAL_PAYMENT_CAPTURED',
      entityType: 'payment',
      entityId: 'pay_demo_1',
      summary: 'Milestone 1 captured $400.00 USD via PayPal Sandbox (Capture ID: CAPTURE_SANDBOX_774921). Marked PAID.',
    },
    {
      actorId: providerUser.id,
      actorName: providerUser.name,
      actorRole: providerUser.role,
      eventType: 'EVIDENCE_SUBMITTED',
      entityType: 'evidence',
      entityId: evi1.id,
      summary: `Submitted evidence "${evi1.title}" for Milestone 2.`,
    },
    {
      actorId: 'ai',
      actorName: 'Work DNA Evidence Reviewer',
      actorRole: 'ai' as const,
      eventType: 'AI_REVIEW_COMPLETED',
      entityType: 'aiReview',
      entityId: 'rev_demo_2',
      summary: 'AI analyzed proof against criteria (Recommendation: ready_for_human_review). Limitation disclosures generated.',
    },
  ];

  events.forEach((ev) => dbStore.addAuditEvent({ ...ev, projectId }));

  console.log('✅ Demo data successfully seeded! Ready for judges and test runs.');
}

