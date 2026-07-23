import { Router } from 'express';
import * as user from '../controllers/user.controller.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { upload } from '../middleware/upload.js';
import { changePasswordRules } from '../validators/auth.validators.js';

const router = Router();
router.use(protect);

router.patch('/me', upload.single('avatar'), user.updateProfile);
router.patch('/me/password', validate(changePasswordRules), user.changePassword);
router.patch('/me/preferences', user.updatePreferences);
router.get('/me/storage', user.storageStats);
router.get('/me/subscription', user.getSubscription);
router.post('/me/subscription', user.changePlan);
router.delete('/me', user.deleteAccount);

export default router;
