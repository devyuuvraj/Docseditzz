import { Router } from 'express';
import * as admin from '../controllers/admin.controller.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { objectIdParam, paginationRules } from '../validators/common.validators.js';

const router = Router();
router.use(protect, restrictTo('admin'));

router.get('/stats', admin.getStats);
router.get('/users', validate(paginationRules), admin.listUsers);
router.patch('/users/:id', validate([objectIdParam()]), admin.updateUser);
router.delete('/users/:id', validate([objectIdParam()]), admin.deactivateUser);
router.get('/documents', validate(paginationRules), admin.listAllDocuments);
router.get('/logs', validate(paginationRules), admin.listLogs);
router.get('/subscriptions', validate(paginationRules), admin.listSubscriptions);

export default router;
