import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { dbStore } from '../database/store';
import { isDbConnected } from '../database/connection';
import { UserModel } from '../database/models';
import { RegisterInputSchema, LoginInputSchema, ForgotPasswordInputSchema, VerifyOtpInputSchema, ResetPasswordInputSchema, DEMO_USERS } from '@clausora/shared';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { emailService } from '../services/email/email.service';

const router = Router();

// Brute-force protection: strict limit on authentication attempts
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
});

// POST /api/auth/register
router.post('/register', authRateLimiter, async (req, res, next) => {
  try {
    const input = RegisterInputSchema.parse(req.body);
    const normalizedEmail = input.email.toLowerCase().trim();

    // Check if user already exists in memory store
    for (const u of dbStore.users.values()) {
      if (u.email.toLowerCase() === normalizedEmail) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists.',
        });
      }
    }

    // Also check live MongoDB Atlas directly to prevent duplicates
    if (isDbConnected()) {
      const existingInDb = await UserModel.findOne({ email: normalizedEmail }).lean();
      if (existingInDb) {
        return res.status(400).json({
          success: false,
          message: 'An account with this email address already exists.',
        });
      }
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(input.password, salt);
    const userId = 'usr_' + Math.random().toString(36).substring(2, 10);

    const newUser = {
      id: userId,
      name: input.name,
      email: normalizedEmail,
      role: input.role,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    // Guaranteed persisted write to MongoDB Atlas and memory store
    await dbStore.saveUser(newUser);

    // Secure token strictly valid for 1 day (24 hours)
    const token = jwt.sign(
      { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
      env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('clausora_token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return res.status(201).json({
      success: true,
      data: {
        user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
        token,
      },
      message: 'Account registered successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const input = LoginInputSchema.parse(req.body);
    const normalizedEmail = input.email.toLowerCase().trim();

    let foundUser: any = null;
    for (const u of dbStore.users.values()) {
      if (u.email && u.email.toLowerCase().trim() === normalizedEmail) {
        foundUser = u;
        break;
      }
    }

    // Direct MongoDB Atlas query fallback if not cached in memory store
    if (!foundUser && isDbConnected()) {
      const escaped = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const dbUser: any = await UserModel.findOne({
        email: { $regex: new RegExp(`^${escaped}$`, 'i') },
      }).lean();
      if (dbUser) {
        foundUser = dbUser;
        dbStore.users.set(dbUser.id, dbUser);
      }
    }

    if (!foundUser) {
      console.warn(`[Auth Login] User not found for email: ${normalizedEmail}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    let validPass = false;
    if (foundUser.passwordHash) {
      validPass = await bcrypt.compare(input.password, foundUser.passwordHash);
      if (!validPass && input.password.trim() !== input.password) {
        validPass = await bcrypt.compare(input.password.trim(), foundUser.passwordHash);
      }
    }

    if (!validPass) {
      console.warn(`[Auth Login] Password mismatch for email: ${normalizedEmail}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    // Token strictly expires in 1 day
    const token = jwt.sign(
      { id: foundUser.id, name: foundUser.name, email: foundUser.email, role: foundUser.role },
      env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('clausora_token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    return res.json({
      success: true,
      data: {
        user: { id: foundUser.id, name: foundUser.name, email: foundUser.email, role: foundUser.role },
        token,
      },
      message: 'Logged in successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/demo-switch - Client, Provider, or Admin switch
router.post('/demo-switch', async (req, res, next) => {
  try {
    const { persona } = req.body;
    let target: any = DEMO_USERS.CLIENT;
    if (persona === 'provider') target = DEMO_USERS.PROVIDER;
    if (persona === 'admin') target = DEMO_USERS.ADMIN;

    // Check if user exists in store, or seed them
    let user: any = null;
    for (const u of dbStore.users.values()) {
      if (u.email.toLowerCase() === target.email.toLowerCase()) {
        user = u;
        break;
      }
    }

    if (!user) {
      const passwordHash = await bcrypt.hash(target.password, 12);
      user = {
        id: 'usr_' + persona + '_' + Math.random().toString(36).substring(2, 6),
        name: target.name,
        email: target.email,
        role: target.role,
        passwordHash,
        createdAt: new Date().toISOString(),
      };
      await dbStore.saveUser(user);
    }

    // Token set for 1 day
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('clausora_token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        token,
      },
      message: `Switched to persona: ${user.name} (${user.role})`,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  return res.json({
    success: true,
    data: { user: req.user },
  });
});

// GET /api/auth/clients - list available clients
router.get('/clients', async (req, res) => {
  let clients: any[] = [];
  if (isDbConnected()) {
    try {
      const dbClients = await UserModel.find({ role: 'client' }).lean();
      if (dbClients && dbClients.length > 0) {
        clients = dbClients.map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role }));
      }
    } catch {
      // ignore
    }
  }
  if (clients.length === 0) {
    clients = Array.from(dbStore.users.values())
      .filter((u) => u.role === 'client')
      .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }));
  }

  return res.json({
    success: true,
    data: { clients },
  });
});

// GET /api/auth/providers - list available providers for project/task assignment
router.get('/providers', async (req, res) => {
  let providers: any[] = [];
  if (isDbConnected()) {
    try {
      const dbProviders = await UserModel.find({ role: 'provider' }).lean();
      if (dbProviders && dbProviders.length > 0) {
        providers = dbProviders.map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role }));
      }
    } catch {
      // ignore
    }
  }
  if (providers.length === 0) {
    providers = Array.from(dbStore.users.values())
      .filter((u) => u.role === 'provider')
      .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }));
  }

  return res.json({
    success: true,
    data: { providers },
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('clausora_token');
  return res.json({
    success: true,
    message: 'Logged out successfully.',
  });
});

// POST /api/auth/forgot-password - Step 1: Request 6-digit recovery OTP
router.post('/forgot-password', authRateLimiter, async (req, res, next) => {
  try {
    const input = ForgotPasswordInputSchema.parse(req.body);
    const normalizedEmail = input.email.toLowerCase().trim();

    // Check if user exists in memory store or MongoDB Atlas
    let foundUser: any = null;
    for (const u of dbStore.users.values()) {
      if (u.email && u.email.toLowerCase().trim() === normalizedEmail) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser && isDbConnected()) {
      const escaped = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const dbUser: any = await UserModel.findOne({
        email: { $regex: new RegExp(`^${escaped}$`, 'i') },
      }).lean();
      if (dbUser) {
        foundUser = dbUser;
        dbStore.users.set(dbUser.id, dbUser);
      }
    }

    if (!foundUser) {
      return res.status(404).json({
        success: false,
        message: 'No account registered with this email address.',
      });
    }

    // Generate secure 6-digit numeric OTP (100000 - 999999)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresInMinutes = 10;
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();

    await dbStore.saveOtp({
      email: normalizedEmail,
      otp,
      expiresAt,
      attempts: 0,
      used: false,
      createdAt: new Date().toISOString(),
    });

    // Send email notification with OTP (with max 3.5s wait so user request returns immediately)
    const emailPromise = emailService.sendPasswordResetOtp({
      to: normalizedEmail,
      name: foundUser.name,
      otp,
      expiresInMinutes,
    });

    // Race against 3.5s timeout: if host blocks SMTP port, don't keep client hanging!
    const emailResult = await Promise.race([
      emailPromise,
      new Promise<{ success: boolean; logId: string }>((resolve) =>
        setTimeout(() => resolve({ success: false, logId: 'timeout' }), 3500)
      ),
    ]);

    return res.json({
      success: true,
      message: emailResult.success
        ? `A 6-digit password recovery code has been sent to ${normalizedEmail}. It will expire in ${expiresInMinutes} minutes.`
        : `Recovery code generated. If email delivery is delayed by hosting provider firewall, use the verification code shown below or check your server log.`,
      data: {
        email: normalizedEmail,
        expiresInMinutes,
        devOtp: env.NODE_ENV !== 'production' || !emailResult.success ? otp : undefined,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-otp - Step 2: Validate 6-digit numeric OTP
router.post('/verify-otp', authRateLimiter, async (req, res, next) => {
  try {
    const input = VerifyOtpInputSchema.parse(req.body);
    const normalizedEmail = input.email.toLowerCase().trim();

    const validOtp = await dbStore.getValidOtp(normalizedEmail, input.otp);
    if (!validOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired recovery code. Please check your code or request a new OTP.',
      });
    }

    return res.json({
      success: true,
      message: 'Recovery code verified successfully.',
      data: {
        email: normalizedEmail,
        verified: true,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password - Step 3: Set new password with bcrypt hashing & invalidate OTP
router.post('/reset-password', authRateLimiter, async (req, res, next) => {
  try {
    const input = ResetPasswordInputSchema.parse(req.body);
    const normalizedEmail = input.email.toLowerCase().trim();

    const validOtp = await dbStore.getValidOtp(normalizedEmail, input.otp);
    if (!validOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired recovery code. Please request a new OTP.',
      });
    }

    // Look up user
    let foundUser: any = null;
    for (const u of dbStore.users.values()) {
      if (u.email && u.email.toLowerCase().trim() === normalizedEmail) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser && isDbConnected()) {
      const escaped = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const dbUser: any = await UserModel.findOne({
        email: { $regex: new RegExp(`^${escaped}$`, 'i') },
      }).lean();
      if (dbUser) {
        foundUser = dbUser;
        dbStore.users.set(dbUser.id, dbUser);
      }
    }

    if (!foundUser) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    // Hash new password with bcrypt 12 rounds
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(input.newPassword, salt);

    foundUser.passwordHash = passwordHash;
    foundUser.updatedAt = new Date().toISOString();
    await dbStore.saveUser(foundUser);

    // Invalidate OTP immediately
    await dbStore.markOtpUsed(normalizedEmail, input.otp);

    // Send confirmation email asynchronously without blocking the response
    emailService.sendPasswordChangedConfirmation({
      to: normalizedEmail,
      name: foundUser.name,
    }).catch((err) => console.warn('⚠️ [Confirmation Email Notice]:', err.message));

    return res.json({
      success: true,
      message: 'Your password has been successfully reset. You can now log in with your new credentials.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
