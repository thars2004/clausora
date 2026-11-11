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
});
