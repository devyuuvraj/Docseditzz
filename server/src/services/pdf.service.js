import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
} from 'pdf-lib';
import sharp from 'sharp';
import archiver from 'archiver';
import { pdfToPng } from 'pdf-to-png-converter';
import ApiError from '../utils/ApiError.js';

const PAGE_SIZES = {
  a4: [595.28, 841.89],
  letter: [612, 792],
  legal: [612, 1008],
};

const hexToRgb = (hex = '#000000') => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return rgb(0, 0, 0);
  return rgb(parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255);
};

/** Parses "1,3-5,8" into an array of 0-based page indexes bounded by pageCount. */
export const parsePageRanges = (ranges, pageCount) => {
  const indexes = new Set();
  String(ranges)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((part) => {
      const m = part.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
      if (!m) throw ApiError.badRequest(`Invalid page range: "${part}"`);
      const start = parseInt(m[1], 10);
      const end = m[2] ? parseInt(m[2], 10) : start;
      for (let i = start; i <= end; i++) {
        if (i >= 1 && i <= pageCount) indexes.add(i - 1);
      }
    });
  if (!indexes.size) throw ApiError.badRequest('No valid pages in the given range');
  return [...indexes].sort((a, b) => a - b);
};

const loadPdf = async (buffer, password) => {
  try {
    return await PDFDocument.load(buffer, {
      ignoreEncryption: !!password,
      password,
      updateMetadata: false,
    });
  } catch (err) {
    if (/encrypted/i.test(err.message)) {
      throw ApiError.badRequest('This PDF is password protected. Unlock it first.');
    }
    throw ApiError.badRequest('Could not read PDF. The file may be corrupted.');
  }
};

/* ---------------------------------- Images -> PDF ---------------------------------- */

export const imagesToPdf = async (
  files,
  {
    pageSize = 'a4',
    orientation = 'portrait',
    margin = 24,
    quality = 80,
    fit = 'contain',
    pageNumbers = false,
    watermarkText = '',
  } = {}
) => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  let [pw, ph] = PAGE_SIZES[pageSize] || PAGE_SIZES.a4;
  if (orientation === 'landscape') [pw, ph] = [ph, pw];
  const m = Math.max(0, Math.min(Number(margin), Math.min(pw, ph) / 3));

  for (let i = 0; i < files.length; i++) {
    // Normalize every image to JPEG at requested quality (also handles webp/bmp/tiff)
    const jpeg = await sharp(files[i].buffer)
      .rotate() // respect EXIF
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: Math.max(10, Math.min(100, Number(quality))) })
      .toBuffer();

    const img = await doc.embedJpg(jpeg);
    const page = doc.addPage([pw, ph]);

    const availW = pw - m * 2;
    const availH = ph - m * 2;
    let scale;
    if (fit === 'cover') scale = Math.max(availW / img.width, availH / img.height);
    else scale = Math.min(availW / img.width, availH / img.height, 1e9);
    const w = img.width * scale;
    const h = img.height * scale;

    page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });

    if (watermarkText) {
      const size = 42;
      const textWidth = font.widthOfTextAtSize(watermarkText, size);
      page.drawText(watermarkText, {
        x: pw / 2 - textWidth / 2,
        y: ph / 2,
        size,
        font,
        color: rgb(0.6, 0.6, 0.6),
        opacity: 0.3,
        rotate: degrees(35),
      });
    }
    if (pageNumbers) {
      const label = `${i + 1} / ${files.length}`;
      page.drawText(label, {
        x: pw / 2 - font.widthOfTextAtSize(label, 10) / 2,
        y: 14,
        size: 10,
        font,
        color: rgb(0.4, 0.4, 0.45),
      });
    }
  }

  return Buffer.from(await doc.save());
};

/* ---------------------------------- Core tools ---------------------------------- */

export const mergePdfs = async (buffers) => {
  const merged = await PDFDocument.create();
  for (const buf of buffers) {
    const src = await loadPdf(buf);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  return Buffer.from(await merged.save());
};

export const splitPdf = async (buffer, ranges) => {
  const src = await loadPdf(buffer);
  const groups = String(ranges)
    .split(';')
    .map((g) => g.trim())
    .filter(Boolean);
  if (!groups.length) throw ApiError.badRequest('Provide ranges like "1-3;4-6"');

  const outputs = [];
  for (const group of groups) {
    const idx = parsePageRanges(group, src.getPageCount());
    const doc = await PDFDocument.create();
    const pages = await doc.copyPages(src, idx);
    pages.forEach((p) => doc.addPage(p));
    outputs.push({ name: `split-${group.replace(/[^0-9-]/g, '_')}.pdf`, buffer: Buffer.from(await doc.save()) });
  }
  return outputs;
};

export const rotatePdf = async (buffer, angle = 90, pages = 'all') => {
  const doc = await loadPdf(buffer);
  const count = doc.getPageCount();
  const idx = pages === 'all' ? [...Array(count).keys()] : parsePageRanges(pages, count);
  idx.forEach((i) => {
    const page = doc.getPage(i);
    page.setRotation(degrees(((page.getRotation().angle + Number(angle)) % 360 + 360) % 360));
  });
  return Buffer.from(await doc.save());
};

export const extractPages = async (buffer, ranges) => {
  const src = await loadPdf(buffer);
  const idx = parsePageRanges(ranges, src.getPageCount());
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, idx);
  pages.forEach((p) => doc.addPage(p));
  return Buffer.from(await doc.save());
};

export const deletePages = async (buffer, ranges) => {
  const src = await loadPdf(buffer);
  const remove = new Set(parsePageRanges(ranges, src.getPageCount()));
  const keep = src.getPageIndices().filter((i) => !remove.has(i));
  if (!keep.length) throw ApiError.badRequest('Cannot delete every page of the document');
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, keep);
  pages.forEach((p) => doc.addPage(p));
  return Buffer.from(await doc.save());
};

export const reorderPages = async (buffer, order) => {
  const src = await loadPdf(buffer);
  const count = src.getPageCount();
  const idx = (Array.isArray(order) ? order : String(order).split(',')).map((n) => Number(n) - 1);
  if (idx.length !== count || idx.some((i) => Number.isNaN(i) || i < 0 || i >= count)) {
    throw ApiError.badRequest(`Order must contain each page number 1-${count} exactly once`);
  }
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, idx);
  pages.forEach((p) => doc.addPage(p));
  return Buffer.from(await doc.save());
};

export const protectPdf = async (buffer, password) => {
  const doc = await loadPdf(buffer);
  return Buffer.from(
    await doc.save({
      userPassword: password,
      ownerPassword: password,
      permissions: { printing: 'highResolution', copying: false, modifying: false },
    })
  );
};

export const unlockPdf = async (buffer, password) => {
  let doc;
  try {
    doc = await PDFDocument.load(buffer, { password, ignoreEncryption: false });
  } catch {
    throw ApiError.badRequest('Incorrect password or unsupported encryption');
  }
  return Buffer.from(await doc.save());
};

export const watermarkPdf = async (
  buffer,
  { text = 'CONFIDENTIAL', opacity = 0.25, fontSize = 48, color = '#9ca3af', angle = 35 } = {}
) => {
  const doc = await loadPdf(buffer);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  doc.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    const tw = font.widthOfTextAtSize(text, Number(fontSize));
    page.drawText(text, {
      x: width / 2 - tw / 2,
      y: height / 2,
      size: Number(fontSize),
      font,
      color: hexToRgb(color),
      opacity: Math.max(0.05, Math.min(1, Number(opacity))),
      rotate: degrees(Number(angle)),
    });
  });
  return Buffer.from(await doc.save());
};

export const addPageNumbers = async (
  buffer,
  { position = 'bottom-center', startAt = 1, format = '{n} / {total}' } = {}
) => {
  const doc = await loadPdf(buffer);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const total = doc.getPageCount();
  doc.getPages().forEach((page, i) => {
    const { width } = page.getSize();
    const label = format.replaceAll('{n}', String(i + Number(startAt))).replaceAll('{total}', String(total));
    const tw = font.widthOfTextAtSize(label, 10);
    const x = position.endsWith('left') ? 36 : position.endsWith('right') ? width - tw - 36 : width / 2 - tw / 2;
    const y = position.startsWith('top') ? page.getSize().height - 24 : 18;
    page.drawText(label, { x, y, size: 10, font, color: rgb(0.35, 0.35, 0.4) });
  });
  return Buffer.from(await doc.save());
};

export const addHeaderFooter = async (buffer, { header = '', footer = '' } = {}) => {
  const doc = await loadPdf(buffer);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    if (header) {
      const tw = font.widthOfTextAtSize(header, 10);
      page.drawText(header, { x: width / 2 - tw / 2, y: height - 24, size: 10, font, color: rgb(0.3, 0.3, 0.35) });
    }
    if (footer) {
      const tw = font.widthOfTextAtSize(footer, 10);
      page.drawText(footer, { x: width / 2 - tw / 2, y: 14, size: 10, font, color: rgb(0.3, 0.3, 0.35) });
    }
  });
  return Buffer.from(await doc.save());
};

/**
 * Best-effort compression: re-serializes with object streams and,
 * at lower quality levels, re-renders pages as JPEG images.
 */
export const compressPdf = async (buffer, level = 'recommended') => {
  if (level === 'extreme' || level === 'strong') {
    const dpi = level === 'extreme' ? 96 : 130;
    const quality = level === 'extreme' ? 55 : 70;
    const pages = await pdfToPng(buffer, { viewportScale: dpi / 72 });
    const doc = await PDFDocument.create();
    for (const p of pages) {
      const jpeg = await sharp(p.content).jpeg({ quality }).toBuffer();
      const img = await doc.embedJpg(jpeg);
      const page = doc.addPage([img.width * (72 / dpi), img.height * (72 / dpi)]);
      page.drawImage(img, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
    }
    return Buffer.from(await doc.save({ useObjectStreams: true }));
  }
  const doc = await loadPdf(buffer);
  return Buffer.from(await doc.save({ useObjectStreams: true }));
};

/* ---------------------------------- Rendering / extraction ---------------------------------- */

export const pdfToImages = async (buffer, { scale = 2, pages = null } = {}) => {
  const pngs = await pdfToPng(buffer, {
    viewportScale: Number(scale),
    pagesToProcess: pages || undefined,
  });
  return pngs.map((p) => ({ name: `page-${p.pageNumber}.png`, buffer: p.content }));
};

/** Extracts embedded JPEG images (DCTDecode streams) from a raw PDF buffer. */
export const extractEmbeddedImages = async (buffer) => {
  const images = [];
  const raw = buffer;
  let cursor = 0;
  while (cursor < raw.length) {
    const start = raw.indexOf(Buffer.from([0xff, 0xd8, 0xff]), cursor);
    if (start === -1) break;
    const end = raw.indexOf(Buffer.from([0xff, 0xd9]), start + 3);
    if (end === -1) break;
    const candidate = raw.subarray(start, end + 2);
    if (candidate.length > 2000) {
      try {
        const meta = await sharp(candidate).metadata();
        if (meta.width > 32 && meta.height > 32) {
          images.push({ name: `image-${images.length + 1}.jpg`, buffer: Buffer.from(candidate) });
        }
      } catch {
        /* not a valid image, skip */
      }
    }
    cursor = end + 2;
  }
  return images;
};

/** Zips an array of { name, buffer } into a single Buffer. */
export const zipFiles = (files) =>
  new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks = [];
    archive.on('data', (c) => chunks.push(c));
    archive.on('error', reject);
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    files.forEach((f) => archive.append(f.buffer, { name: f.name }));
    archive.finalize();
  });

export const getPageCount = async (buffer) => {
  const doc = await loadPdf(buffer);
  return doc.getPageCount();
};

/* ---------------------------------- Text -> PDF ---------------------------------- */

export const textToPdf = async (text, { title = '' } = {}) => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const [pw, ph] = PAGE_SIZES.a4;
  const margin = 56;
  const size = 11;
  const lineHeight = size * 1.5;
  const maxWidth = pw - margin * 2;

  const wrap = (line) => {
    const words = line.split(/\s+/);
    const lines = [];
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else current = test;
    }
    lines.push(current);
    return lines;
  };

  let page = doc.addPage([pw, ph]);
  let y = ph - margin;

  if (title) {
    page.drawText(title, { x: margin, y, size: 18, font: bold, color: rgb(0.1, 0.1, 0.15) });
    y -= 32;
  }

  const sanitized = text.replace(/\r\n/g, '\n').replace(/[^\x00-\xFF\n]/g, '?');
  for (const paragraph of sanitized.split('\n')) {
    const lines = paragraph.trim() ? wrap(paragraph) : [''];
    for (const line of lines) {
      if (y < margin) {
        page = doc.addPage([pw, ph]);
        y = ph - margin;
      }
      if (line) page.drawText(line, { x: margin, y, size, font, color: rgb(0.15, 0.15, 0.2) });
      y -= lineHeight;
    }
  }
  return Buffer.from(await doc.save());
};
