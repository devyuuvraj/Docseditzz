import app from './app.js';
import config from './config/index.js';
import connectDB from './config/db.js';
import { ensureStorageDir } from './services/storage.service.js';
import { checkAiHealth } from './services/ai.service.js';

const start = async () => {
  await connectDB();

  if (!config.cloudinary.enabled) {
    if (config.isProd) {
      console.warn('[storage] Cloudinary is not configured — file uploads will fail until CLOUDINARY_* env vars are set.');
    } else {
      await ensureStorageDir();
      console.log(`[storage] Cloudinary not configured — using local disk at ${config.localStorageDir}`);
    }
  }

  if (!config.google.clientId) {
    console.warn('[google] GOOGLE_CLIENT_ID is not set — Sign in with Google is disabled until configured.');
  }

  if (!config.openai.enabled) {
    console.warn('[ai] OPENAI_API_KEY is not set — summarizer, chat, and AI editor tools are disabled until configured.');
  } else {
    const ai = await checkAiHealth();
    if (ai.ok) {
      console.log('[ai] OpenAI connected');
    } else if (ai.reason === 'no_credits') {
      console.warn('[ai] OpenAI key is valid but account has no credits — dev mode will use local fallback summaries.');
    } else if (ai.reason === 'rate_limited') {
      console.warn('[ai] OpenAI is temporarily rate limited — try again shortly.');
    } else {
      console.warn(`[ai] OpenAI check failed (${ai.reason})${ai.message ? `: ${ai.message}` : ''}`);
    }
  }

  const server = app.listen(config.port, () => {
    console.log(`[server] DOCSEDITZ API running on http://localhost:${config.port} (${config.env})`);
  });

  const shutdown = (signal) => {
    console.log(`[server] ${signal} received, shutting down gracefully…`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (err) => {
    console.error('[server] Unhandled rejection:', err);
  });
};

start();
