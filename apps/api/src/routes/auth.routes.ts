import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { dbStore } from '../database/store';
import { RegisterInputSchema, LoginInputSchema, DEMO_USERS } from '@clausora/shared';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Brute-force protection: strict limit on authentication attempts
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/register
router.post('/register', authRateLimiter, async (req, res, next) => {
  try {
    const input = RegisterInputSchema.parse(req.body);
    const normalizedEmail = input.email.toLowerCase().trim();

    // Check if user already exists
    for (const u of dbStore.users.values()) {
      if (u.email.toLowerCase() === normalizedEmail) {
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
      if (u.email.toLowerCase() === normalizedEmail) {
        foundUser = u;
        break;
      }
    }

    if (!foundUser) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    const validPass = await bcrypt.compare(input.password, foundUser.passwordHash);
    if (!validPass) {
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
router.get('/clients', (req, res) => {
  const clients = Array.from(dbStore.users.values())
    .filter((u) => u.role === 'client')
    .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }));

  return res.json({
    success: true,
    data: { clients },
  });
});

// GET /api/auth/providers - list available providers for project/task assignment
router.get('/providers', (req, res) => {
  const providers = Array.from(dbStore.users.values())
    .filter((u) => u.role === 'provider')
    .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role }));

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

export default router;
