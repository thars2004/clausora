import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { dbStore } from '../database/store';
import { UserRole } from '@clausora/shared';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : req.cookies?.clausora_token;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.',
    });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthenticatedUser;
    // Check user exists
    const user = dbStore.users.get(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User session expired or user not found.',
      });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: This action requires one of the following roles: ${allowedRoles.join(', ')}.`,
      });
    }
    next();
  };
}

