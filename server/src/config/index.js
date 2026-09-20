import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const required = (key, fallback = undefined) => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    console.warn(`[config] Missing environment variable: ${key}`);
  }
  return value;
};

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  /** Comma-separated browser origins allowed by CORS (defaults to CLIENT_URL). */
  corsOrigins: (process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  /** When true, serve the built Vite app from ./public (Railway full-stack image). */
  serveWeb: process.env.SERVE_WEB === 'true',

  jwt: {
    accessSecret: required(
      'JWT_ACCESS_SECRET',
      'dev_access_secret_do_not_use_in_prod'
    ),
    refreshSecret: required(
      'JWT_REFRESH_SECRET',
      'dev_refresh_secret_do_not_use_in_prod'
    ),
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },

  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'DOCSEDITZ <no-reply@docseditz.com>',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    get enabled() {
      return !!(this.cloudName && this.apiKey && this.apiSecret);
    },
  },

  /** Used automatically in development when Cloudinary is not configured. */
  localStorageDir:
    process.env.LOCAL_STORAGE_DIR || path.join(__dirname, '../../storage'),

 openai: {
  apiKey:
    process.env.GEMINI_API_KEY,

  model:
    process.env.GEMINI_MODEL ||
    'gemini-2.5-flash',

  get enabled() {
    return !!this.apiKey;
  },
},

  limits: {
    maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 50),
    freeStorageMb: Number(process.env.FREE_STORAGE_MB || 500),
    proStorageMb: Number(process.env.PRO_STORAGE_MB || 10240),
  },
};

/** Browser origins allowed for credentialed cross-origin API calls (Vercel → Railway). */
export function isOriginAllowed(origin) {
  if (!origin) return true;

  const normalized = origin.replace(/\/$/, '');
  if (config.corsOrigins.some((o) => o.replace(/\/$/, '') === normalized)) {
    return true;
  }

  try {
    const clientOrigin = new URL(config.clientUrl).origin;
    if (normalized === clientOrigin) return true;
  } catch {
    /* ignore invalid CLIENT_URL */
  }

  // Vercel production + preview URLs for the same project (e.g. docseditzz.vercel.app)
  if (config.isProd && /^https:\/\/docseditzz(-[a-z0-9-]+)?\.vercel\.app$/i.test(normalized)) {
    return true;
  }

  return false;
}

export default config;