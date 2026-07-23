import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config/index.js';

export const signAccessToken = (user) =>
  jwt.sign({ sub: user._id.toString(), role: user.role }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpires,
  });

export const signRefreshToken = (user) =>
  jwt.sign({ sub: user._id.toString(), tv: user.tokenVersion }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpires,
  });

export const verifyAccessToken = (token) => jwt.verify(token, config.jwt.accessSecret);
export const verifyRefreshToken = (token) => jwt.verify(token, config.jwt.refreshSecret);

export const generateOtp = () => `${crypto.randomInt(100000, 999999)}`;

export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const generateRandomToken = () => crypto.randomBytes(32).toString('hex');

export const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: config.isProd,
  sameSite: config.isProd ? 'none' : 'lax',
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
