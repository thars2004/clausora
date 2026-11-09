import app from './app';
import { env } from './config/env';
import { connectDatabase } from './database/connection';
import { seedDemoData } from './seed';

async function bootstrap() {
  console.log('🚀 Starting Clausora API Server...');
  await connectDatabase();

  if (env.ENABLE_DEMO_SEED) {
    await seedDemoData();
  }

  const server = app.listen(env.PORT, () => {
    console.log(`✨ Clausora API is live on port ${env.PORT}`);
    console.log(`🔗 Health Check: http://localhost:${env.PORT}/api/health`);
    console.log(`🎯 PayPal Sandbox Mode: ${env.PAYPAL_MODE}`);
    console.log(`🤖 Hugging Face Model: ${env.HF_MODEL}`);
  });

  return server;
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    console.error('Fatal bootstrap error:', err);
    process.exit(1);
  });
}

export { bootstrap };
