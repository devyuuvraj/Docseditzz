import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { logActivity } from '../utils/activity.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { generateRandomToken } from '../utils/tokens.js';
import { downloadToBuffer } from '../services/storage.service.js';
import config from '../config/index.js';

/** POST /share - create a share link for a document */
export const createShareLink = asyncHandler(async (req, res) => {
  const { documentId, isPublic = true, password, expiresAt } = req.body;

  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      ownerId: req.user.id,
      isTrashed: false,
    },
  });

  if (!doc) {
    throw ApiError.notFound('Document not found');
  }

  const passwordHash = password
    ? await bcrypt.hash(password, 12)
    : null;

  const link = await prisma.shareLink.create({
    data: {
      documentId: doc.id,
      ownerId: req.user.id,
      token: generateRandomToken().slice(0, 24),
      isPublic,
      passwordHash,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  await logActivity(req.user.id, 'share', {
    document: doc.id,
    meta: { name: doc.name },
    req,
  });

  res.status(201).json({
    success: true,
    message: 'Share link created',
    data: {
      share: {
        id: link.id,
        token: link.token,
        url: `${config.clientUrl}/s/${link.token}`,
        isPublic: link.isPublic,
        hasPassword: !!password,
        expiresAt: link.expiresAt,
      },
    },
  });
});

/** GET /share/mine - list my share links */
export const listMyShares = asyncHandler(async (req, res) => {
  const shares = await prisma.shareLink.findMany({
    where: {
      ownerId: req.user.id,
      isRevoked: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      document: {
        select: {
          id: true,
          name: true,
          type: true,
          size: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: {
      shares: shares.map((s) => ({
        id: s.id,
        token: s.token,
        url: `${config.clientUrl}/s/${s.token}`,
        document: s.document,
        isPublic: s.isPublic,
        expiresAt: s.expiresAt,
        views: s.views,
        createdAt: s.createdAt,
      })),
    },
  });
});

/** DELETE /share/:id - revoke */
export const revokeShare = asyncHandler(async (req, res) => {
  const share = await prisma.shareLink.findFirst({
    where: {
      id: req.params.id,
      ownerId: req.user.id,
    },
  });

  if (!share) {
    throw ApiError.notFound('Share link not found');
  }

  await prisma.shareLink.update({
    where: {
      id: share.id,
    },
    data: {
      isRevoked: true,
    },
  });

  res.json({
    success: true,
    message: 'Share link revoked',
  });
});

/**
 * Resolve and validate a share link.
 *
 * This replaces the old Mongoose:
 * ShareLink.findOne(...).select('+passwordHash').populate('document')
 */
const resolveShare = async (token, password) => {
  const share = await prisma.shareLink.findFirst({
    where: {
      token,
      isRevoked: false,
    },
    include: {
      document: true,
    },
  });

  if (!share || !share.document) {
    throw ApiError.notFound(
      'This link does not exist or was revoked'
    );
  }

  // Check expiration
  if (share.expiresAt && share.expiresAt <= new Date()) {
    throw new ApiError(410, 'This link has expired');
  }

  // Check password
  if (share.passwordHash) {
    if (!password) {
      throw new ApiError(401, 'PASSWORD_REQUIRED');
    }

    const ok = await bcrypt.compare(
      password,
      share.passwordHash
    );

    if (!ok) {
      throw new ApiError(401, 'Incorrect password');
    }
  }

  return share;
};

/** POST /share/:token/access - public metadata */
export const accessShare = asyncHandler(async (req, res) => {
  const share = await resolveShare(
    req.params.token,
    req.body.password
  );

  // Increment view count
  const updatedShare = await prisma.shareLink.update({
    where: {
      id: share.id,
    },
    data: {
      views: {
        increment: 1,
      },
    },
  });

  const d = share.document;

  res.json({
    success: true,
    data: {
      document: {
        id: d.id,
        name: d.name,
        type: d.type,
        size: d.size,
        pages: d.pages,
        mimeType: d.mimeType,
      },
    },
  });
});

/** POST /share/:token/download - public download */
export const downloadShared = asyncHandler(async (req, res) => {
  const share = await resolveShare(
    req.params.token,
    req.body.password
  );

  const doc = share.document;

  const buffer = await downloadToBuffer(doc.url);

  res.setHeader(
    'Content-Type',
    doc.mimeType || 'application/octet-stream'
  );

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(doc.name)}"`
  );

  res.setHeader(
    'Access-Control-Expose-Headers',
    'Content-Disposition'
  );

  res.end(buffer);
});