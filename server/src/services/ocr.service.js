import { createWorker } from 'tesseract.js';
import { pdfToPng } from 'pdf-to-png-converter';

const SUPPORTED_LANGUAGES = [
  'eng', 'hin', 'spa', 'fra', 'deu', 'ita', 'por', 'rus',
  'jpn', 'kor', 'chi_sim', 'chi_tra', 'ara', 'ben', 'tam', 'tel',
];

export const isSupportedOcrLanguage = (lang) => SUPPORTED_LANGUAGES.includes(lang);
export const supportedOcrLanguages = () => [...SUPPORTED_LANGUAGES];

/** OCR a single image buffer. Returns recognized text. */
export const ocrImage = async (buffer, language = 'eng') => {
  const worker = await createWorker(language);
  try {
    const { data } = await worker.recognize(buffer);
    return data.text;
  } finally {
    await worker.terminate();
  }
};

/** OCR every page of a PDF. Returns an array of page texts. */
export const ocrPdf = async (buffer, language = 'eng', maxPages = 25) => {
  const pngs = await pdfToPng(buffer, { viewportScale: 2.2 });
  const limited = pngs.slice(0, maxPages);
  const worker = await createWorker(language);
  const texts = [];
  try {
    for (const page of limited) {
      const { data } = await worker.recognize(page.content);
      texts.push(data.text.trim());
    }
  } finally {
    await worker.terminate();
  }
  return texts;
};
