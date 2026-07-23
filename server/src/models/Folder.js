import mongoose from 'mongoose';

const folderSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    color: { type: String, default: '#6366f1' },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  },
  { timestamps: true }
);

folderSchema.index({ owner: 1, parent: 1, name: 1 }, { unique: true });

export default mongoose.model('Folder', folderSchema);
