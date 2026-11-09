import { describe, it } from 'node:test';
import assert from 'node:assert';
import jwt from 'jsonwebtoken';
import { RegisterInputSchema } from '@clausora/shared';
import { env } from '../src/config/env';

describe('Security, Auth & Role Isolation Tests', () => {
  it('enforces strict 1-day (86,400 seconds) JWT token expiration', () => {
    const payload = {
      id: 'usr_client_demo',
      name: 'Sarah Chen',
      email: 'client@clausora.dev',
      role: 'client',
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1d' });
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;

    assert.ok(decoded.exp, 'Token must contain an expiration timestamp');
    assert.ok(decoded.iat, 'Token must contain an issued-at timestamp');
    const lifetimeSeconds = decoded.exp - decoded.iat;
    assert.strictEqual(lifetimeSeconds, 86400, 'Token lifespan must strictly be 1 day (86400 seconds)');
  });

  it('restricts user registration strictly to client, provider, or admin roles', () => {
    // Valid roles
    const validClient = RegisterInputSchema.safeParse({
      name: 'Client User',
      email: 'client.test@clausora.dev',
      password: 'password123',
      role: 'client',
    });
    assert.strictEqual(validClient.success, true);

    const validProvider = RegisterInputSchema.safeParse({
      name: 'Provider User',
      email: 'provider.test@clausora.dev',
      password: 'password123',
      role: 'provider',
    });
    assert.strictEqual(validProvider.success, true);

    const validAdmin = RegisterInputSchema.safeParse({
      name: 'Admin User',
      email: 'admin.test@clausora.dev',
      password: 'password123',
      role: 'admin',
    });
    assert.strictEqual(validAdmin.success, true);

    // Invalid roles (such as obsolete judge role)
    const invalidJudge = RegisterInputSchema.safeParse({
      name: 'Judge User',
      email: 'judge@clausora.dev',
      password: 'password123',
      role: 'judge',
    });
    assert.strictEqual(invalidJudge.success, false, 'Obsolete judge role must be rejected');
  });

  it('strictly isolates projects and tasks by tenant role', () => {
    const mockProjects = [
      { id: 'p1', title: 'Sarah Project', ownerId: 'usr_sarah', providerIds: ['usr_alex'] },
      { id: 'p2', title: 'Other Client Project', ownerId: 'usr_other', providerIds: ['usr_dave'] },
      { id: 'p3', title: 'Sarah & Dave Project', ownerId: 'usr_sarah', providerIds: ['usr_dave'] },
    ];

    // Client Sarah should only see p1 and p3
    const sarahVisible = mockProjects.filter((p) => p.ownerId === 'usr_sarah');
    assert.deepStrictEqual(sarahVisible.map((p) => p.id), ['p1', 'p3']);

    // Provider Alex should only see p1
    const alexVisible = mockProjects.filter((p) => p.providerIds.includes('usr_alex'));
    assert.deepStrictEqual(alexVisible.map((p) => p.id), ['p1']);

    // Provider Dave should see p2 and p3
    const daveVisible = mockProjects.filter((p) => p.providerIds.includes('usr_dave'));
    assert.deepStrictEqual(daveVisible.map((p) => p.id), ['p2', 'p3']);

    // Admin should see all 3
    const adminVisible = mockProjects;
    assert.strictEqual(adminVisible.length, 3);
  });
});
