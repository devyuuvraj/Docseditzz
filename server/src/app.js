import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import config from './config/index.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';
import { globalLimiter } from './middleware/rateLimiter.js';

const app = express();

app.set('trust proxy', 1);

// ---- Security ----
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: [config.clientUrl],
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

// ---- Errors ----
app.use(notFound);
app.use(errorHandler);

export default app;
