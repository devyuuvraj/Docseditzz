import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';



import { logActivity } from '../utils/activity.js';

import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

import {
  uploadBuffer,
  downloadToBuffer,
  isLocalRef,
  resolveAvatarUrl,
} from '../services/storage.service.js';


const PLANS = {
  free: {
    priceMonthly: 0,
    storageMb: 500,
    aiCreditsPerDay: 10,
  },
  pro: {
    priceMonthly: 9,
    storageMb: 10240,
    aiCreditsPerDay: 200,
  },
  business: {
    priceMonthly: 29,
    storageMb: 51200,
    aiCreditsPerDay: 1000,
  },
};


/** PATCH /users/me */
export const updateProfile = asyncHandler(async (req, res) => {
  const { name } = req.body;

  const data = {};

  if (name) {
    data.name = name.trim().slice(0, 80);
  }

  if (req.file) {
    const ext =
      req.file.originalname?.match(/\.(jpe?g|png|webp|gif)$/i)?.[0] ||
      '.jpg';

    const result = await uploadBuffer(req.file.buffer, {
      folder: 'docseditz/avatars',
      filename: `avatar-${req.user.id}${ext}`,
      resourceType: 'image',
    });

    data.avatar = result.secure_url;
  }

  const user = await prisma.user.update({
    where: {
      id: req.user.id,
    },
    data,
  });

  res.json({
    success: true,
    message: 'Profile updated',
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: resolveAvatarUrl(
                  user.id,
                  user.avatar,
                   user.updatedAt
                ),
        role: user.role,
        provider: user.provider,
        isVerified: user.isVerified,
        plan: user.plan,
        storageUsed: Number(user.storageUsed),
        storageLimit: Number(user.storageLimit),
        preferences: user.preferences,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    },
  });
});


/**
 * GET /users/:userId/avatar
 * Public avatar image.
 * Supports local disk storage in development.
 */
export const getAvatar = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      avatar: true,
      updatedAt: true,
    },
  });

  if (!user?.avatar) {
    throw ApiError.notFound('Avatar not found');
  }

  if (isLocalRef(user.avatar)) {
    const buffer = await downloadToBuffer(user.avatar);

    const ext = user.avatar
      .split('.')
      .pop()
      ?.toLowerCase();

    const types = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif',
    };

    res.setHeader(
      'Content-Type',
      types[ext] || 'image/jpeg'
    );

    res.setHeader(
      'Cache-Control',
      'public, max-age=3600'
    );

    return res.send(buffer);
  }

  return res.redirect(user.avatar);
});


/** PATCH /users/me/password */
export const changePassword = asyncHandler(async (req, res) => {
  const {
    currentPassword,
    newPassword,
  } = req.body;

  const user = await prisma.user.findUnique({
    where: {
      id: req.user.id,
    },
  });

  if (!user) {
    throw ApiError.notFound('User not found');
  }

  // Google users can set a local password
  if (user.provider === 'google' && !user.password) {
    const hashedPassword = await bcrypt.hash(
      newPassword,
      12
    );

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedPassword,
        tokenVersion: {
          increment: 1,
        },
      },
    });
  } else {
    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.password || ''
    );

    if (!passwordMatches) {
      throw ApiError.badRequest(
        'Current password is incorrect'
      );
    }

    const hashedPassword = await bcrypt.hash(
      newPassword,
      12
    );

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        password: hashedPassword,
        tokenVersion: {
          increment: 1,
        },
      },
    });
  }

  await logActivity(user.id, 'password_change', {
    req,
  });

  res.json({
    success: true,
    message: 'Password changed',
  });
});


/** PATCH /users/me/preferences */
export const updatePreferences = asyncHandler(async (req, res) => {
  const {
    theme,
    language,
    notifications,
  } = req.body;

  const currentPreferences =
    req.user.preferences &&
    typeof req.user.preferences === 'object'
      ? req.user.preferences
      : {};

  const updatedPreferences = {
    ...currentPreferences,
  };

  if (
    theme &&
    ['light', 'dark', 'system'].includes(theme)
  ) {
    updatedPreferences.theme = theme;
  }

  if (
    language &&
    typeof language === 'string'
  ) {
    updatedPreferences.language =
      language.slice(0, 10);
  }

  if (
    notifications &&
    typeof notifications === 'object'
  ) {
    updatedPreferences.notifications = {
      ...(currentPreferences.notifications || {}),
    };

    if (
      typeof notifications.email === 'boolean'
    ) {
      updatedPreferences.notifications.email =
        notifications.email;
    }

    if (
      typeof notifications.product === 'boolean'
    ) {
      updatedPreferences.notifications.product =
        notifications.product;
    }
  }

  const user = await prisma.user.update({
    where: {
      id: req.user.id,
    },
    data: {
      preferences: updatedPreferences,
    },
  });

  res.json({
    success: true,
    message: 'Preferences saved',
    data: {
      preferences: user.preferences,
    },
  });
});


/** GET /users/me/storage */
export const storageStats = asyncHandler(async (req, res) => {
  const byType = await prisma.document.groupBy({
    by: ['type'],
    where: {
      ownerId: req.user.id,
      isTrashed: false,
    },
    _sum: {
      size: true,
    },
    _count: {
      _all: true,
    },
  });

  res.json({
    success: true,
    data: {
      used: Number(req.user.storageUsed),
      limit: Number(req.user.storageLimit),

      byType: byType.map((item) => ({
        type: item.type,
        size: item._sum.size || 0,
        count: item._count._all,
      })),
    },
  });
});


/** GET /users/me/subscription */
export const getSubscription = asyncHandler(async (req, res) => {
  const sub = await prisma.subscription.findFirst({
    where: {
      userId: req.user.id,
      status: 'active',
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.json({
    success: true,
    data: {
      subscription: sub,
      plans: PLANS,
      currentPlan: req.user.plan,
    },
  });
});


/**
 * POST /users/me/subscription
 * Simple plan switch (payment-provider agnostic)
 */
export const changePlan = asyncHandler(async (req, res) => {
  const { plan } = req.body;

  if (!PLANS[plan]) {
    throw ApiError.badRequest('Unknown plan');
  }

  // Cancel existing active subscriptions
  await prisma.subscription.updateMany({
    where: {
      userId: req.user.id,
      status: 'active',
    },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
    },
  });

  const expiresAt =
    plan === 'free'
      ? null
      : new Date(
          Date.now() +
            30 * 24 * 3600 * 1000
        );

  const sub = await prisma.subscription.create({
    data: {
      userId: req.user.id,
      plan,
      priceMonthly: PLANS[plan].priceMonthly,
      expiresAt,
    },
  });

  const user = await prisma.user.update({
    where: {
      id: req.user.id,
    },
    data: {
      plan,
      storageLimit:
        BigInt(PLANS[plan].storageMb) *
        BigInt(1024 * 1024),
    },
  });

  res.json({
    success: true,
    message: `Switched to the ${plan} plan`,
    data: {
      subscription: sub,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,

        avatar: resolveAvatarUrl(
               user.id,
               user.avatar,
               user.updatedAt
              ),

        role: user.role,
        provider: user.provider,
        isVerified: user.isVerified,
        plan: user.plan,
        storageUsed: Number(user.storageUsed),
        storageLimit: Number(user.storageLimit),
        preferences: user.preferences,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    },
  });
});


/** DELETE /users/me */
export const deleteAccount = asyncHandler(async (req, res) => {
  await prisma.user.update({
    where: {
      id: req.user.id,
    },
    data: {
      isActive: false,
      tokenVersion: {
        increment: 1,
      },
    },
  });

  res.clearCookie('refreshToken');

  res.json({
    success: true,
    message: 'Account deactivated',
  });
});