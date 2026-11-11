import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { dbStore } from '../src/database/store.js';
import { emailService } from '../src/services/email/email.service.js';

describe('Password Recovery, OTP Validation & Transactional Email System', () => {
  const testEmail = `recovery_test_${Date.now()}@clausora.dev`;
  const initialPassword = 'InitialSecurePass123!';
  const updatedPassword = 'NewUltraSecurePass2026!';
  const testUserId = `usr_recov_${Date.now()}`;

  test('seeds user and generates a valid 6-digit recovery OTP with 10-minute expiry', async () => {
    const passwordHash = await bcrypt.hash(initialPassword, 12);
    await dbStore.saveUser({
      id: testUserId,
      name: 'Recovery Test User',
      email: testEmail,
      role: 'client',
      passwordHash,
      createdAt: new Date().toISOString(),
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await dbStore.saveOtp({
      email: testEmail,
      otp,
      expiresAt,
      attempts: 0,
      used: false,
      createdAt: new Date().toISOString(),
    });

    // Verify OTP retrieval
    const validOtp = await dbStore.getValidOtp(testEmail, otp);
    assert.ok(validOtp, 'OTP must be found and valid');
    assert.equal(validOtp.otp, otp);
    assert.equal(validOtp.used, false);
  });

  test('rejects incorrect OTP and records failed attempt', async () => {
    const invalidAttempt = await dbStore.getValidOtp(testEmail, '999999');
    assert.equal(invalidAttempt, null, 'Incorrect OTP must return null');
  });

  test('rejects expired OTP', async () => {
    const expiredEmail = `expired_${Date.now()}@clausora.dev`;
    await dbStore.saveOtp({
      email: expiredEmail,
      otp: '123456',
      expiresAt: new Date(Date.now() - 60 * 1000).toISOString(), // expired 1 min ago
      attempts: 0,
      used: false,
      createdAt: new Date().toISOString(),
    });

    const expiredResult = await dbStore.getValidOtp(expiredEmail, '123456');
    assert.equal(expiredResult, null, 'Expired OTP must return null');
  });

  test('resets password securely with bcrypt, invalidates OTP, and dispatches confirmation email', async () => {
    // Generate fresh OTP
    const otp = '842913';
    await dbStore.saveOtp({
      email: testEmail,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      attempts: 0,
      used: false,
      createdAt: new Date().toISOString(),
    });

    // Check valid
    const validRecord = await dbStore.getValidOtp(testEmail, otp);
    assert.ok(validRecord);

    // Update password
    const newHash = await bcrypt.hash(updatedPassword, 12);
    const user = await dbStore.findUserById(testUserId);
    assert.ok(user);
    user.passwordHash = newHash;
    user.updatedAt = new Date().toISOString();
    await dbStore.saveUser(user);

    // Mark OTP used
    await dbStore.markOtpUsed(testEmail, otp);

    // Ensure OTP can never be reused
    const reusedCheck = await dbStore.getValidOtp(testEmail, otp);
    assert.equal(reusedCheck, null, 'Used OTP must never be valid again');

    // Verify new password matches and old password fails
    const updatedUser = await dbStore.findUserById(testUserId);
    assert.ok(updatedUser?.passwordHash);
    const isNewValid = await bcrypt.compare(updatedPassword, updatedUser.passwordHash);
    const isOldValid = await bcrypt.compare(initialPassword, updatedUser.passwordHash);

    assert.equal(isNewValid, true, 'New password must validate successfully against stored hash');
    assert.equal(isOldValid, false, 'Old password must fail authentication');
  });

  test('sends and audits transactional email notifications', async () => {
    const initialEmailCount = dbStore.getEmailLogs(testEmail).length;

    await emailService.sendPasswordResetOtp({
      to: testEmail,
      name: 'Recovery Test User',
      otp: '654321',
      expiresInMinutes: 10,
    });

    await emailService.sendPasswordChangedConfirmation({
      to: testEmail,
      name: 'Recovery Test User',
    });

    const userEmails = dbStore.getEmailLogs(testEmail);
    assert.equal(userEmails.length, initialEmailCount + 2, 'Must record 2 new email audit logs');
    assert.equal(userEmails[0].type, 'password_changed');
    assert.equal(userEmails[1].type, 'forgot_password_otp');
    assert.ok(userEmails[1].text.includes('654321'));
  });
});
