import { MilestoneStatus } from './types';

export const ALLOWED_MILESTONE_TRANSITIONS: Record<MilestoneStatus, MilestoneStatus[]> = {
  CREATED: ['IN_PROGRESS'],
  IN_PROGRESS: ['SUBMITTED'],
  SUBMITTED: ['AI_REVIEWED', 'AWAITING_CLIENT_DECISION'],
  AI_REVIEWED: ['AWAITING_CLIENT_DECISION'],
  AWAITING_CLIENT_DECISION: [
    'REVISION_REQUESTED',
    'MORE_EVIDENCE_REQUIRED',
    'APPROVED_FOR_PAYMENT',
    'DISPUTED',
  ],
  REVISION_REQUESTED: ['IN_PROGRESS', 'SUBMITTED'],
  MORE_EVIDENCE_REQUIRED: ['SUBMITTED'],
  APPROVED_FOR_PAYMENT: ['PAYPAL_ORDER_CREATED', 'DISPUTED'],
  PAYPAL_ORDER_CREATED: ['PAYER_APPROVED', 'CANCELLED', 'DISPUTED'],
  PAYER_APPROVED: ['PAYMENT_CAPTURED', 'CANCELLED'],
  PAYMENT_CAPTURED: ['PAID'],
  PAID: [],
  CANCELLED: [],
  DISPUTED: ['AWAITING_CLIENT_DECISION', 'CANCELLED'],
};

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'] as const;

export const DEFAULT_AI_MODEL = 'Qwen/Qwen2.5-VL-7B-Instruct';

export const DEMO_USERS = {
  CLIENT: {
    email: 'client@clausora.dev',
    password: 'ClausoraClient2026!',
    name: 'Sarah Chen (Acme Ventures)',
    role: 'client' as const,
  },
  PROVIDER: {
    email: 'provider@clausora.dev',
    password: 'ClausoraDev2026!',
    name: 'Alex Rivera (Fullstack Studio)',
    role: 'provider' as const,
  },
  ADMIN: {
    email: 'admin@clausora.dev',
    password: 'ClausoraAdmin2026!',
    name: 'Marcus Vance (Platform Admin)',
    role: 'admin' as const,
  },
};

