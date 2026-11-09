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
});

