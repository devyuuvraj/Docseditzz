import { Router } from 'express';
import config from '../config/index.js';
import { getAiHealth } from '../services/ai.service.js';
import { isEmailDeliveryEnabled } from '../services/email.service.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import documentRoutes from './document.routes.js';
import folderRoutes from './folder.routes.js';
import activityRoutes from './activity.routes.js';
import shareRoutes from './share.routes.js';
import toolsRoutes from './tools.routes.js';
import aiRoutes from './ai.routes.js';
import uploadRoutes from './upload.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.get('/health', (_req, res) =>
  res.json({
    success: true,
    status: 'ok',
    apiVersion: '2026.09-smtp-safe',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    features: {
      ai: config.openai.enabled,
      aiStatus: getAiHealth(),
      cloudStorage: config.cloudinary.enabled,
      email: isEmailDeliveryEnabled(),
    },
  })
);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/documents', documentRoutes);
router.use('/folders', folderRoutes);
router.use('/activities', activityRoutes);
router.use('/share', shareRoutes);
router.use('/tools', toolsRoutes);
router.use('/ai', aiRoutes);
router.use('/uploads', uploadRoutes);
router.use('/admin', adminRoutes);

export default router;
