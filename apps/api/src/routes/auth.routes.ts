import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { dbStore } from '../database/store';
import { RegisterInputSchema, LoginInputSchema, DEMO_USERS } from '@clausora/shared';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
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

    const salt = await bcrypt.genSalt(10);
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

    dbStore.users.set(userId, newUser);

    const token = jwt.sign(
      { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('clausora_token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
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
router.post('/login', async (req, res, next) => {
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

    const token = jwt.sign(
      { id: foundUser.id, name: foundUser.name, email: foundUser.email, role: foundUser.role },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('clausora_token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
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

// POST /api/auth/demo-switch
// Helper for judges to seamlessly switch between Client, Provider, and Judge personas
router.post('/demo-switch', async (req, res, next) => {
  try {
    const { persona } = req.body;
    let target: { email: string; password: string; name: string; role: any } = DEMO_USERS.CLIENT;
    if (persona === 'provider') target = DEMO_USERS.PROVIDER;
    if (persona === 'judge') target = DEMO_USERS.JUDGE;

    // Check if user exists in store, or seed them
    let user: any = null;
    for (const u of dbStore.users.values()) {
      if (u.email.toLowerCase() === target.email.toLowerCase()) {
        user = u;
        break;
      }
    }

    if (!user) {
      const passwordHash = await bcrypt.hash(target.password, 10);
      user = {
        id: 'usr_' + (persona || 'demo') + '_' + Math.random().toString(36).substring(2, 6),
        name: target.name,
        email: target.email,
        role: target.role,
        passwordHash,
        createdAt: new Date().toISOString(),
      };
      dbStore.users.set(user.id, user);
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('clausora_token', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
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

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('clausora_token');
  return res.json({
    success: true,
    message: 'Logged out successfully.',
  });
});

export default router;
