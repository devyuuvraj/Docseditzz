import { createRequire } from 'module';
import mammoth from 'mammoth';
import ApiError from '../utils/ApiError.js';

const require = createRequire(import.meta.url);
// pdf-parse is CJS; require its internal lib to avoid the package's debug harness
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

/**
 * Extracts text from a PDF buffer.
 * Returns { text, pages: string[], numPages }.
 */
export const extractPdfText = async (buffer) => {
  const pages = [];
  const options = {
    pagerender: async (pageData) => {
      const content = await pageData.getTextContent();
      let lastY = null;
      let text = '';
      for (const item of content.items) {
        const y = item.transform[5];
        if (lastY !== null && Math.abs(y - lastY) > 4) text += '\n';
        text += item.str + (item.hasEOL ? '\n' : ' ');
        lastY = y;
      }
      pages.push(text.trim());
      return text;
    },
  };

  try {
    const data = await pdfParse(buffer, options);
    return { text: pages.join('\n\n'), pages, numPages: data.numpages };
  } catch (err) {
    throw ApiError.badRequest('Failed to read PDF text: ' + err.message);
  }
};

export const extractDocxText = async (buffer) => {
  try {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  } catch (err) {
    throw ApiError.badRequest('Failed to read DOCX text: ' + err.message);
  }
};

/**
 * Searches inside a PDF, returning per-page matches with surrounding context.
 */
export const searchInPdf = async (buffer, query) => {
  const { pages } = await extractPdfText(buffer);
  const q = query.toLowerCase();
  const results = [];
  pages.forEach((pageText, i) => {
    const lower = pageText.toLowerCase();
    let idx = lower.indexOf(q);
    const matches = [];
    while (idx !== -1 && matches.length < 20) {
      const start = Math.max(0, idx - 60);
      const end = Math.min(pageText.length, idx + q.length + 60);
      matches.push({
        context: (start > 0 ? '…' : '') + pageText.slice(start, end).trim() + (end < pageText.length ? '…' : ''),
        position: idx,
      });
      idx = lower.indexOf(q, idx + q.length);
    }
    if (matches.length) results.push({ page: i + 1, count: matches.length, matches });
  });
  return results;
};

/** Splits long text into overlapping chunks for AI context selection. */
export const chunkText = (text, chunkSize = 1600, overlap = 200) => {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + chunkSize));
    start += chunkSize - overlap;
  }
  return chunks;
};

/** Naive keyword scoring to pick the most relevant chunks for a question. */
export const topChunksFor = (question, chunks, k = 4) => {
  const terms = question
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);
  const scored = chunks.map((chunk, i) => {
    const lower = chunk.toLowerCase();
    const score = terms.reduce((s, t) => s + (lower.split(t).length - 1), 0);
    return { i, score, chunk };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, k).filter((c) => c.score > 0);
  return (top.length ? top : scored.slice(0, k)).sort((a, b) => a.i - b.i).map((c) => c.chunk);
};
