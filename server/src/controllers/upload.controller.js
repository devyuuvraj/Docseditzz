import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logActivity } from '../models/Activity.js';
import { saveBufferAsDocument, assertStorageAvailable } from './document.controller.js';
import config from '../config/index.js';

const TMP_ROOT = path.join(os.tmpdir(), 'docseditz-chunks');

const sessionDir = (userId, uploadId) => {
  // uploadId is validated to a UUID; userId comes from auth
  return path.join(TMP_ROOT, `${userId}-${uploadId}`);
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** POST /uploads/init  { fileName, fileSize, mimeType } */
export const initChunkUpload = asyncHandler(async (req, res) => {
  const { fileName, fileSize, mimeType } = req.body;
  if (!fileName || !fileSize || !mimeType) {
    throw ApiError.badRequest('fileName, fileSize and mimeType are required');
  }
  const size = Number(fileSize);
  if (size > config.limits.maxFileSizeMb * 1024 * 1024) {
    throw ApiError.tooLarge(`File exceeds the ${config.limits.maxFileSizeMb}MB limit`);
  }
  assertStorageAvailable(req.user, size);

  const uploadId = uuidv4();
  await fs.mkdir(sessionDir(req.user._id, uploadId), { recursive: true });
  await fs.writeFile(
    path.join(sessionDir(req.user._id, uploadId), 'meta.json'),
    JSON.stringify({ fileName, fileSize: size, mimeType, createdAt: Date.now() })
  );
  res.status(201).json({ success: true, data: { uploadId, chunkSize: 5 * 1024 * 1024 } });
});

/** POST /uploads/chunk (multipart: chunk) fields: uploadId, chunkIndex */
export const uploadChunk = asyncHandler(async (req, res) => {
  const { uploadId, chunkIndex } = req.body;
  if (!UUID_RE.test(uploadId || '')) throw ApiError.badRequest('Invalid uploadId');
  const index = Number(chunkIndex);
  if (!Number.isInteger(index) || index < 0 || index > 10000) throw ApiError.badRequest('Invalid chunkIndex');
  if (!req.file) throw ApiError.badRequest('No chunk data');

  const dir = sessionDir(req.user._id, uploadId);
  try {
    await fs.access(dir);
  } catch {
    throw ApiError.notFound('Upload session not found. Call /uploads/init first.');
  }

  await fs.writeFile(path.join(dir, `chunk-${index}`), req.file.buffer);
  res.json({ success: true, data: { received: index } });
});

/** POST /uploads/complete  { uploadId, totalChunks, folder? } */
export const completeChunkUpload = asyncHandler(async (req, res) => {
  const { uploadId, totalChunks, folder } = req.body;
  if (!UUID_RE.test(uploadId || '')) throw ApiError.badRequest('Invalid uploadId');
  const total = Number(totalChunks);
  if (!Number.isInteger(total) || total < 1) throw ApiError.badRequest('Invalid totalChunks');

  const dir = sessionDir(req.user._id, uploadId);
  let meta;
  try {
    meta = JSON.parse(await fs.readFile(path.join(dir, 'meta.json'), 'utf-8'));
  } catch {
    throw ApiError.notFound('Upload session not found');
  }

  const parts = [];
  for (let i = 0; i < total; i++) {
    try {
      parts.push(await fs.readFile(path.join(dir, `chunk-${i}`)));
    } catch {
      throw ApiError.badRequest(`Missing chunk ${i}. Re-upload and try again.`);
    }
  }
  const buffer = Buffer.concat(parts);
  await fs.rm(dir, { recursive: true, force: true });

  if (buffer.length > config.limits.maxFileSizeMb * 1024 * 1024) {
    throw ApiError.tooLarge('Assembled file exceeds the size limit');
  }

  const doc = await saveBufferAsDocument(req.user, buffer, {
    name: meta.fileName,
    mimeType: meta.mimeType,
    folder: folder || null,
  });
  await logActivity(req.user._id, 'upload', { document: doc._id, meta: { name: doc.name, chunked: true }, req });

  res.status(201).json({ success: true, message: 'Upload complete', data: { document: doc } });
});
