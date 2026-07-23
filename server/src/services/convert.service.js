import { promisify } from 'util';
import libre from 'libreoffice-convert';
import mammoth from 'mammoth';
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from 'docx';
import ApiError from '../utils/ApiError.js';
import { extractPdfText } from './text.service.js';
import { ocrPdf } from './ocr.service.js';

const libreConvert = promisify(libre.convert);

/**
 * Converts office documents (doc/docx/xls/xlsx/ppt/pptx/html/txt) to PDF
 * using LibreOffice. Requires `soffice` on the PATH (bundled in the Docker image).
 */
export const officeToPdf = async (buffer, ext) => {
  try {
    return await libreConvert(buffer, '.pdf', undefined);
  } catch (err) {
    if (ext === 'docx' || ext === 'doc') {
      // Fallback: docx -> text -> simple PDF (keeps the API usable without LibreOffice)
      try {
        const { value } = await mammoth.extractRawText({ buffer });
        const { textToPdf } = await import('./pdf.service.js');
        return await textToPdf(value, {});
      } catch {
        /* fall through */
      }
    }
    throw ApiError.server(
      'Conversion engine unavailable. Install LibreOffice or run the Docker image. ' + err.message
    );
  }
};

export const htmlToPdf = async (html) => {
  const buffer = Buffer.from(html, 'utf-8');
  try {
    return await libreConvert(buffer, '.pdf', undefined);
  } catch (err) {
    throw ApiError.server('HTML to PDF requires LibreOffice. ' + err.message);
  }
};

/**
 * Converts a PDF to DOCX. Extracts text (with OCR fallback for scanned PDFs)
 * and rebuilds paragraphs/headings to preserve basic structure.
 */
export const pdfToWord = async (buffer, { useOcr = false, language = 'eng' } = {}) => {
  let pagesText;
  const extracted = await extractPdfText(buffer);
  const totalChars = extracted.pages.reduce((n, p) => n + p.length, 0);

  if (useOcr || totalChars < 40) {
    // Scanned document -> OCR every page
    pagesText = await ocrPdf(buffer, language);
  } else {
    pagesText = extracted.pages;
  }

  const children = [];
  pagesText.forEach((pageText, pageIndex) => {
    const paragraphs = pageText
      .split(/\n{2,}|\r\n{2,}/)
      .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
      .filter(Boolean);

    for (const para of paragraphs) {
      const isHeading = para.length < 80 && /^[A-Z0-9]/.test(para) && !/[.!?]$/.test(para);
      children.push(
        new Paragraph({
          heading: isHeading ? HeadingLevel.HEADING_2 : undefined,
          spacing: { after: 200 },
          children: [new TextRun({ text: para, size: isHeading ? 28 : 22 })],
        })
      );
    }
    if (pageIndex < pagesText.length - 1) {
      children.push(new Paragraph({ children: [], pageBreakBefore: true }));
    }
  });

  if (!children.length) {
    throw ApiError.badRequest('No extractable text found in this PDF. Try enabling OCR.');
  }

  const doc = new DocxDocument({
    creator: 'DOCSEDITZ',
    title: 'Converted document',
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
};
