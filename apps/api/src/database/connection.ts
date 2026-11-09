import mongoose from 'mongoose';
import dns from 'dns';
import { env } from '../config/env';

// Configure reliable DNS servers for MongoDB Atlas SRV resolution
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // Ignore if custom DNS cannot be set
}

let isConnected = false;

export async function connectDatabase(): Promise<boolean> {
  if (!env.MONGODB_URI) {
    console.log('ℹ️ No MONGODB_URI configured. Running in-memory database store.');
    return false;
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });
    isConnected = true;
    console.log('✅ Connected to LIVE MongoDB Atlas Database successfully!');
    return true;
  } catch (err: any) {
    console.warn('⚠️ MongoDB Atlas connection error:', err.message);
    console.log('ℹ️ Operating with resilient data layer.');
    return false;
  }
}

export function isDbConnected(): boolean {
  return isConnected;
}
