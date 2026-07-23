import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export const loadPdfDocument = (data) =>
  pdfjsLib.getDocument(data instanceof ArrayBuffer ? { data } : { url: data }).promise;

/** Renders a PDF page onto a canvas at the given scale. Returns {width, height}. */
export const renderPageToCanvas = async (page, canvas, scale = 1.5) => {
  const viewport = page.getViewport({ scale });
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return { width: viewport.width, height: viewport.height };
};

export default pdfjsLib;
