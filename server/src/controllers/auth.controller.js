import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Subscription from '../models/Subscription.js';
import { logActivity } from '../models/Activity.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateOtp,
  hashToken,
  generateRandomToken,
  refreshCookieOptions,
} from '../utils/tokens.js';
import { sendOtpEmail, sendPasswordResetEmail, sendWelcomeEmail } from '../services/email.service.js';
import config from '../config/index.js';

const googleClient = new OAuth2Client(config.google.clientId);

const issueSession = (res, user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  res.cookie('refreshToken', refreshToken, refreshCookieOptions());
  return accessToken;
};

const setOtp = async (user) => {
  const otp = generateOtp();
  user.otpHash = hashToken(otp);
  user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  user.otpAttempts = 0;
  await user.save({ validateBeforeSave: false });
  return otp;
};

/** POST /auth/register */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing && existing.isVerified) throw ApiError.conflict('An account with this email already exists');

  let user;
  if (existing) {
    existing.name = name;
    existing.password = password;
    user = existing;
    await user.save();
  } else {
    user = await User.create({ name, email, password });
    await Subscription.create({ user: user._id, plan: 'free' });
  }

  const otp = await setOtp(user);
  await sendOtpEmail(email, name, otp);
  await logActivity(user._id, 'register', { req });

  res.status(201).json({
    success: true,
    message: 'Account created. Check your email for the verification code.',
    data: { email },
  });
});

/** POST /auth/verify-otp */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email }).select('+otpHash +otpExpiresAt +otpAttempts');
  if (!user) throw ApiError.notFound('No account found for this email');
  if (user.isVerified) throw ApiError.badRequest('Account is already verified');
  if (!user.otpHash || !user.otpExpiresAt) throw ApiError.badRequest('No verification code pending. Request a new one.');
  if (user.otpAttempts >= 5) throw ApiError.forbidden('Too many attempts. Request a new code.');
  if (user.otpExpiresAt < new Date()) throw ApiError.badRequest('Verification code expired. Request a new one.');

  if (hashToken(otp) !== user.otpHash) {
    user.otpAttempts += 1;
    await user.save({ validateBeforeSave: false });
    throw ApiError.badRequest('Incorrect verification code');
  }

  user.isVerified = true;
  user.otpHash = undefined;
  user.otpExpiresAt = undefined;
  user.otpAttempts = 0;
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  sendWelcomeEmail(user.email, user.name).catch(() => {});
  const accessToken = issueSession(res, user);

  res.json({ success: true, message: 'Email verified', data: { accessToken, user: user.toSafeJSON() } });
});

/** POST /auth/resend-otp */
export const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) throw ApiError.notFound('No account found for this email');
  if (user.isVerified) throw ApiError.badRequest('Account is already verified');

  const otp = await setOtp(user);
  await sendOtpEmail(email, user.name, otp);
  res.json({ success: true, message: 'A new verification code has been sent' });
});

/** POST /auth/login */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.password || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');
  if (!user.isVerified) {
    const otp = await setOtp(user);
    await sendOtpEmail(email, user.name, otp);
    return res.status(403).json({
      success: false,
      message: 'Email not verified. We sent you a new code.',
      code: 'EMAIL_NOT_VERIFIED',
      data: { email },
    });
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });
  await logActivity(user._id, 'login', { req });

  const accessToken = issueSession(res, user);
  res.json({ success: true, message: 'Logged in', data: { accessToken, user: user.toSafeJSON() } });
});

/** POST /auth/google - verifies a Google ID token (credential) from the client */
export const googleAuth = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.google.clientId,
    });
    payload = ticket.getPayload();
  } catch {
    throw ApiError.unauthorized('Google sign-in failed. Please try again.');
  }

  const { sub: googleId, email, name, picture } = payload;
  if (!email) throw ApiError.badRequest('Google account has no email');

  let user = await User.findOne({ $or: [{ googleId }, { email }] });
  if (!user) {
    user = await User.create({
      name: name || email.split('@')[0],
      email,
      googleId,
      avatar: picture || '',
      provider: 'google',
      isVerified: true,
    });
    await Subscription.create({ user: user._id, plan: 'free' });
    sendWelcomeEmail(email, user.name).catch(() => {});
  } else if (!user.googleId) {
    user.googleId = googleId;
    user.isVerified = true;
    if (!user.avatar && picture) user.avatar = picture;
  }
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated');

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });
  await logActivity(user._id, 'login', { req, meta: { provider: 'google' } });

  const accessToken = issueSession(res, user);
  res.json({ success: true, message: 'Logged in with Google', data: { accessToken, user: user.toSafeJSON() } });
});

/** POST /auth/forgot-password */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  // Always respond the same way to avoid account enumeration
  const genericResponse = () =>
    res.json({ success: true, message: 'If that email exists, a reset link has been sent' });

  if (!user || user.provider === 'google') return genericResponse();

  const token = generateRandomToken();
  user.passwordResetTokenHash = hashToken(token);
  user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${config.clientUrl}/reset-password?token=${token}`;
  await sendPasswordResetEmail(email, user.name, resetUrl);
  genericResponse();
});

/** POST /auth/reset-password */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const user = await User.findOne({
    passwordResetTokenHash: hashToken(token),
    passwordResetExpiresAt: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpiresAt');

  if (!user) throw ApiError.badRequest('Reset link is invalid or has expired');

  user.password = password;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.tokenVersion += 1; // invalidate existing refresh tokens
  await user.save();
  await logActivity(user._id, 'password_change', { req });

  res.json({ success: true, message: 'Password updated. You can now log in.' });
});

/** POST /auth/refresh - rotates the access token using the httpOnly cookie */
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw ApiError.unauthorized('No session');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Session expired');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive || user.tokenVersion !== payload.tv) {
    throw ApiError.unauthorized('Session expired');
  }

  const accessToken = issueSession(res, user);
  res.json({ success: true, data: { accessToken, user: user.toSafeJSON() } });
});

/** POST /auth/logout */
export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie('refreshToken', { ...refreshCookieOptions(), maxAge: 0 });
  res.json({ success: true, message: 'Logged out' });
});

/** GET /auth/me */
export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeJSON() } });
});
