import { describe, it } from 'node:test';
import assert from 'node:assert';
import { hfClient } from '../src/services/ai/huggingface.client';

describe('AI Work DNA Blueprint Synthesis & Workflow Tests', () => {
  it('dynamically parses custom task descriptions into tailored tasks, acceptance criteria, and deliverables', async () => {
    const input = {
      projectTitle: 'E-Commerce Marketplace with Digital Downloads',
      projectSummary: 'A multi-vendor digital asset marketplace with customer reviews, instant downloads, and PayPal checkout.',
      sourceText: `Scope Requirements:
1. Vendor store profile management and product catalog upload.
2. Real-time customer review rating system with verified buyer badges.
3. Secure digital asset download delivery with expiring S3 presigned URLs.
4. PayPal Orders v2 sandbox checkout with automated escrow release upon download verification.
5. Automated tax and commission breakdown reporting for platform admins.`,
      deadline: '2026-12-25',
      totalAmountMinor: 250000, // $2,500 USD
      currency: 'USD',
    };

    const blueprint = await hfClient.generateWorkBlueprint(input);

    assert.ok(blueprint.id, 'Blueprint must have a valid ID');
    assert.strictEqual(blueprint.projectTitle, input.projectTitle);
    assert.ok(blueprint.workstreams.length >= 3, 'Must generate at least 3 workstream phases');

    // Verify task count matches or captures the detailed requirements
    const totalTasks = blueprint.workstreams.reduce((acc, ws) => acc + ws.tasks.length, 0);
    assert.ok(totalTasks >= 3, 'Must extract concrete tasks from user scope items');

    // Verify tasks have real deliverables and acceptance criteria
    const firstTask = blueprint.workstreams[0].tasks[0];
    assert.ok(firstTask.deliverable.length > 5, 'Task must have a concrete deliverable');
    assert.ok(firstTask.acceptanceCriteria.length >= 2, 'Task must have at least 2 acceptance criteria');

    // Verify total budget distribution matches user totalAmountMinor
    assert.strictEqual(blueprint.totalBudgetMinor, 250000, 'Total budget must match input');
    const milestoneTotal = blueprint.suggestedMilestones.reduce(
      (sum, ms) => sum + (ms.suggestedAmountMinor || 0),
      0
    );
    assert.strictEqual(milestoneTotal, 250000, 'Milestone amounts must strictly sum to the total budget ($2,500)');

    // Verify deadline scheduling
    assert.strictEqual(blueprint.targetDeadline, '2026-12-25', 'Target deadline must match input');
    const finalMilestone = blueprint.suggestedMilestones[blueprint.suggestedMilestones.length - 1];
    assert.strictEqual(finalMilestone.dueDate, '2026-12-25', 'Final milestone due date must end on the target deadline');

    // Verify Mermaid workflow diagram generation
    assert.ok(blueprint.workflowDiagram, 'Workflow diagram must be generated');
    assert.ok(blueprint.workflowDiagram.includes('flowchart TD'), 'Diagram must be a valid Mermaid flowchart');
    assert.ok(blueprint.workflowDiagram.includes('Milestone 1'), 'Diagram must reference milestones');
    assert.ok(blueprint.workflowDiagram.includes('PayPal'), 'Diagram must show PayPal payout node');

    // Verify structured workflow steps
    assert.ok(blueprint.workflowSteps && blueprint.workflowSteps.length >= 3, 'Must produce structured workflow steps');
    assert.strictEqual(blueprint.workflowSteps[0].stepNumber, 1);
  });
});
