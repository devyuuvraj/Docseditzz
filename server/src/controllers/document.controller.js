import Document from '../models/Document.js';
import Folder from '../models/Folder.js';
import { logActivity } from '../models/Activity.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  uploadBuffer,
  downloadToBuffer,
  deleteResource,
  resourceTypeFor,
} from '../services/storage.service.js';
import { detectDocType } from '../middleware/upload.js';
import { getPageCount } from '../services/pdf.service.js';

const ownedDoc = async (id, userId, { includeTrashed = true } = {}) => {
  const doc = await Document.findOne({ _id: id, owner: userId });
  if (!doc) throw ApiError.notFound('Document not found');
  if (!includeTrashed && doc.isTrashed) throw ApiError.notFound('Document is in trash');
  return doc;
};

export const assertStorageAvailable = (user, incomingBytes) => {
  if (user.storageUsed + incomingBytes > user.storageLimit) {
    throw new ApiError(413, 'Storage limit reached. Upgrade your plan or free up space.');
  }
};

/** Creates a Document record from an in-memory buffer (shared with tools "save to library"). */
export const saveBufferAsDocument = async (user, buffer, { name, mimeType, folder = null }) => {
  assertStorageAvailable(user, buffer.length);
  const resourceType = resourceTypeFor(mimeType);
  const uploaded = await uploadBuffer(buffer, {
    folder: `docseditz/users/${user._id}`,
    filename: name,
    resourceType,
  });

  let pages = 0;
  if (mimeType === 'application/pdf') {
    try {
      pages = await getPageCount(buffer);
    } catch {
      pages = 0;
    }
  }

  const doc = await Document.create({
    owner: user._id,
    folder,
    name,
    originalName: name,
    type: detectDocType(mimeType),
    mimeType,
    size: buffer.length,
    pages,
    url: uploaded.secure_url,
    publicId: uploaded.public_id,
    thumbnail: resourceType === 'image' ? uploaded.secure_url : '',
  });

  user.storageUsed += buffer.length;
  await user.save({ validateBeforeSave: false });
  return doc;
};

/** POST /documents/upload (multipart, field: files[]) */
export const uploadDocuments = asyncHandler(async (req, res) => {
  const files = req.files?.length ? req.files : req.file ? [req.file] : [];
  if (!files.length) throw ApiError.badRequest('No files uploaded');

  const { folder } = req.body;
  if (folder) {
    const exists = await Folder.findOne({ _id: folder, owner: req.user._id });
    if (!exists) throw ApiError.badRequest('Folder not found');
  }

  const docs = [];
  for (const file of files) {
    const doc = await saveBufferAsDocument(req.user, file.buffer, {
      name: file.originalname,
      mimeType: file.mimetype,
      folder: folder || null,
    });
    docs.push(doc);
    await logActivity(req.user._id, 'upload', { document: doc._id, meta: { name: doc.name, size: doc.size }, req });
  }

  res.status(201).json({ success: true, message: `${docs.length} file(s) uploaded`, data: { documents: docs } });
});

/** GET /documents */
export const listDocuments = asyncHandler(async (req, res) => {
  const {
    search,
    folder,
    favorite,
    trashed,
    type,
    page = 1,
    limit = 20,
    sort = '-updatedAt',
  } = req.query;

  const filter = { owner: req.user._id, isTrashed: trashed === 'true' };
  if (search) filter.name = { $regex: String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  if (folder === 'none') filter.folder = null;
  else if (folder) filter.folder = folder;
  if (favorite === 'true') filter.isFavorite = true;
  if (type) filter.type = type;

  const allowedSorts = ['-updatedAt', 'updatedAt', 'name', '-name', '-size', 'size', '-createdAt', 'createdAt'];
  const sortBy = allowedSorts.includes(sort) ? sort : '-updatedAt';

  const [documents, total] = await Promise.all([
    Document.find(filter)
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('folder', 'name color'),
    Document.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { documents, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } },
  });
});

/** GET /documents/recent */
export const recentDocuments = asyncHandler(async (req, res) => {
  const documents = await Document.find({ owner: req.user._id, isTrashed: false })
    .sort('-lastOpenedAt -updatedAt')
    .limit(8);
  res.json({ success: true, data: { documents } });
});

/** GET /documents/:id */
export const getDocument = asyncHandler(async (req, res) => {
  const doc = await ownedDoc(req.params.id, req.user._id);
  doc.lastOpenedAt = new Date();
  await doc.save({ validateBeforeSave: false });
  res.json({ success: true, data: { document: doc } });
});

/** GET /documents/:id/download - streams the original file */
export const downloadDocument = asyncHandler(async (req, res) => {
  const doc = await ownedDoc(req.params.id, req.user._id);
  const buffer = await downloadToBuffer(doc.url);
  doc.downloadCount += 1;
  await doc.save({ validateBeforeSave: false });
  await logActivity(req.user._id, 'download', { document: doc._id, meta: { name: doc.name }, req });

  res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.name)}"`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.end(buffer);
});

/** PATCH /documents/:id - rename / favorite / move folder */
export const updateDocument = asyncHandler(async (req, res) => {
  const doc = await ownedDoc(req.params.id, req.user._id);
  const { name, isFavorite, folder, annotations } = req.body;

  if (name !== undefined) {
    doc.name = String(name).trim().slice(0, 255);
    await logActivity(req.user._id, 'rename', { document: doc._id, meta: { name: doc.name }, req });
  }
  if (isFavorite !== undefined) {
    doc.isFavorite = !!isFavorite;
    await logActivity(req.user._id, doc.isFavorite ? 'favorite' : 'unfavorite', { document: doc._id, req });
  }
  if (folder !== undefined) {
    if (folder) {
      const exists = await Folder.findOne({ _id: folder, owner: req.user._id });
      if (!exists) throw ApiError.badRequest('Folder not found');
      doc.folder = folder;
    } else doc.folder = null;
  }
  if (annotations !== undefined) {
    doc.annotations = annotations;
  }

  await doc.save();
  res.json({ success: true, message: 'Document updated', data: { document: doc } });
});

/** POST /documents/:id/duplicate */
export const duplicateDocument = asyncHandler(async (req, res) => {
  const doc = await ownedDoc(req.params.id, req.user._id, { includeTrashed: false });
  const buffer = await downloadToBuffer(doc.url);

  const dotIdx = doc.name.lastIndexOf('.');
  const copyName =
    dotIdx > 0 ? `${doc.name.slice(0, dotIdx)} (copy)${doc.name.slice(dotIdx)}` : `${doc.name} (copy)`;

  const copy = await saveBufferAsDocument(req.user, buffer, {
    name: copyName,
    mimeType: doc.mimeType,
    folder: doc.folder,
  });
  await logActivity(req.user._id, 'duplicate', { document: copy._id, meta: { from: doc.name }, req });
  res.status(201).json({ success: true, message: 'Document duplicated', data: { document: copy } });
});

/** POST /documents/:id/version - snapshot current file as a version, replace content */
export const saveVersion = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file provided');
  const doc = await ownedDoc(req.params.id, req.user._id, { includeTrashed: false });

  // keep old file as a version (cap at 10)
  doc.versions.unshift({ url: doc.url, publicId: doc.publicId, size: doc.size, label: req.body.label || 'Auto save' });
  doc.versions = doc.versions.slice(0, 10);

  assertStorageAvailable(req.user, req.file.buffer.length);
  const uploaded = await uploadBuffer(req.file.buffer, {
    folder: `docseditz/users/${req.user._id}`,
    filename: doc.name,
    resourceType: resourceTypeFor(doc.mimeType),
  });

  req.user.storageUsed += req.file.buffer.length;
  await req.user.save({ validateBeforeSave: false });

  doc.url = uploaded.secure_url;
  doc.publicId = uploaded.public_id;
  doc.size = req.file.buffer.length;
  if (req.body.annotations) {
    try {
      doc.annotations = JSON.parse(req.body.annotations);
    } catch {
      /* ignore malformed */
    }
  }
  await doc.save();
  await logActivity(req.user._id, 'edit', { document: doc._id, meta: { name: doc.name }, req });

  res.json({ success: true, message: 'Saved', data: { document: doc } });
});

/** POST /documents/:id/restore-version/:versionId */
export const restoreVersion = asyncHandler(async (req, res) => {
  const doc = await ownedDoc(req.params.id, req.user._id, { includeTrashed: false });
  const version = doc.versions.id(req.params.versionId);
  if (!version) throw ApiError.notFound('Version not found');

  doc.versions.unshift({ url: doc.url, publicId: doc.publicId, size: doc.size, label: 'Before restore' });
  doc.url = version.url;
  doc.publicId = version.publicId;
  doc.size = version.size;
  doc.versions = doc.versions.filter((v) => v._id.toString() !== req.params.versionId).slice(0, 10);
  await doc.save();

  res.json({ success: true, message: 'Version restored', data: { document: doc } });
});

/** DELETE /documents/:id - soft delete (move to trash) */
export const trashDocument = asyncHandler(async (req, res) => {
  const doc = await ownedDoc(req.params.id, req.user._id);
  doc.isTrashed = true;
  doc.trashedAt = new Date();
  await doc.save();
  await logActivity(req.user._id, 'delete', { document: doc._id, meta: { name: doc.name }, req });
  res.json({ success: true, message: 'Moved to trash' });
});

/** POST /documents/:id/restore */
export const restoreDocument = asyncHandler(async (req, res) => {
  const doc = await ownedDoc(req.params.id, req.user._id);
  doc.isTrashed = false;
  doc.trashedAt = undefined;
  await doc.save();
  await logActivity(req.user._id, 'restore', { document: doc._id, meta: { name: doc.name }, req });
  res.json({ success: true, message: 'Restored from trash', data: { document: doc } });
});

/** DELETE /documents/:id/permanent */
export const permanentDelete = asyncHandler(async (req, res) => {
  const doc = await ownedDoc(req.params.id, req.user._id);
  await deleteResource(doc.publicId, resourceTypeFor(doc.mimeType));
  for (const v of doc.versions) await deleteResource(v.publicId, resourceTypeFor(doc.mimeType));

  req.user.storageUsed = Math.max(0, req.user.storageUsed - doc.size);
  await req.user.save({ validateBeforeSave: false });
  await doc.deleteOne();
  await logActivity(req.user._id, 'permanent_delete', { meta: { name: doc.name }, req });
  res.json({ success: true, message: 'Permanently deleted' });
});

/** DELETE /documents/trash/empty */
export const emptyTrash = asyncHandler(async (req, res) => {
  const docs = await Document.find({ owner: req.user._id, isTrashed: true });
  let freed = 0;
  for (const doc of docs) {
    await deleteResource(doc.publicId, resourceTypeFor(doc.mimeType));
    freed += doc.size;
    await doc.deleteOne();
  }
  req.user.storageUsed = Math.max(0, req.user.storageUsed - freed);
  await req.user.save({ validateBeforeSave: false });
  res.json({ success: true, message: `Trash emptied (${docs.length} files)` });
});
