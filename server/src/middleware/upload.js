import multer from 'multer';
import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';

const MAX_SIZE = config.limits.maxFileSizeMb * 1024 * 1024;

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/html',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
]);

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIMES.has(file.mimetype)) return cb(null, true);
  cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
};

const storage = multer.memoryStorage();

export const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } });

/** Chunk uploads accept any binary part, size-capped per chunk. */
export const chunkUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const detectDocType = (mimeType) => {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('wordprocessingml')) return 'docx';
  if (mimeType === 'application/msword') return 'doc';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.includes('spreadsheetml') || mimeType === 'application/vnd.ms-excel') return 'xlsx';
  if (mimeType.includes('presentationml') || mimeType === 'application/vnd.ms-powerpoint') return 'pptx';
  if (mimeType === 'text/plain') return 'txt';
  if (mimeType === 'text/html') return 'html';
  return 'other';
};
