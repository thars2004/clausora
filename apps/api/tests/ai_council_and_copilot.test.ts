import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { hfClient } from '../src/services/ai/huggingface.client.js';

describe('Multi-Agent Review Council & Project Vault Copilot', () => {
  const milestoneId = 'ms_test_council_' + Date.now();
  const criteria = [
    { id: 'crit_1', criterion: 'Must implement OAuth2 token authentication', deliverable: 'Auth API endpoint', status: 'pending' },
    { id: 'crit_2', criterion: 'Must provide automated integration tests with 80% coverage', deliverable: 'Test suite', status: 'pending' },
  ];

  test('generates 3-agent council review with consensus verdict when evidence is submitted', async () => {
    const evidenceItems = [
      {
        id: 'evi_1',
        type: 'repository',
        title: 'OAuth2 Authentication Pull Request #12',
        description: 'Complete JWT & bcrypt authentication flow with refresh tokens',
        urlOrContent: 'https://github.com/org/repo/pull/12',
      },
    ];

    const council = await hfClient.runCouncilReview({
      milestoneId,
      milestoneTitle: 'Security & User Authentication Module',
      acceptanceCriteria: criteria,
      evidenceItems,
      projectTitle: 'AI-Powered Email Automation and Management System',
      budgetDollars: '500.00',
    });

    assert.ok(council);
    assert.equal(council.milestoneId, milestoneId);
    assert.ok(council.overallScore >= 70, 'Overall score should reflect valid evidence');
    assert.equal(council.consensusVerdict, 'VERIFIED_READY_FOR_PAYOUT');
    assert.equal(council.agents.length, 3, 'Must contain all 3 specialized agents');

    const agentRoles = council.agents.map((a) => a.agentRole);
    assert.ok(agentRoles.includes('tech_lead'), 'Must have Senior Technical Architect');
    assert.ok(agentRoles.includes('business_advocate'), 'Must have Client Business Advocate');
    assert.ok(agentRoles.includes('compliance_auditor'), 'Must have Contract Compliance Auditor');

    council.agents.forEach((agent) => {
      assert.ok(agent.score > 0);
      assert.ok(agent.summary.length > 10);
      assert.ok(agent.keyObservations.length > 0);
    });
  });

  test('blocks payout recommendations and warns when zero evidence is attached', async () => {
    const council = await hfClient.runCouncilReview({
      milestoneId: 'ms_empty_' + Date.now(),
      milestoneTitle: 'Empty Phase',
      acceptanceCriteria: criteria,
      evidenceItems: [],
      projectTitle: 'Empty Project',
    });

    assert.ok(council);
    assert.equal(council.consensusVerdict, 'EVIDENCE_INSUFFICIENT');
    assert.ok(council.overallScore < 50, 'Score should be low without evidence');
    assert.ok(council.executiveSummary.toLowerCase().includes('blocked') || council.executiveSummary.toLowerCase().includes('insufficient'));
  });

  test('project copilot answers contextually citing project parameters', async () => {
    const project = {
      id: 'proj_copilot_1',
      title: 'EduSmart AI Platform',
      status: 'active',
      totalAmountMinor: 150000,
    };

    const milestones = [
      { id: 'ms_1', title: 'Data Ingestion Pipeline', status: 'PAID', amountMinor: 50000, paidMinor: 50000 },
      { id: 'ms_2', title: 'AI Model Tuning', status: 'IN_PROGRESS', amountMinor: 100000, paidMinor: 0 },
    ];

    const payments = [
      { id: 'pay_1', status: 'COMPLETED', amountMinor: 50000 },
    ];

    const reply = await hfClient.runProjectCopilot({
      project,
      milestones,
      evidence: [],
      payments,
      userQuestion: 'How much money have I paid so far and what is remaining?',
      userRole: 'client',
      userName: 'Sarah Chen',
    });

    assert.ok(reply);
    assert.equal(reply.role, 'assistant');
    assert.ok(reply.content.length > 30);
    assert.ok(reply.content.includes('$500.00') || reply.content.includes('500'), 'Must cite paid amount');
    assert.ok(reply.suggestedActions && reply.suggestedActions.length > 0);
  });

  test('project copilot accurately answers deadline and timeline questions', async () => {
    const project = {
      id: 'proj_copilot_2',
      title: 'Smart Inventory Management System',
      status: 'active',
      deadline: '2026-11-30',
      totalAmountMinor: 250000,
      createdAt: '2026-11-01T00:00:00.000Z',
    };

    const milestones = [
      { id: 'ms_1', title: 'Architecture & Foundation', status: 'PAID', dueDate: '2026-11-10', amountMinor: 50000 },
      { id: 'ms_2', title: 'Barcode & RFID Module', status: 'IN_PROGRESS', dueDate: '2026-11-20', amountMinor: 100000 },
      { id: 'ms_3', title: 'Analytics & Payout Settlement', status: 'PENDING', dueDate: '2026-11-30', amountMinor: 100000 },
    ];

    const reply = await hfClient.runProjectCopilot({
      project,
      milestones,
      evidence: [],
      payments: [{ id: 'pay_1', status: 'COMPLETED', amountMinor: 50000 }],
      userQuestion: 'What is the project deadline and milestone timeline schedule?',
      userRole: 'client',
      userName: 'Tharshini',
    });

    assert.ok(reply);
    assert.equal(reply.role, 'assistant');
    assert.ok(
      reply.content.toLowerCase().includes('deadline') ||
      reply.content.includes('November 30, 2026') ||
      reply.content.includes('2026-11-30'),
      'Must cite target completion deadline'
    );
    assert.ok(reply.content.includes('Architecture & Foundation'), 'Must list milestone title');
    assert.ok(reply.suggestedActions && reply.suggestedActions.length > 0);
  });

  test('project copilot accurately answers tech stack and architecture questions', async () => {
    const project = {
      id: 'proj_copilot_3',
      title: 'Smart Inventory Management System',
      status: 'active',
      totalAmountMinor: 250000,
    };

    const blueprint = {
      technicalAnalysis: {
        recommendedArchitecture: 'Event-Driven Microservices with Next.js SPA and Express REST APIs',
        technologyStack: {
          frontend: ['React 19', 'TypeScript', 'Tailwind CSS', 'Vite'],
          backend: ['Node.js', 'Express', 'TypeScript', 'JWT'],
          database: ['MongoDB Atlas', 'Mongoose ODM'],
          apis: ['PayPal Sandbox Orders v2', 'Hugging Face AI', 'Nodemailer'],
          infrastructure: ['Docker', 'Vercel'],
        },
        integrationComplexity: 'high',
      },
    };

    const reply = await hfClient.runProjectCopilot({
      project,
      blueprint,
      milestones: [],
      evidence: [],
      payments: [],
      userQuestion: 'What tech stack, database, and frameworks does this project use?',
      userRole: 'provider',
      userName: 'Dev Lead',
    });

    assert.ok(reply);
    assert.equal(reply.role, 'assistant');
    assert.ok(reply.content.includes('React') || reply.content.includes('Frontend'), 'Must cite frontend');
    assert.ok(reply.content.includes('Node.js') || reply.content.includes('Express'), 'Must cite backend');
    assert.ok(reply.content.includes('MongoDB') || reply.content.includes('Database'), 'Must cite database');
    assert.ok(reply.content.includes('PayPal') || reply.content.includes('Escrow'), 'Must cite escrow/APIs');
    assert.ok(reply.suggestedActions && reply.suggestedActions.length > 0);
  });

  test('project copilot generates comprehensive multi-perspective summary', async () => {
    const project = {
      id: 'proj_copilot_4',
      title: 'Smart Inventory Management System',
      status: 'active',
      deadline: '2026-11-30',
      totalAmountMinor: 250000,
    };

    const blueprint = {
      businessAnalysis: {
        businessObjective: 'Eliminate stockout friction and automate replenishment with barcode scanner tracking',
        targetAudience: ['Warehouse Managers', 'Retail Operators'],
        userProblemsSolved: ['Real-time stock loss prevention', 'Automated purchase orders'],
      },
      technicalAnalysis: {
        recommendedArchitecture: 'Microservices with React SPA',
        technologyStack: {
          frontend: ['React 19', 'TypeScript'],
          backend: ['Node.js', 'Express'],
          database: ['MongoDB Atlas'],
          apis: ['PayPal Sandbox Orders v2'],
          infrastructure: ['Docker'],
        },
      },
    };

    const milestones = [
      { id: 'ms_1', title: 'Phase 1 Foundation', status: 'PAID', amountMinor: 100000 },
      { id: 'ms_2', title: 'Phase 2 Live Scanner', status: 'IN_PROGRESS', amountMinor: 150000 },
    ];

    const reply = await hfClient.runProjectCopilot({
      project,
      blueprint,
      milestones,
      evidence: [],
      payments: [{ id: 'pay_1', status: 'COMPLETED', amountMinor: 100000 }],
      userQuestion: 'Give me a multiple perspective of summarize content for this project',
      userRole: 'client',
      userName: 'Tharshini',
    });

    assert.ok(reply);
    assert.equal(reply.role, 'assistant');
    // Must contain multi-perspective sections
    assert.ok(
      reply.content.toLowerCase().includes('business') || reply.content.includes('💼'),
      'Must contain Business & Client Perspective'
    );
    assert.ok(
      reply.content.toLowerCase().includes('technical') || reply.content.includes('🛠️'),
      'Must contain Technical & Architecture Perspective'
    );
    assert.ok(
      reply.content.toLowerCase().includes('financial') || reply.content.includes('⚖️') || reply.content.includes('💰'),
      'Must contain Financial & Escrow Perspective'
    );
    assert.ok(
      reply.content.toLowerCase().includes('delivery') || reply.content.toLowerCase().includes('timeline') || reply.content.includes('⏱️'),
      'Must contain Delivery & Timeline Perspective'
    );
    assert.ok(reply.suggestedActions && reply.suggestedActions.length > 0);
  });

  test('project copilot responds helpfully to normal conversational questions', async () => {
    const project = {
      id: 'proj_copilot_5',
      title: 'Smart Inventory Management System',
      status: 'active',
      totalAmountMinor: 250000,
    };

    const reply = await hfClient.runProjectCopilot({
      project,
      milestones: [],
      evidence: [],
      payments: [],
      userQuestion: 'Hello, who are you and what can you help me with?',
      userRole: 'client',
      userName: 'Tharshini',
    });

    assert.ok(reply);
    assert.equal(reply.role, 'assistant');
    assert.ok(reply.content.includes('Tharshini') || reply.content.includes('Hello'));
    assert.ok(reply.content.includes('Smart Inventory Management System'));
    assert.ok(reply.suggestedActions && reply.suggestedActions.length > 0);
  });

  test('project copilot provides operational step-by-step guidance for platform how-to questions', async () => {
    const project = {
      id: 'proj_copilot_6',
      title: 'Smart Inventory Management System',
      status: 'active',
      totalAmountMinor: 250000,
    };

    const reply = await hfClient.runProjectCopilot({
      project,
      milestones: [{ id: 'ms_1', title: 'Phase 1', status: 'SUBMITTED', amountMinor: 100000 }],
      evidence: [],
      payments: [],
      userQuestion: 'How do I approve a milestone and release payment?',
      userRole: 'client',
      userName: 'Tharshini',
    });

    assert.ok(reply);
    assert.equal(reply.role, 'assistant');
    assert.ok(
      reply.content.toLowerCase().includes('approve') &&
      (reply.content.toLowerCase().includes('paypal') || reply.content.toLowerCase().includes('escrow') || reply.content.toLowerCase().includes('evidence')),
      'Must explain approval and escrow release workflow'
    );
  });

  test('project copilot explains external technical concepts with project context', async () => {
    const project = {
      id: 'proj_copilot_7',
      title: 'Smart Inventory Management System',
      status: 'active',
      totalAmountMinor: 250000,
    };

    const reply = await hfClient.runProjectCopilot({
      project,
      milestones: [],
      evidence: [],
      payments: [],
      userQuestion: 'What is React and how does it work in our system?',
      userRole: 'provider',
      userName: 'Dev Lead',
    });

    assert.ok(reply);
    assert.equal(reply.role, 'assistant');
    assert.ok(reply.content.toLowerCase().includes('react'));
    assert.ok(reply.content.includes('Smart Inventory Management System') || reply.content.toLowerCase().includes('frontend'));
  });

  test('project copilot answers general inquiries with multi-perspective analysis', async () => {
    const project = {
      id: 'proj_copilot_8',
      title: 'Smart Inventory Management System',
      status: 'active',
      totalAmountMinor: 250000,
    };

    const reply = await hfClient.runProjectCopilot({
      project,
      milestones: [],
      evidence: [],
      payments: [],
      userQuestion: 'What is your assessment of our general project readiness and safety?',
      userRole: 'client',
      userName: 'Tharshini',
    });

    assert.ok(reply);
    assert.equal(reply.role, 'assistant');
    assert.ok(
      reply.content.includes('💼') || reply.content.toLowerCase().includes('business'),
      'Must contain business perspective'
    );
    assert.ok(
      reply.content.includes('🛠️') || reply.content.toLowerCase().includes('technical'),
      'Must contain technical perspective'
    );
    assert.ok(
      reply.content.includes('⚖️') || reply.content.toLowerCase().includes('financial') || reply.content.toLowerCase().includes('escrow'),
      'Must contain financial/escrow perspective'
    );
  });
});

