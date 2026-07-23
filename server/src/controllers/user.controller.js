import User from '../models/User.js';
import Subscription, { PLANS } from '../models/Subscription.js';
import Document from '../models/Document.js';
import { logActivity } from '../models/Activity.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { uploadBuffer } from '../services/storage.service.js';

/** PATCH /users/me */
export const updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (name) req.user.name = name.trim().slice(0, 80);

  if (req.file) {
    const result = await uploadBuffer(req.file.buffer, {
      folder: `docseditz/avatars`,
      filename: `avatar-${req.user._id}`,
      resourceType: 'image',
    });
    req.user.avatar = result.secure_url;
  }

  await req.user.save({ validateBeforeSave: false });
  res.json({ success: true, message: 'Profile updated', data: { user: req.user.toSafeJSON() } });
});

/** PATCH /users/me/password */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');

  if (user.provider === 'google' && !user.password) {
    user.password = newPassword; // let Google users set a local password
  } else {
    if (!(await user.comparePassword(currentPassword))) {
      throw ApiError.badRequest('Current password is incorrect');
    }
    user.password = newPassword;
  }
  user.tokenVersion += 1;
  await user.save();
  await logActivity(user._id, 'password_change', { req });
  res.json({ success: true, message: 'Password changed' });
});

/** PATCH /users/me/preferences */
export const updatePreferences = asyncHandler(async (req, res) => {
  const { theme, language, notifications } = req.body;
  if (theme && ['light', 'dark', 'system'].includes(theme)) req.user.preferences.theme = theme;
  if (language && typeof language === 'string') req.user.preferences.language = language.slice(0, 10);
  if (notifications && typeof notifications === 'object') {
    if (typeof notifications.email === 'boolean') req.user.preferences.notifications.email = notifications.email;
    if (typeof notifications.product === 'boolean') req.user.preferences.notifications.product = notifications.product;
  }
  await req.user.save({ validateBeforeSave: false });
  res.json({ success: true, message: 'Preferences saved', data: { preferences: req.user.preferences } });
});

/** GET /users/me/storage */
export const storageStats = asyncHandler(async (req, res) => {
  const byType = await Document.aggregate([
    { $match: { owner: req.user._id, isTrashed: false } },
    { $group: { _id: '$type', size: { $sum: '$size' }, count: { $sum: 1 } } },
  ]);
  res.json({
    success: true,
    data: {
      used: req.user.storageUsed,
      limit: req.user.storageLimit,
      byType: byType.map((t) => ({ type: t._id, size: t.size, count: t.count })),
    },
  });
});

/** GET /users/me/subscription */
export const getSubscription = asyncHandler(async (req, res) => {
  const sub = await Subscription.findOne({ user: req.user._id, status: 'active' }).sort('-createdAt');
  res.json({ success: true, data: { subscription: sub, plans: PLANS, currentPlan: req.user.plan } });
});

/** POST /users/me/subscription - simple plan switch (payment-provider agnostic) */
export const changePlan = asyncHandler(async (req, res) => {
  const { plan } = req.body;
  if (!PLANS[plan]) throw ApiError.badRequest('Unknown plan');

  await Subscription.updateMany(
    { user: req.user._id, status: 'active' },
    { status: 'cancelled', cancelledAt: new Date() }
  );
  const sub = await Subscription.create({
    user: req.user._id,
    plan,
    priceMonthly: PLANS[plan].priceMonthly,
    expiresAt: plan === 'free' ? null : new Date(Date.now() + 30 * 24 * 3600 * 1000),
  });

  req.user.plan = plan;
  req.user.storageLimit = PLANS[plan].storageMb * 1024 * 1024;
  await req.user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    message: `Switched to the ${plan} plan`,
    data: { subscription: sub, user: req.user.toSafeJSON() },
  });
});

/** DELETE /users/me */
export const deleteAccount = asyncHandler(async (req, res) => {
  req.user.isActive = false;
  req.user.tokenVersion += 1;
  await req.user.save({ validateBeforeSave: false });
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Account deactivated' });
});
