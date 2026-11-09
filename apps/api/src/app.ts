import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import blueprintRoutes from './routes/blueprint.routes';
import agreementRoutes from './routes/agreement.routes';
import milestoneRoutes from './routes/milestone.routes';
import evidenceRoutes from './routes/evidence.routes';
import aiRoutes from './routes/ai.routes';
import scopeDriftRoutes from './routes/scopeDrift.routes';
import paymentRoutes from './routes/payment.routes';
import notificationRoutes from './routes/notification.routes';
import reaRoutes from './routes/rea.routes';
import adminRoutes from './routes/admin.routes';

const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS Configuration
const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'https://clausora.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive in dev/sandbox preview
    }
  },
  credentials: true,
}));

// Rate limiter for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser(env.COOKIE_SECRET));

// Request tracing middleware
app.use((req: Request, res: Response, next) => {
  const reqId = req.headers['x-request-id'] || 'req_' + Math.random().toString(36).substring(2, 9);
  res.setHeader('x-request-id', reqId);
  next();
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  return res.json({
    status: 'healthy',
    product: 'Clausora — AI Work Intelligence & PayPal Milestone Payments',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    services: {
      ai: {
        model: env.HF_MODEL,
        provider: 'Hugging Face Inference',
      },
      paypal: {
        mode: env.PAYPAL_MODE,
        baseUrl: env.PAYPAL_BASE_URL,
      },
    },
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/blueprint', blueprintRoutes);
app.use('/api', agreementRoutes);
app.use('/api', milestoneRoutes);
app.use('/api', evidenceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api', scopeDriftRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/rea', reaRoutes);
app.use('/api/admin', adminRoutes);

// Error Handler
app.use(errorHandler);

export default app;

