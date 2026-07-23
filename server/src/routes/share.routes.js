import { Router } from 'express';
import * as share from '../controllers/share.controller.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { shareRules, objectIdParam } from '../validators/common.validators.js';

const router = Router();

// Public endpoints (rate limited - password brute force protection)
router.post('/:token/access', authLimiter, share.accessShare);
router.post('/:token/download', authLimiter, share.downloadShared);

// Authenticated
router.use(protect);
router.post('/', validate(shareRules), share.createShareLink);
router.get('/mine', share.listMyShares);
router.delete('/:id', validate([objectIdParam()]), share.revokeShare);

export default router;
