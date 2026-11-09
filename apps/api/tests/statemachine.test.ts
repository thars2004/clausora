import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ALLOWED_MILESTONE_TRANSITIONS, canonicalStringify, computeSha256 } from '@clausora/shared';

describe('Milestone State Machine Safety', () => {
  it('strictly restricts transitions from CREATED', () => {
    assert.deepStrictEqual(ALLOWED_MILESTONE_TRANSITIONS.CREATED, ['IN_PROGRESS']);
  });

  it('prohibits direct transition from CREATED to PAID without client approval or capture', () => {
    assert.strictEqual(ALLOWED_MILESTONE_TRANSITIONS.CREATED.includes('PAID'), false);
    assert.strictEqual(ALLOWED_MILESTONE_TRANSITIONS.SUBMITTED.includes('PAID'), false);
    assert.strictEqual(ALLOWED_MILESTONE_TRANSITIONS.APPROVED_FOR_PAYMENT.includes('PAID'), false);
  });

  it('requires PAYPAL_ORDER_CREATED -> PAYER_APPROVED -> PAYMENT_CAPTURED before PAID', () => {
    assert.deepStrictEqual(ALLOWED_MILESTONE_TRANSITIONS.PAYMENT_CAPTURED, ['PAID']);
  });
});

describe('Canonical Agreement Fingerprint (SHA-256)', () => {
  it('generates identical hash regardless of JSON object key ordering', async () => {
    const objA = { z: 1, a: 'test', m: { b: 2, a: 1 } };
    const objB = { a: 'test', z: 1, m: { a: 1, b: 2 } };

    const canonA = canonicalStringify(objA);
    const canonB = canonicalStringify(objB);
    assert.strictEqual(canonA, canonB);

    const hashA = await computeSha256(canonA);
    const hashB = await computeSha256(canonB);
    assert.strictEqual(hashA, hashB);
    assert.strictEqual(hashA.length, 64);
  });

  it('detects any change in terms or budget with different fingerprint', async () => {
    const agreement1 = { title: 'Project Alpha', amountMinor: 50000 };
    const agreement2 = { title: 'Project Alpha', amountMinor: 50001 };

    const hash1 = await computeSha256(canonicalStringify(agreement1));
    const hash2 = await computeSha256(canonicalStringify(agreement2));
    assert.notStrictEqual(hash1, hash2);
  });
});

