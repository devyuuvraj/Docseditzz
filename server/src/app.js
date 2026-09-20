import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import config, { isOriginAllowed } from './config/index.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';
import { globalLimiter } from './middleware/rateLimiter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(__dirname, '../public');
const hasWebBuild = config.serveWeb && fs.existsSync(path.join(webRoot, 'index.html'));

const app = express();

app.set('trust proxy', 1);

// ---- Security ----
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (isOriginAllowed(origin)) return callback(null, origin);
      console.warn(`[cors] Blocked origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  })
);
app.use(globalLimiter);

// ---- Parsers ----
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());
app.use(mongoSanitize());

// ---- Performance / logging ----
app.use(compression());
if (!config.isProd) app.use(morgan('dev'));

// ---- Routes ----
app.use('/api/v1', routes);

if (hasWebBuild) {
  app.use(express.static(webRoot, { index: false, maxAge: config.isProd ? '1d' : 0 }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(webRoot, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.json({
      name: 'DOCSEDITZ API',
      health: '/api/v1/health',
      hint: 'Deploy the root Dockerfile on Railway to serve the web app at this URL.',
    });
  });
}

// ---- Errors ----
app.use(notFound);
app.use(errorHandler);

export default app;
