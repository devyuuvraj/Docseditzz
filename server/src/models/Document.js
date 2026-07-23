import mongoose from 'mongoose';

const versionSchema = new mongoose.Schema(
  {
    url: String,
    publicId: String,
    size: Number,
    label: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const documentSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null, index: true },

    name: { type: String, required: true, trim: true, maxlength: 255 },
    originalName: { type: String },
    type: {
      type: String,
      enum: ['pdf', 'docx', 'doc', 'image', 'xlsx', 'pptx', 'txt', 'html', 'other'],
      default: 'other',
      index: true,
    },
    mimeType: { type: String },
    size: { type: Number, default: 0 },
    pages: { type: Number, default: 0 },

    // Cloudinary storage
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    thumbnail: { type: String, default: '' },

    isFavorite: { type: Boolean, default: false, index: true },
    isTrashed: { type: Boolean, default: false, index: true },
    trashedAt: { type: Date },

    versions: [versionSchema],
    annotations: { type: mongoose.Schema.Types.Mixed, default: null }, // fabric.js JSON per page
    extractedText: { type: String, select: false },

    lastOpenedAt: { type: Date },
    downloadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

documentSchema.index({ name: 'text', originalName: 'text' });
documentSchema.index({ owner: 1, isTrashed: 1, updatedAt: -1 });

export default mongoose.model('Document', documentSchema);
