import type { Request, Response } from 'express';
import app from '../apps/api/src/app';
import { connectDatabase } from '../apps/api/src/database/connection';
import { dbStore } from '../apps/api/src/database/store';
import { seedDemoData } from '../apps/api/src/seed';

// Initialization flag to cache across warm serverless invocations
let isInitialized = false;
let initPromise: Promise<void> | null = null;

async function ensureInitialized() {
  if (isInitialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const connected = await connectDatabase();
        if (connected) {
          await dbStore.syncFromLiveDatabase();
        }
        if (dbStore.users.size === 0) {
          await seedDemoData();
        }
        isInitialized = true;
      } catch (err) {
        console.error('Error during Vercel serverless initialization:', err);
      }
    })();
  }
  await initPromise;
}

export default async function handler(req: Request, res: Response) {
  await ensureInitialized();

  // Normalize URL if Vercel router forwards stripped path
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  return (app as any)(req, res);
}

