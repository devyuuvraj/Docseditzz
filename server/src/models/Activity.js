import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: {
      type: String,
      required: true,
      enum: [
        'upload', 'download', 'delete', 'restore', 'rename', 'duplicate',
        'convert', 'merge', 'split', 'compress', 'edit', 'share',
        'summarize', 'ocr', 'ai', 'login', 'register', 'password_change',
        'folder_create', 'favorite', 'unfavorite', 'permanent_delete',
      ],
      index: true,
    },
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: String,
    userAgent: String,
  },
  { timestamps: true }
);

activitySchema.index({ createdAt: -1 });

const Activity = mongoose.model('Activity', activitySchema);

export const logActivity = async (userId, action, { document = null, meta = {}, req = null } = {}) => {
  try {
    await Activity.create({
      user: userId,
      action,
      document,
      meta,
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  } catch (err) {
    console.error('[activity] failed to log:', err.message);
  }
};

export default Activity;
