import mongoose from 'mongoose';
import { env } from '../config/env';

let isConnected = false;

export async function connectDatabase(): Promise<boolean> {
  if (!env.MONGODB_URI) {
    console.log('ℹ️ No MONGODB_URI provided in environment. Clausora running with active MemoryStore fallback (ideal for instant testing & zero-setup demo).');
    return false;
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log('✅ Connected to MongoDB Atlas successfully.');
    return true;
  } catch (err) {
    console.warn('⚠️ MongoDB Atlas connection failed:', (err as Error).message);
    console.log('ℹ️ Clausora automatically switched to resilient MemoryStore mode.');
    return false;
  }
}

export function isDbConnected(): boolean {
  return isConnected;
}
