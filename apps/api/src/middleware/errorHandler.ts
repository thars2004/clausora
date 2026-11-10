import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(2, 10);

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
      requestId,
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const reason = err.reason || message;

  console.error(`[Error] [${requestId}] ${req.method} ${req.url}:`, err);

  return res.status(statusCode).json({
    success: false,
    message,
    reason,
    requestId,
  });
}

