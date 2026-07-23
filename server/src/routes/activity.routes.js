import { Router } from 'express';
import * as activity from '../controllers/activity.controller.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { paginationRules } from '../validators/common.validators.js';

const router = Router();
router.use(protect);

router.get('/', validate(paginationRules), activity.listActivities);
router.get('/downloads', activity.downloadHistory);

export default router;
