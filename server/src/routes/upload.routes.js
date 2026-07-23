import { Router } from 'express';
import * as uploads from '../controllers/upload.controller.js';
import { protect } from '../middleware/auth.js';
import { chunkUpload } from '../middleware/upload.js';

const router = Router();
router.use(protect);

router.post('/init', uploads.initChunkUpload);
router.post('/chunk', chunkUpload.single('chunk'), uploads.uploadChunk);
router.post('/complete', uploads.completeChunkUpload);

export default router;
