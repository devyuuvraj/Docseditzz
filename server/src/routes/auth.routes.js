import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimiter.js';
import {
  registerRules,
  loginRules,
  otpRules,
  emailOnlyRules,
  resetPasswordRules,
  googleRules,
} from '../validators/auth.validators.js';

const router = Router();

router.post('/session', authLimiter, auth.startBrowserSession);
router.post('/guest', authLimiter, auth.createGuest);
router.post('/register', authLimiter, validate(registerRules), auth.register);
router.post('/verify-otp', otpLimiter, validate(otpRules), auth.verifyOtp);
router.post('/resend-otp', otpLimiter, validate(emailOnlyRules), auth.resendOtp);
router.post('/login', authLimiter, validate(loginRules), auth.login);
router.post('/google', authLimiter, validate(googleRules), auth.googleAuth);
router.post('/forgot-password', otpLimiter, validate(emailOnlyRules), auth.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordRules), auth.resetPassword);
router.post('/refresh', auth.refresh);
router.post('/logout', auth.logout);
router.get('/me', protect, auth.me);

export default router;
