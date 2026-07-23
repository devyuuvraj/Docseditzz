import { Router } from 'express';
import * as tools from '../controllers/tools.controller.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { toolsLimiter } from '../middleware/rateLimiter.js';

const router = Router();
router.use(protect, toolsLimiter);

// Feature 1: Images -> PDF (with per-image rotate/crop, page setup, watermark)
router.post('/images-to-pdf', upload.array('files', 50), tools.imagesToPdf);

// Feature 2 & 7: any office/txt/html/image file -> PDF
router.post('/convert-to-pdf', upload.single('file'), tools.convertToPdf);

// Feature 3: PDF -> Word (with OCR support)
router.post('/pdf-to-word', upload.single('file'), tools.pdfToWordHandler);

// Feature 4: image cropper / adjustments
router.post('/process-image', upload.single('file'), tools.processImage);

// Feature 7: professional PDF tools
router.post('/merge', upload.array('files', 20), tools.merge);
router.post('/split', upload.single('file'), tools.split);
router.post('/compress', upload.single('file'), tools.compress);
router.post('/rotate', upload.single('file'), tools.rotate);
router.post('/extract-pages', upload.single('file'), tools.extractPagesHandler);
router.post('/delete-pages', upload.single('file'), tools.deletePagesHandler);
router.post('/reorder-pages', upload.single('file'), tools.reorderPagesHandler);
router.post('/protect', upload.single('file'), tools.protect);
router.post('/unlock', upload.single('file'), tools.unlock);
router.post('/watermark', upload.single('file'), tools.watermark);
router.post('/page-numbers', upload.single('file'), tools.pageNumbers);
router.post('/header-footer', upload.single('file'), tools.headerFooter);
router.post('/pdf-to-images', upload.single('file'), tools.pdfToImages);
router.post('/extract-images', upload.single('file'), tools.extractImages);
router.post('/extract-text', upload.single('file'), tools.extractTextHandler);

// OCR & in-PDF search
router.post('/ocr', upload.single('file'), tools.ocr);
router.get('/ocr/languages', tools.ocrLanguages);
router.post('/search', upload.single('file'), tools.searchPdf);

// Direct text/html -> PDF
router.post('/txt-to-pdf', tools.txtToPdf);
router.post('/html-to-pdf', tools.htmlToPdfHandler);

export default router;
