import sharp from 'sharp';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { sendBufferAsFile, MIME } from '../utils/sendFile.js';
import { logActivity } from '../utils/activity.js';
import { saveBufferAsDocument } from './document.controller.js';
import * as pdf from '../services/pdf.service.js';
import { officeToPdf, htmlToPdf, pdfToWord } from '../services/convert.service.js';
import { extractPdfText, searchInPdf } from '../services/text.service.js';
import { ocrImage, ocrPdf, isSupportedOcrLanguage, supportedOcrLanguages } from '../services/ocr.service.js';

const requireFile = (req) => {
  if (!req.file) throw ApiError.badRequest('No file uploaded');
  return req.file;
};

const requireFiles = (req, min = 1) => {
  if (!req.files || req.files.length < min) {
    throw ApiError.badRequest(`At least ${min} file(s) required`);
  }
  return req.files;
};

const requirePdf = (file) => {
  if (file.mimetype !== 'application/pdf') throw ApiError.badRequest('A PDF file is required');
  return file;
};

/**
 * Sends the result, optionally saving a copy to the user's library
 * when `save=true` is passed in the body.
 */
const respondWithFile = async (req, res, buffer, filename, mimeType, action = 'convert') => {
  if (req.body.save === 'true' || req.body.save === true) {
    await saveBufferAsDocument(req.user, buffer, { name: filename, mimeType });
  }
  await logActivity(req.user.id, action, { meta: { output: filename, size: buffer.length }, req });
  sendBufferAsFile(res, buffer, filename, mimeType);
};

/* ------------------------- Feature 1: Images -> PDF ------------------------- */

export const imagesToPdf = asyncHandler(async (req, res) => {
  const files = requireFiles(req);
  files.forEach((f) => {
    if (!f.mimetype.startsWith('image/')) throw ApiError.badRequest('Only image files are allowed');
  });

  // Optional per-image transforms sent as JSON: [{rotate, crop:{left,top,width,height}}]
  let transforms = [];
  if (req.body.transforms) {
    try {
      transforms = JSON.parse(req.body.transforms);
    } catch {
      throw ApiError.badRequest('Invalid transforms JSON');
    }
  }

  const processed = [];
  for (let i = 0; i < files.length; i++) {
    let img = sharp(files[i].buffer).rotate();
    const t = transforms[i] || {};
    if (t.rotate) img = img.rotate(Number(t.rotate));
    if (t.crop && t.crop.width > 0 && t.crop.height > 0) {
      img = img.extract({
        left: Math.max(0, Math.round(t.crop.left)),
        top: Math.max(0, Math.round(t.crop.top)),
        width: Math.round(t.crop.width),
        height: Math.round(t.crop.height),
      });
    }
    processed.push({ buffer: await img.toBuffer() });
  }

  const buffer = await pdf.imagesToPdf(processed, {
    pageSize: req.body.pageSize,
    orientation: req.body.orientation,
    margin: req.body.margin,
    quality: req.body.quality,
    fit: req.body.fit,
    pageNumbers: req.body.pageNumbers === 'true',
    watermarkText: req.body.watermarkText || '',
  });

  await respondWithFile(req, res, buffer, req.body.filename || 'images.pdf', MIME.pdf);
});

/* ------------------------- Feature 2/7: Office/HTML/TXT -> PDF ------------------------- */

export const convertToPdf = asyncHandler(async (req, res) => {
  const file = requireFile(req);
  if (file.mimetype === 'application/pdf') throw ApiError.badRequest('File is already a PDF');

  let buffer;
  if (file.mimetype === 'text/plain') {
    buffer = await pdf.textToPdf(file.buffer.toString('utf-8'), { title: '' });
  } else if (file.mimetype === 'text/html') {
    buffer = await htmlToPdf(file.buffer.toString('utf-8'));
  } else if (file.mimetype.startsWith('image/')) {
    buffer = await pdf.imagesToPdf([{ buffer: file.buffer }], {});
  } else {
    const ext = (file.originalname.split('.').pop() || '').toLowerCase();
    buffer = await officeToPdf(file.buffer, ext);
  }

  const outName = file.originalname.replace(/\.[^.]+$/, '') + '.pdf';
  await respondWithFile(req, res, buffer, outName, MIME.pdf);
});

/* ------------------------- Feature 3: PDF -> Word ------------------------- */

export const pdfToWordHandler = asyncHandler(async (req, res) => {
  const file = requirePdf(requireFile(req));
  const useOcr = req.body.ocr === 'true';
  const language = req.body.language || 'eng';
  if (useOcr && !isSupportedOcrLanguage(language)) {
    throw ApiError.badRequest(`Unsupported OCR language. Supported: ${supportedOcrLanguages().join(', ')}`);
  }
  const buffer = await pdfToWord(file.buffer, { useOcr, language });
  const outName = file.originalname.replace(/\.pdf$/i, '') + '.docx';
  await respondWithFile(req, res, buffer, outName, MIME.docx);
});

/* ------------------------- Feature 7: Professional PDF tools ------------------------- */

export const merge = asyncHandler(async (req, res) => {
  const files = requireFiles(req, 2);
  files.forEach(requirePdf);
  const buffer = await pdf.mergePdfs(files.map((f) => f.buffer));
  await respondWithFile(req, res, buffer, 'merged.pdf', MIME.pdf, 'merge');
});

export const split = asyncHandler(async (req, res) => {
  const file = requirePdf(requireFile(req));
  if (!req.body.ranges) throw ApiError.badRequest('Provide ranges, e.g. "1-3;4-6"');
  const parts = await pdf.splitPdf(file.buffer, req.body.ranges);
  if (parts.length === 1) {
    return respondWithFile(req, res, parts[0].buffer, parts[0].name, MIME.pdf, 'split');
  }
  const zip = await pdf.zipFiles(parts);
  await respondWithFile(req, res, zip, 'split.zip', MIME.zip, 'split');
});

export const compress = asyncHandler(async (req, res) => {
  const file = requirePdf(requireFile(req));
  const buffer = await pdf.compressPdf(file.buffer, req.body.level || 'recommended');
  const outName = file.originalname.replace(/\.pdf$/i, '') + '-compressed.pdf';
  await respondWithFile(req, res, buffer, outName, MIME.pdf, 'compress');
});

export const rotate = asyncHandler(async (req, res) => {
  const file = requirePdf(requireFile(req));
  const angle = Number(req.body.angle || 90);
  if (![90, 180, 270, -90].includes(angle)) throw ApiError.badRequest('Angle must be 90, 180, 270 or -90');
  const buffer = await pdf.rotatePdf(file.buffer, angle, req.body.pages || 'all');
  await respondWithFile(req, res, buffer, file.originalname, MIME.pdf);
});

export const extractPagesHandler = asyncHandler(async (req, res) => {
  const file = requirePdf(requireFile(req));
  if (!req.body.pages) throw ApiError.badRequest('Provide pages, e.g. "1,3-5"');
  const buffer = await pdf.extractPages(file.buffer, req.body.pages);
  await respondWithFile(req, res, buffer, 'extracted-pages.pdf', MIME.pdf);
});

export const deletePagesHandler = asyncHandler(async (req, res) => {
  const file = requirePdf(requireFile(req));
  if (!req.body.pages) throw ApiError.badRequest('Provide pages to delete, e.g. "2,4"');
  const buffer = await pdf.deletePages(file.buffer, req.body.pages);
  await respondWithFile(req, res, buffer, file.originalname, MIME.pdf);
});

export const reorderPagesHandler = asyncHandler(async (req, res) => {
  const file = requirePdf(requireFile(req));
  if (!req.body.order) throw ApiError.badRequest('Provide the new order, e.g. "3,1,2"');
  const buffer = await pdf.reorderPages(file.buffer, req.body.order);
  await respondWithFile(req, res, buffer, file.originalname, MIME.pdf);
});

export const protect = asyncHandler(async (req, res) => {
  const file = requirePdf(requireFile(req));
  const { password } = req.body;
  if (!password || password.length < 4) throw ApiError.badRequest('Password must be at least 4 characters');
  const buffer = await pdf.protectPdf(file.buffer, password);
  const outName = file.originalname.replace(/\.pdf$/i, '') + '-protected.pdf';
  await respondWithFile(req, res, buffer, outName, MIME.pdf);
});

export const unlock = asyncHandler(async (req, res) => {
  const file = requirePdf(requireFile(req));
  if (!req.body.password) throw ApiError.badRequest('Password is required');
  const buffer = await pdf.unlockPdf(file.buffer, req.body.password);
  const outName = file.originalname.replace(/\.pdf$/i, '') + '-unlocked.pdf';
  await respondWithFile(req, res, buffer, outName, MIME.pdf);
});

export const watermark = asyncHandler(async (req, res) => {
  const file = requirePdf(requireFile(req));
  if (!req.body.text) throw ApiError.badRequest('Watermark text is required');
  const buffer = await pdf.watermarkPdf(file.buffer, {
    text: String(req.body.text).slice(0, 60),
    opacity: req.body.opacity,
    fontSize: req.body.fontSize,
    color: req.body.color,
    angle: req.body.angle,
  });
  await respondWithFile(req, res, buffer, file.originalname, MIME.pdf);
});

export const pageNumbers = asyncHandler(async (req, res) => {
  const file = requirePdf(requireFile(req));
  const buffer = await pdf.addPageNumbers(file.buffer, {
    position: req.body.position,
    startAt: req.body.startAt,
    format: req.body.format || '{n} / {total}',
  });
  await respondWithFile(req, res, buffer, file.originalname, MIME.pdf);
});

export const headerFooter = asyncHandler(async (req, res) => {
  const file = requirePdf(requireFile(req));
  if (!req.body.header && !req.body.footer) throw ApiError.badRequest('Provide a header and/or footer');
  const buffer = await pdf.addHeaderFooter(file.buffer, {
    header: String(req.body.header || '').slice(0, 120),
    footer: String(req.body.footer || '').slice(0, 120),
  });
  await respondWithFile(req, res, buffer, file.originalname, MIME.pdf);
});

export const pdfToImages = asyncHandler(async (req, res) => {
  const file = requirePdf(requireFile(req));
  const format = req.body.format === 'jpg' ? 'jpg' : 'png';
  const images = await pdf.pdfToImages(file.buffer, { scale: req.body.scale || 2 });

  let outputs = images;
  if (format === 'jpg') {
    outputs = [];
    for (const img of images) {
      outputs.push({
        name: img.name.replace('.png', '.jpg'),
        buffer: await sharp(img.buffer).jpeg({ quality: 90 }).toBuffer(),
      });
    }
  }
  if (outputs.length === 1) {
    return respondWithFile(req, res, outputs[0].buffer, outputs[0].name, format === 'jpg' ? MIME.jpg : MIME.png);
  }
  const zip = await pdf.zipFiles(outputs);
  await respondWithFile(req, res, zip, 'pages.zip', MIME.zip);
});

export const extractImages = asyncHandler(async (req, res) => {
  const file = requirePdf(requireFile(req));
  const images = await pdf.extractEmbeddedImages(file.buffer);
  if (!images.length) throw ApiError.badRequest('No embedded images found in this PDF');
  if (images.length === 1) {
    return respondWithFile(req, res, images[0].buffer, images[0].name, MIME.jpg);
  }
  const zip = await pdf.zipFiles(images);
  await respondWithFile(req, res, zip, 'images.zip', MIME.zip);
});

export const extractTextHandler = asyncHandler(async (req, res) => {
  const file = requirePdf(requireFile(req));
  const { text, numPages } = await extractPdfText(file.buffer);
  if (req.body.download === 'true') {
    return sendBufferAsFile(res, Buffer.from(text, 'utf-8'), 'extracted-text.txt', MIME.txt);
  }
  res.json({ success: true, data: { text, numPages } });
});

/* ------------------------- Image cropper / editor export ------------------------- */

export const processImage = asyncHandler(async (req, res) => {
  const file = requireFile(req);
  if (!file.mimetype.startsWith('image/')) throw ApiError.badRequest('An image file is required');

  const {
    rotate = 0,
    flipH = 'false',
    flipV = 'false',
    brightness = 1,
    contrast = 0,
    width,
    height,
    crop,
    format = 'png',
    quality = 90,
  } = req.body;

  let img = sharp(file.buffer).rotate();
  if (crop) {
    let c;
    try {
      c = JSON.parse(crop);
    } catch {
      throw ApiError.badRequest('Invalid crop JSON');
    }
    if (c.width > 0 && c.height > 0) {
      img = img.extract({
        left: Math.max(0, Math.round(c.left)),
        top: Math.max(0, Math.round(c.top)),
        width: Math.round(c.width),
        height: Math.round(c.height),
      });
    }
  }
  if (Number(rotate)) img = img.rotate(Number(rotate), { background: '#ffffff' });
  if (flipH === 'true') img = img.flop();
  if (flipV === 'true') img = img.flip();
  if (width || height) {
    img = img.resize(width ? Number(width) : null, height ? Number(height) : null, { fit: 'inside' });
  }

  const b = Math.max(0.2, Math.min(3, Number(brightness)));
  img = img.modulate({ brightness: b });
  const c = Math.max(-100, Math.min(100, Number(contrast)));
  if (c !== 0) {
    const slope = 1 + c / 100;
    img = img.linear(slope, 128 * (1 - slope));
  }

  const q = Math.max(10, Math.min(100, Number(quality)));
  let buffer, mime, ext;
  if (format === 'jpg' || format === 'jpeg') {
    buffer = await img.jpeg({ quality: q }).toBuffer();
    mime = MIME.jpg;
    ext = 'jpg';
  } else if (format === 'webp') {
    buffer = await img.webp({ quality: q }).toBuffer();
    mime = 'image/webp';
    ext = 'webp';
  } else {
    buffer = await img.png().toBuffer();
    mime = MIME.png;
    ext = 'png';
  }

  const outName = file.originalname.replace(/\.[^.]+$/, '') + `-edited.${ext}`;
  await respondWithFile(req, res, buffer, outName, mime, 'edit');
});

/* ------------------------- OCR & search ------------------------- */

export const ocr = asyncHandler(async (req, res) => {
  const file = requireFile(req);
  const language = req.body.language || 'eng';
  if (!isSupportedOcrLanguage(language)) {
    throw ApiError.badRequest(`Unsupported language. Supported: ${supportedOcrLanguages().join(', ')}`);
  }

  let text;
  if (file.mimetype === 'application/pdf') {
    const pages = await ocrPdf(file.buffer, language);
    text = pages.join('\n\n--- Page break ---\n\n');
  } else if (file.mimetype.startsWith('image/')) {
    text = await ocrImage(file.buffer, language);
  } else {
    throw ApiError.badRequest('OCR supports PDF and image files');
  }

  await logActivity(req.user.id, 'ocr', { meta: { name: file.originalname, language }, req });
  res.json({ success: true, data: { text, language } });
});

export const ocrLanguages = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: { languages: supportedOcrLanguages() } });
});

export const searchPdf = asyncHandler(async (req, res) => {
  const file = requirePdf(requireFile(req));
  const query = String(req.body.query || '').trim();
  if (query.length < 2) throw ApiError.badRequest('Search query must be at least 2 characters');
  const results = await searchInPdf(file.buffer, query);
  res.json({
    success: true,
    data: { query, totalMatches: results.reduce((n, r) => n + r.count, 0), results },
  });
});

/* ------------------------- TXT / HTML direct ------------------------- */

export const txtToPdf = asyncHandler(async (req, res) => {
  const text = String(req.body.text || '');
  if (!text.trim()) throw ApiError.badRequest('Text is required');
  const buffer = await pdf.textToPdf(text, { title: req.body.title || '' });
  await respondWithFile(req, res, buffer, (req.body.title || 'document') + '.pdf', MIME.pdf);
});

export const htmlToPdfHandler = asyncHandler(async (req, res) => {
  const html = String(req.body.html || '');
  if (!html.trim()) throw ApiError.badRequest('HTML is required');
  const buffer = await htmlToPdf(html);
  await respondWithFile(req, res, buffer, 'document.pdf', MIME.pdf);
});
