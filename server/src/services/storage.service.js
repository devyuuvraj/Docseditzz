import fs from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';
import cloudinary from '../config/cloudinary.js';
import config from '../config/index.js';
import ApiError from '../utils/ApiError.js';

const LOCAL_PREFIX = 'local:';

export const isLocalRef = (ref) => typeof ref === 'string' && ref.startsWith(LOCAL_PREFIX);

const localDiskPath = (ref) => path.join(config.localStorageDir, ref.slice(LOCAL_PREFIX.length));

const safeFilename = (name) => String(name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);

export const ensureStorageDir = async () => {
  await fs.mkdir(config.localStorageDir, { recursive: true });
};

const uploadLocal = async (buffer, { folder = 'docseditz', filename } = {}) => {
  await ensureStorageDir();
  const relFolder = folder.replace(/^docseditz\/?/, '');
  const key = path.posix.join(relFolder, `${Date.now()}-${safeFilename(filename)}`);
  const fullPath = path.join(config.localStorageDir, ...key.split('/'));
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
  const ref = `${LOCAL_PREFIX}${key}`;
  return { secure_url: ref, public_id: ref };
};

const uploadCloudinary = (buffer, { folder = 'docseditz', filename, resourceType = 'raw' } = {}) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: filename ? filename.replace(/\.[^.]+$/, '') + '-' + Date.now() : undefined,
        use_filename: !!filename,
        unique_filename: true,
      },
      (error, result) => {
        if (error) return reject(ApiError.server(`Storage upload failed: ${error.message}`));
        resolve(result);
      }
    );
    Readable.from(buffer).pipe(stream);
  });

/**
 * Uploads a Buffer to Cloudinary, or to local disk in development when Cloudinary is not set up.
 */
export const uploadBuffer = async (buffer, opts = {}) => {
  if (config.cloudinary.enabled) return uploadCloudinary(buffer, opts);
  if (config.isProd) {
    throw ApiError.server('File storage is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.');
  }
  return uploadLocal(buffer, opts);
};

/** Downloads a stored file back into a Buffer. */
export const downloadToBuffer = async (url) => {
  if (isLocalRef(url)) {
    try {
      return await fs.readFile(localDiskPath(url));
    } catch {
      throw ApiError.notFound('Stored file not found on disk');
    }
  }

  const res = await fetch(url);
  if (!res.ok) throw ApiError.server(`Failed to fetch stored file (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
};

export const deleteResource = async (publicId, resourceType = 'raw') => {
  if (isLocalRef(publicId)) {
    try {
      await fs.unlink(localDiskPath(publicId));
    } catch (err) {
      if (err.code !== 'ENOENT') console.error('[storage] local delete failed:', err.message);
    }
    return;
  }

  if (!config.cloudinary.enabled) return;

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error('[storage] delete failed:', err.message);
  }
};

export const resourceTypeFor = (mimeType) =>
  mimeType?.startsWith('image/') ? 'image' : 'raw';

/** Turns stored refs into browser-loadable URLs (local disk -> API route). */
export const resolveAvatarUrl = (userId, avatarRef, updatedAt) => {
  if (!avatarRef) return '';
  if (!isLocalRef(avatarRef)) return avatarRef;
  const version = updatedAt ? new Date(updatedAt).getTime() : 0;
  return `/api/v1/users/${userId}/avatar?v=${version}`;
};
