import ShareLink from '../models/ShareLink.js';
import Document from '../models/Document.js';
import { logActivity } from '../models/Activity.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { generateRandomToken } from '../utils/tokens.js';
import { downloadToBuffer } from '../services/storage.service.js';
import config from '../config/index.js';

/** POST /share - create a share link for a document */
export const createShareLink = asyncHandler(async (req, res) => {
  const { documentId, isPublic = true, password, expiresAt } = req.body;

  const doc = await Document.findOne({ _id: documentId, owner: req.user._id, isTrashed: false });
  if (!doc) throw ApiError.notFound('Document not found');

  const link = new ShareLink({
    document: doc._id,
    owner: req.user._id,
    token: generateRandomToken().slice(0, 24),
    isPublic,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  });
  if (password) await link.setPassword(password);
  await link.save();
  await logActivity(req.user._id, 'share', { document: doc._id, meta: { name: doc.name }, req });

  res.status(201).json({
    success: true,
    message: 'Share link created',
    data: {
      share: {
        id: link._id,
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
  const shares = await ShareLink.find({ owner: req.user._id, isRevoked: false })
    .sort('-createdAt')
    .populate('document', 'name type size');
  res.json({
    success: true,
    data: {
      shares: shares.map((s) => ({
        id: s._id,
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
  const share = await ShareLink.findOne({ _id: req.params.id, owner: req.user._id });
  if (!share) throw ApiError.notFound('Share link not found');
  share.isRevoked = true;
  await share.save();
  res.json({ success: true, message: 'Share link revoked' });
});

const resolveShare = async (token, password) => {
  const share = await ShareLink.findOne({ token, isRevoked: false })
    .select('+passwordHash')
    .populate('document');
  if (!share || !share.document) throw ApiError.notFound('This link does not exist or was revoked');
  if (share.isExpired()) throw new ApiError(410, 'This link has expired');
  if (share.passwordHash) {
    if (!password) throw new ApiError(401, 'PASSWORD_REQUIRED');
    const ok = await share.checkPassword(password);
    if (!ok) throw new ApiError(401, 'Incorrect password');
  }
  return share;
};

/** POST /share/:token/access - public metadata (password in body if protected) */
export const accessShare = asyncHandler(async (req, res) => {
  const share = await resolveShare(req.params.token, req.body.password);
  share.views += 1;
  await share.save();
  const d = share.document;
  res.json({
    success: true,
    data: {
      document: { id: d._id, name: d.name, type: d.type, size: d.size, pages: d.pages, mimeType: d.mimeType },
    },
  });
});

/** POST /share/:token/download - public download */
export const downloadShared = asyncHandler(async (req, res) => {
  const share = await resolveShare(req.params.token, req.body.password);
  const doc = share.document;
  const buffer = await downloadToBuffer(doc.url);
  res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.name)}"`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.end(buffer);
});
