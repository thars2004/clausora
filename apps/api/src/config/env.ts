import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load .env from workspace root or current directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  APP_BASE_URL: z.string().default('http://localhost:5173'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().optional(),
  JWT_SECRET: z.string().default('clausora_jwt_default_secret_dev_2026_xyz!'),
  COOKIE_SECRET: z.string().default('clausora_cookie_secret_dev_2026_abc!'),
  HF_TOKEN: z.string().optional(),
  HF_MODEL: z.string().default('Qwen/Qwen2.5-VL-7B-Instruct'),
  PAYPAL_MODE: z.enum(['sandbox', 'live']).default('sandbox'),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_BASE_URL: z.string().default('https://api-m.sandbox.paypal.com'),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  EMAIL_PROVIDER: z.string().default('console'),
  EMAIL_FROM: z.string().default('Clausora <notifications@clausora.dev>'),
  ENABLE_DEMO_SEED: z.coerce.boolean().default(true),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.warn('⚠️ Warning: Environment configuration issues detected:', parsed.error.format());
}

export const env = parsed.success ? parsed.data : envSchema.parse({});

