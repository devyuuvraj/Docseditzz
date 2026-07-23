import { Readable } from 'stream';
import cloudinary from '../config/cloudinary.js';
import ApiError from '../utils/ApiError.js';

/**
 * Uploads a Buffer to Cloudinary.
 * Documents are stored as `raw` resources, images as `image` resources.
 */
export const uploadBuffer = (buffer, { folder = 'docseditz', filename, resourceType = 'raw' } = {}) =>
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

/** Downloads a Cloudinary resource back into a Buffer. */
export const downloadToBuffer = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw ApiError.server(`Failed to fetch stored file (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
};

export const deleteResource = async (publicId, resourceType = 'raw') => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.error('[storage] delete failed:', err.message);
  }
};

export const resourceTypeFor = (mimeType) =>
  mimeType?.startsWith('image/') ? 'image' : 'raw';
