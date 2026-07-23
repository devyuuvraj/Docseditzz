import app from './app.js';
import config from './config/index.js';
import connectDB from './config/db.js';

const start = async () => {
  await connectDB();

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
