import dotenv from 'dotenv';

dotenv.config();

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

  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/docseditz'),

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev_access_secret_do_not_use_in_prod'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev_refresh_secret_do_not_use_in_prod'),
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
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },

  limits: {
    maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 50),
    freeStorageMb: Number(process.env.FREE_STORAGE_MB || 500),
    proStorageMb: Number(process.env.PRO_STORAGE_MB || 10240),
  },
};

export default config;
