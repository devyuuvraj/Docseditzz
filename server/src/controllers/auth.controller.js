import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcryptjs';
import {logActivity} from "../utils/activity.js";
import prisma from '../config/prisma.js';

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

import {
  sendOtpEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
} from '../services/email.service.js';

import config from '../config/index.js';
import { resolveAvatarUrl } from '../services/storage.service.js';

const googleClient = new OAuth2Client(config.google.clientId);

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */

const issueSession = (res, user) => {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  res.cookie(
    'refreshToken',
    refreshToken,
    refreshCookieOptions()
  );

  return accessToken;
};

/**
 * Prisma does not have Mongoose's toSafeJSON().
 * Keep sensitive fields out of API responses.
 */
const toSafeJSON = (user) => {
  if (!user) return null;

  return {
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

    // Prisma returns BigInt for these fields.
    storageUsed: Number(user.storageUsed),
    storageLimit: Number(user.storageLimit),

    preferences: user.preferences,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const setOtp = async (user) => {
  const otp = generateOtp();

  const otpHash = hashToken(otp);
  const otpExpiresAt = new Date(
    Date.now() + 10 * 60 * 1000
  );

  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      otpHash,
      otpExpiresAt,
      otpAttempts: 0,
    },
  });

  return otp;
};

/**
 * When SMTP is not configured in development,
 * expose OTP in API response.
 */
/** When SMTP is off, return OTP in the API so signup still works (common on first deploy). */
const devOtpPayload = (otp) => (!config.smtp.host ? { devOtp: otp } : {});

const devResetPayload = (resetUrl) =>
  !config.isProd && !config.smtp.host
    ? { devResetUrl: resetUrl }
    : {};

/* -------------------------------------------------------
   REGISTER
------------------------------------------------------- */

/** POST /auth/register */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existing && existing.isVerified) {
    throw ApiError.conflict(
      'An account with this email already exists'
    );
  }

  let user;

  if (existing) {
    // Existing unverified account.
    const hashedPassword = await bcrypt.hash(password, 12);

    user = await prisma.user.update({
      where: {
        id: existing.id,
      },
      data: {
        name,
        password: hashedPassword,
      },
    });
  } else {
    const hashedPassword = await bcrypt.hash(password, 12);

    user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        provider: 'local',
        plan: 'free',
      },
    });

    await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: 'free',
      },
    });
  }

  const otp = await setOtp(user);

  try {
    await sendOtpEmail(email, name, otp);
  } catch (err) {
    console.error('[auth] OTP email failed:', err?.message || err);
    if (config.smtp.host) {
      throw ApiError.internal('Could not send verification email. Try again later.');
    }
  }

  await logActivity(user.id, 'register', {
    req,
  });

  res.status(201).json({
    success: true,
    message:
      'Account created. Check your email for the verification code.',
    data: {
      email,
      ...devOtpPayload(otp),
    },
  });
});

/* -------------------------------------------------------
   VERIFY OTP
------------------------------------------------------- */

/** POST /auth/verify-otp */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw ApiError.notFound(
      'No account found for this email'
    );
  }

  if (user.isVerified) {
    throw ApiError.badRequest(
      'Account is already verified'
    );
  }

  if (!user.otpHash || !user.otpExpiresAt) {
    throw ApiError.badRequest(
      'No verification code pending. Request a new one.'
    );
  }

  if (user.otpAttempts >= 5) {
    throw ApiError.forbidden(
      'Too many attempts. Request a new code.'
    );
  }

  if (user.otpExpiresAt < new Date()) {
    throw ApiError.badRequest(
      'Verification code expired. Request a new one.'
    );
  }

  if (hashToken(otp) !== user.otpHash) {
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        otpAttempts: {
          increment: 1,
        },
      },
    });

    throw ApiError.badRequest(
      'Incorrect verification code'
    );
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      isVerified: true,
      otpHash: null,
      otpExpiresAt: null,
      otpAttempts: 0,
      lastLoginAt: new Date(),
    },
  });

  sendWelcomeEmail(
    updatedUser.email,
    updatedUser.name
  ).catch(() => {});

  const accessToken = issueSession(
    res,
    updatedUser
  );

  res.json({
    success: true,
    message: 'Email verified',
    data: {
      accessToken,
      user: toSafeJSON(updatedUser),
    },
  });
});

/* -------------------------------------------------------
   RESEND OTP
------------------------------------------------------- */

/** POST /auth/resend-otp */
export const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    throw ApiError.notFound(
      'No account found for this email'
    );
  }

  if (user.isVerified) {
    throw ApiError.badRequest(
      'Account is already verified'
    );
  }

  const otp = await setOtp(user);

  await sendOtpEmail(
    email,
    user.name,
    otp
  );

  res.json({
    success: true,
    message: 'A new verification code has been sent',
    data: {
      email,
      ...devOtpPayload(otp),
    },
  });
});

/* -------------------------------------------------------
   LOGIN
------------------------------------------------------- */

/** POST /auth/login */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Prisma returns password by default.
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (
    !user ||
    !user.password ||
    !(await bcrypt.compare(password, user.password))
  ) {
    throw ApiError.unauthorized(
      'Invalid email or password'
    );
  }

  if (!user.isActive) {
    throw ApiError.forbidden(
      'This account has been deactivated'
    );
  }

  if (!user.isVerified) {
    const otp = await setOtp(user);

    await sendOtpEmail(
      email,
      user.name,
      otp
    );

    return res.status(403).json({
      success: false,
      message:
        'Email not verified. We sent you a new code.',
      code: 'EMAIL_NOT_VERIFIED',
      data: {
        email,
        ...devOtpPayload(otp),
      },
    });
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      lastLoginAt: new Date(),
    },
  });

  await logActivity(
    updatedUser.id,
    'login',
    { req }
  );

  const accessToken = issueSession(
    res,
    updatedUser
  );

  res.json({
    success: true,
    message: 'Logged in',
    data: {
      accessToken,
      user: toSafeJSON(updatedUser),
    },
  });
});

/* -------------------------------------------------------
   GOOGLE AUTH
------------------------------------------------------- */

/** POST /auth/google */
export const googleAuth = asyncHandler(async (req, res) => {
  const { credential } = req.body;

  if (!config.google.clientId) {
    throw ApiError.server(
      'Google sign-in is not configured. Set GOOGLE_CLIENT_ID in server/.env and VITE_GOOGLE_CLIENT_ID in client/.env, then restart both servers.'
    );
  }

  if (!credential) {
    throw ApiError.badRequest(
      'Google credential is required'
    );
  }

  let payload;

  try {
    const ticket =
      await googleClient.verifyIdToken({
        idToken: credential,
        audience: config.google.clientId,
      });

    payload = ticket.getPayload();
  } catch {
    throw ApiError.unauthorized(
      'Google sign-in failed. Check that the same Client ID is set in server/.env and client/.env.'
    );
  }

  const {
    sub: googleId,
    email,
    name,
    picture,
  } = payload;

  if (!email) {
    throw ApiError.badRequest(
      'Google account has no email'
    );
  }

  let user = await prisma.user.findFirst({
    where: {
      OR: [
        {
          googleId,
        },
        {
          email,
        },
      ],
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name:
          name ||
          email.split('@')[0],
        email,
        googleId,
        avatar: picture || '',
        provider: 'google',
        isVerified: true,
        plan: 'free',
      },
    });

    await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: 'free',
      },
    });

    sendWelcomeEmail(
      email,
      user.name
    ).catch(() => {});
  } else if (!user.googleId) {
    user = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        googleId,
        isVerified: true,
        ...(user.avatar || !picture
          ? {}
          : { avatar: picture }),
      },
    });
  }

  if (!user.isActive) {
    throw ApiError.forbidden(
      'This account has been deactivated'
    );
  }

  user = await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      lastLoginAt: new Date(),
    },
  });

  await logActivity(
    user.id,
    'login',
    {
      req,
      meta: {
        provider: 'google',
      },
    }
  );

  const accessToken = issueSession(
    res,
    user
  );

  res.json({
    success: true,
    message: 'Logged in with Google',
    data: {
      accessToken,
      user: toSafeJSON(user),
    },
  });
});

/* -------------------------------------------------------
   FORGOT PASSWORD
------------------------------------------------------- */

/** POST /auth/forgot-password */
export const forgotPassword = asyncHandler(
  async (req, res) => {
    const { email } = req.body;

    const user =
      await prisma.user.findUnique({
        where: {
          email,
        },
      });

    // Always respond the same way to avoid
    // account enumeration.
    const genericResponse = (extra = {}) =>
      res.json({
        success: true,
        message:
          'If that email exists, a reset link has been sent',
        ...extra,
      });

    if (
      !user ||
      user.provider === 'google'
    ) {
      return genericResponse();
    }

    const token = generateRandomToken();

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordResetTokenHash:
          hashToken(token),

        passwordResetExpiresAt:
          new Date(
            Date.now() + 30 * 60 * 1000
          ),
      },
    });

    const resetUrl =
      `${config.clientUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail(
      email,
      user.name,
      resetUrl
    );

    genericResponse({
      data: devResetPayload(resetUrl),
    });
  }
);

/* -------------------------------------------------------
   RESET PASSWORD
------------------------------------------------------- */

/** POST /auth/reset-password */
export const resetPassword = asyncHandler(
  async (req, res) => {
    const { token, password } = req.body;

    const user =
      await prisma.user.findFirst({
        where: {
          passwordResetTokenHash:
            hashToken(token),

          passwordResetExpiresAt: {
            gt: new Date(),
          },
        },
      });

    if (!user) {
      throw ApiError.badRequest(
        'Reset link is invalid or has expired'
      );
    }

    const hashedPassword =
      await bcrypt.hash(password, 12);

    const updatedUser =
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          password: hashedPassword,

          passwordResetTokenHash: null,

          passwordResetExpiresAt: null,

          // Invalidate existing refresh tokens.
          tokenVersion: {
            increment: 1,
          },
        },
      });

    await logActivity(
      updatedUser.id,
      'password_change',
      { req }
    );

    res.json({
      success: true,
      message:
        'Password updated. You can now log in.',
    });
  }
);

/* -------------------------------------------------------
   REFRESH
------------------------------------------------------- */

/** POST /auth/refresh */
export const refresh = asyncHandler(
  async (req, res) => {
    const token =
      req.cookies?.refreshToken;

    if (!token) {
      throw ApiError.unauthorized(
        'No session'
      );
    }

    let payload;

    try {
      payload =
        verifyRefreshToken(token);
    } catch {
      throw ApiError.unauthorized(
        'Session expired'
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: payload.sub,
        },
      });

    if (
      !user ||
      !user.isActive ||
      user.tokenVersion !== payload.tv
    ) {
      throw ApiError.unauthorized(
        'Session expired'
      );
    }

    const accessToken =
      issueSession(res, user);

    res.json({
      success: true,
      data: {
        accessToken,
        user: toSafeJSON(user),
      },
    });
  }
);

/* -------------------------------------------------------
   LOGOUT
------------------------------------------------------- */

/** POST /auth/logout */
export const logout = asyncHandler(
  async (_req, res) => {
    res.clearCookie(
      'refreshToken',
      {
        ...refreshCookieOptions(),
        maxAge: 0,
      }
    );

    res.json({
      success: true,
      message: 'Logged out',
    });
  }
);

/* -------------------------------------------------------
   ME
------------------------------------------------------- */

/** GET /auth/me */
export const me = asyncHandler(
  async (req, res) => {
    res.json({
      success: true,
      data: {
        user: toSafeJSON(req.user),
      },
    });
  }
);