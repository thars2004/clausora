import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dbStore } from '../src/database/store.js';

describe('Admin User Edit & Delete Capabilities', () => {
  const testUser = {
    id: 'usr_test_edit_delete_' + Date.now(),
    email: 'edit_target@example.com',
    name: 'Original Name',
    role: 'client' as const,
    passwordHash: 'hashed_pw_123',
    createdAt: new Date().toISOString(),
  };

  test('saves a user and allows editing their name, email, and role', async () => {
    await dbStore.saveUser(testUser);

    const found = await dbStore.findUserById(testUser.id);
    assert.ok(found);
    assert.equal(found.name, 'Original Name');
    assert.equal(found.role, 'client');

    // Update user details
    const updated = await dbStore.updateUser(testUser.id, {
      name: 'Updated Name',
      role: 'provider',
      email: 'updated_email@example.com',
    });

    assert.ok(updated);
    assert.equal(updated.name, 'Updated Name');
    assert.equal(updated.role, 'provider');
    assert.equal(updated.email, 'updated_email@example.com');

    // Verify retrieval reflects update
    const reFetched = await dbStore.findUserById(testUser.id);
    assert.ok(reFetched);
    assert.equal(reFetched.name, 'Updated Name');
  });

  test('allows deleting a user and confirms removal from memory and store', async () => {
    const deleted = await dbStore.deleteUser(testUser.id);
    assert.equal(deleted, true);

    const checkGone = await dbStore.findUserById(testUser.id);
    assert.equal(checkGone, undefined);
  });
});
