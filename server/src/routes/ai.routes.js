import { Router } from 'express';
import * as ai from '../controllers/ai.controller.js';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { body } from 'express-validator';

const router = Router();
router.use(protect, aiLimiter);

router.post('/summarize', upload.single('file'), ai.summarizeHandler);
router.post('/insights', upload.single('file'), ai.insightsHandler);
router.post('/flashcards', upload.single('file'), ai.flashcardsHandler);
router.post('/quiz', upload.single('file'), ai.quizHandler);
router.post(
  '/transform',
  validate([
    body('text').isString().notEmpty().withMessage('Text is required'),
    body('action')
      .isIn([
        'explain', 'rewrite', 'translate', 'grammar', 'simplify', 'expand',
        'professional', 'academic', 'legal', 'medical',
      ])
      .withMessage('Invalid action'),
    body('language').optional().isString().isLength({ max: 40 }),
  ]),
  ai.transformHandler
);
router.post('/chat', upload.single('file'), ai.chatHandler);

export default router;
