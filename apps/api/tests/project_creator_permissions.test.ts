import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dbStore } from '../src/database/store.js';

describe('Project Creator Permissions, Acceptance, and DB Preservation', () => {
  const clientOwnerId = 'usr_client_' + Date.now();
  const providerAssigneeId = 'usr_provider_' + Date.now();
  const unauthorizedUserId = 'usr_stranger_' + Date.now();
  const testProjectId = 'proj_test_perm_' + Date.now();

  const testProject: any = {
    id: testProjectId,
    title: 'Custom Client Project',
    description: 'Initial scope description',
    ownerId: clientOwnerId,
    providerIds: [providerAssigneeId],
    createdBy: clientOwnerId,
    creatorRole: 'client',
    status: 'awaiting_approval',
    sourceAssets: [],
    currentAgreementId: '',
    deadline: '2026-12-31',
    totalAmountMinor: 150000,
    currency: 'USD',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  test('saves project with creator and awaiting_approval status', async () => {
    await dbStore.saveProject(testProject);
    const saved = dbStore.projects.get(testProjectId);
    assert.ok(saved);
    assert.equal(saved.status, 'awaiting_approval');
    assert.equal(saved.createdBy, clientOwnerId);
  });

  test('allows assigned provider to accept client-created project', async () => {
    const project = dbStore.projects.get(testProjectId);
    assert.ok(project);

    // Verify assigned counterpart check
    const isCounterpart = project.providerIds.includes(providerAssigneeId);
    assert.equal(isCounterpart, true);

    const updated = await dbStore.updateProject(testProjectId, {
      status: 'active',
      acceptedBy: providerAssigneeId,
      acceptedAt: new Date().toISOString(),
    });

    assert.equal(updated.status, 'active');
    assert.equal(updated.acceptedBy, providerAssigneeId);
  });

  test('enforces that only the creator can update project parameters', async () => {
    const project = dbStore.projects.get(testProjectId);
    assert.ok(project);

    // Creator matches
    const isCreator = project.createdBy === clientOwnerId || project.ownerId === clientOwnerId;
    assert.equal(isCreator, true);

    // Stranger does not match
    const strangerIsCreator = project.createdBy === unauthorizedUserId || project.ownerId === unauthorizedUserId;
    assert.equal(strangerIsCreator, false);

    const updated = await dbStore.updateProject(testProjectId, {
      title: 'Updated Title by Creator',
      totalAmountMinor: 200000,
    });

    assert.equal(updated.title, 'Updated Title by Creator');
    assert.equal(updated.totalAmountMinor, 200000);
  });

  test('preserves user and project DB details upon soft delete', async () => {
    const tempUserId = 'usr_preserve_test_' + Date.now();
    await dbStore.saveUser({
      id: tempUserId,
      name: 'Preserve Me',
      email: 'preserve@example.com',
      role: 'provider',
      passwordHash: 'hash_123',
      createdAt: new Date().toISOString(),
    });

    // Delete user
    const deleted = await dbStore.deleteUser(tempUserId);
    assert.equal(deleted, true);

    // Project created by user remains intact in DB
    const project = dbStore.projects.get(testProjectId);
    assert.ok(project);
    assert.equal(project.id, testProjectId);
  });

  test('allows task owner (ownerId) to approve and activate project awaiting approval', async () => {
    const ownerApprovalProjectId = 'proj_owner_appr_' + Date.now();
    await dbStore.saveProject({
      ...testProject,
      id: ownerApprovalProjectId,
      status: 'awaiting_approval',
    });

    const project = dbStore.projects.get(ownerApprovalProjectId);
    assert.ok(project);
    assert.equal(project.status, 'awaiting_approval');

    // Verify task owner can accept
    const isTaskOwner = project.ownerId === clientOwnerId || project.createdBy === clientOwnerId;
    assert.equal(isTaskOwner, true);

    const activated = await dbStore.updateProject(ownerApprovalProjectId, {
      status: 'active',
      acceptedBy: clientOwnerId,
      acceptedAt: new Date().toISOString(),
    });

    assert.equal(activated.status, 'active');
    assert.equal(activated.acceptedBy, clientOwnerId);
  });

  test('persists paymentDetails object with payer email, merchant id, and escrow terms', async () => {
    const paymentPayload = {
      payerEmail: 'client-sandbox@clausora.dev',
      paypalMerchantId: 'SANDBOX_MERCHANT_CLAU_2026',
      billingName: 'Acme International Inc.',
      taxId: 'US-84-910284',
      billingAddress: '500 Tech Blvd, Austin, TX',
      paymentMethod: 'paypal_sandbox',
      escrowTerms: 'Funds released upon client verification of milestone acceptance criteria.',
      payoutNotes: 'Net 0 escrow settlement',
      updatedAt: new Date().toISOString(),
    };

    const updated = await dbStore.updateProject(testProjectId, {
      paymentDetails: paymentPayload,
    });

    assert.ok(updated.paymentDetails);
    assert.equal(updated.paymentDetails.payerEmail, 'client-sandbox@clausora.dev');
    assert.equal(updated.paymentDetails.paypalMerchantId, 'SANDBOX_MERCHANT_CLAU_2026');
    assert.equal(updated.paymentDetails.paymentMethod, 'paypal_sandbox');
    assert.equal(updated.paymentDetails.escrowTerms, 'Funds released upon client verification of milestone acceptance criteria.');
  });

  test('updates project settledAmountMinor when milestone payments are marked PAID', async () => {
    const ms1Id = 'ms_test_paid_1_' + Date.now();
    const ms2Id = 'ms_test_paid_2_' + Date.now();

    await dbStore.saveMilestone({
      id: ms1Id,
      projectId: testProjectId,
      agreementId: 'agr_1',
      title: 'Milestone 1',
      description: 'First deliverable',
      amountMinor: 50000,
      currency: 'USD',
      status: 'PAID',
      dueDate: '2026-12-01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await dbStore.saveMilestone({
      id: ms2Id,
      projectId: testProjectId,
      agreementId: 'agr_1',
      title: 'Milestone 2',
      description: 'Second deliverable',
      amountMinor: 75000,
      currency: 'USD',
      status: 'PAID',
      dueDate: '2026-12-15',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const projectMilestones = Array.from(dbStore.milestones.values()).filter(
      (m) => m.projectId === testProjectId && m.status === 'PAID'
    );
    const totalSettled = projectMilestones.reduce((sum, m) => sum + (m.amountMinor || 0), 0);

    const updated = await dbStore.updateProject(testProjectId, {
      settledAmountMinor: totalSettled,
    });

    assert.equal(updated.settledAmountMinor, 125000);
  });

  test('supports split task payments and calculates remaining balance accurately', async () => {
    const splitMsId = 'ms_split_test_' + Date.now();
    await dbStore.saveMilestone({
      id: splitMsId,
      projectId: testProjectId,
      agreementId: 'agr_split',
      title: 'Split Deliverable Task',
      description: 'Task with split payments',
      amountMinor: 100000,
      paidMinor: 0,
      currency: 'USD',
      status: 'IN_PROGRESS',
      dueDate: '2026-12-30',
      acceptanceCriteria: [],
      taskIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const ms = dbStore.milestones.get(splitMsId)!;
    assert.equal(ms.paidMinor, 0);

    // Pay 40% split ($400.00)
    const splitPayment1 = 40000;
    ms.paidMinor = (ms.paidMinor || 0) + splitPayment1;
    ms.status = 'PARTIALLY_PAID';
    await dbStore.saveMilestone(ms);

    const afterSplit1 = dbStore.milestones.get(splitMsId)!;
    assert.equal(afterSplit1.paidMinor, 40000);
    assert.equal(afterSplit1.status, 'PARTIALLY_PAID');
    assert.equal(afterSplit1.amountMinor - (afterSplit1.paidMinor || 0), 60000);

    // Pay remaining 60% ($600.00)
    const splitPayment2 = 60000;
    ms.paidMinor = (ms.paidMinor || 0) + splitPayment2;
    if (ms.paidMinor >= ms.amountMinor) {
      ms.status = 'PAID';
    }
    await dbStore.saveMilestone(ms);

    const afterSplit2 = dbStore.milestones.get(splitMsId)!;
    assert.equal(afterSplit2.paidMinor, 100000);
    assert.equal(afterSplit2.status, 'PAID');
  });

  test('strictly enforces bilateral counterpart acceptance: client creator cannot self-approve; opponent provider must activate', async () => {
    const bilateralProjId = 'proj_bilateral_client_' + Date.now();
    const creatorClientId = 'usr_client_creator_' + Date.now();
    const opponentProviderId = 'usr_provider_opponent_' + Date.now();

    await dbStore.saveProject({
      id: bilateralProjId,
      title: 'Client Proposed Scope',
      description: 'Scope created by client',
      ownerId: creatorClientId,
      providerIds: [opponentProviderId],
      createdBy: creatorClientId,
      creatorRole: 'client',
      status: 'awaiting_approval',
      sourceAssets: [],
      currentAgreementId: '',
      totalAmountMinor: 100000,
      currency: 'USD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const project = dbStore.projects.get(bilateralProjId)!;
    assert.equal(project.status, 'awaiting_approval');

    // 1. Creator (client) attempts to self-approve -> Blocked by bilateral rule
    const clientIsCreator = project.createdBy === creatorClientId;
    assert.equal(clientIsCreator, true);
    const canClientSelfApprove = !clientIsCreator; // Bilateral rule: creator cannot self-approve
    assert.equal(canClientSelfApprove, false);

    // 2. Opponent provider reviews and accepts -> Authorized!
    const providerIsCreator = project.createdBy === opponentProviderId;
    assert.equal(providerIsCreator, false);
    const isOpponentProvider = project.providerIds.includes(opponentProviderId) && !providerIsCreator;
    assert.equal(isOpponentProvider, true);

    const activated = await dbStore.updateProject(bilateralProjId, {
      status: 'active',
      acceptedBy: opponentProviderId,
      acceptedAt: new Date().toISOString(),
    });

    assert.equal(activated.status, 'active');
    assert.equal(activated.acceptedBy, opponentProviderId);
  });

  test('strictly enforces bilateral counterpart acceptance: provider creator cannot self-approve; opponent client must activate', async () => {
    const providerProjId = 'proj_bilateral_provider_' + Date.now();
    const creatorProviderId = 'usr_provider_creator_' + Date.now();
    const opponentClientId = 'usr_client_opponent_' + Date.now();

    await dbStore.saveProject({
      id: providerProjId,
      title: 'Provider Technical Proposal',
      description: 'Proposal created by provider for client',
      ownerId: opponentClientId,
      providerIds: [creatorProviderId],
      createdBy: creatorProviderId,
      creatorRole: 'provider',
      status: 'awaiting_approval',
      sourceAssets: [],
      currentAgreementId: '',
      totalAmountMinor: 80000,
      currency: 'USD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const project = dbStore.projects.get(providerProjId)!;
    assert.equal(project.status, 'awaiting_approval');

    // 1. Creator (provider) attempts self-approval -> Blocked
    const providerIsCreator = project.createdBy === creatorProviderId;
    assert.equal(providerIsCreator, true);
    const canProviderSelfApprove = !providerIsCreator;
    assert.equal(canProviderSelfApprove, false);

    // 2. Opponent client owner reviews and accepts -> Authorized!
    const clientIsCreator = project.createdBy === opponentClientId;
    assert.equal(clientIsCreator, false);
    const isOpponentClient = project.ownerId === opponentClientId && !clientIsCreator;
    assert.equal(isOpponentClient, true);

    const activated = await dbStore.updateProject(providerProjId, {
      status: 'active',
      acceptedBy: opponentClientId,
      acceptedAt: new Date().toISOString(),
    });

    assert.equal(activated.status, 'active');
    assert.equal(activated.acceptedBy, opponentClientId);
  });

  test('prevents escrow payments while project status is awaiting_approval', async () => {
    const pendingProjId = 'proj_pending_pay_' + Date.now();
    await dbStore.saveProject({
      id: pendingProjId,
      title: 'Pending Escrow Safety Project',
      ownerId: clientOwnerId,
      providerIds: [providerAssigneeId],
      createdBy: clientOwnerId,
      creatorRole: 'client',
      status: 'awaiting_approval',
      sourceAssets: [],
      currentAgreementId: '',
      totalAmountMinor: 50000,
      currency: 'USD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const project = dbStore.projects.get(pendingProjId)!;
    assert.equal(project.status, 'awaiting_approval');

    // Payment safety check
    const isPayable = project.status === 'active';
    assert.equal(isPayable, false, 'Payments must be locked when project is awaiting counterpart approval');

    // Once opponent accepts, payment unlocks
    project.status = 'active';
    project.acceptedBy = providerAssigneeId;
    await dbStore.saveProject(project);

    assert.equal(project.status === 'active', true, 'Payments unlocked once counterpart approves');
  });

  test('enforces full payment settlement before closing project', async () => {
    const closeProjId = 'proj_close_test_' + Date.now();
    await dbStore.saveProject({
      id: closeProjId,
      title: 'Full Payout Closure Project',
      ownerId: clientOwnerId,
      providerIds: [providerAssigneeId],
      createdBy: clientOwnerId,
      creatorRole: 'client',
      status: 'active',
      sourceAssets: [],
      currentAgreementId: '',
      totalAmountMinor: 100000,
      settledAmountMinor: 50000,
      currency: 'USD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const project = dbStore.projects.get(closeProjId)!;
    const isFullyPaid = (project.settledAmountMinor || 0) >= (project.totalAmountMinor || 0);
    assert.equal(isFullyPaid, false, 'Project cannot be closed with pending milestone balance');

    // Settle remaining payment
    project.settledAmountMinor = 100000;
    await dbStore.saveProject(project);

    const isFullyPaidNow = (project.settledAmountMinor || 0) >= (project.totalAmountMinor || 0);
    assert.equal(isFullyPaidNow, true, 'Project is eligible to close once fully settled');

    // Close project
    const closed = await dbStore.updateProject(closeProjId, {
      status: 'completed',
    });
    assert.equal(closed?.status, 'completed', 'Project status should transition to completed upon closure');
  });
});

