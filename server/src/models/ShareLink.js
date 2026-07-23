import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const shareLinkSchema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    isPublic: { type: Boolean, default: true },
    passwordHash: { type: String, select: false },
    expiresAt: { type: Date, default: null },
    views: { type: Number, default: 0 },
    isRevoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

shareLinkSchema.methods.setPassword = async function (password) {
  this.passwordHash = await bcrypt.hash(password, 10);
};

shareLinkSchema.methods.checkPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};

shareLinkSchema.methods.isExpired = function () {
  return !!this.expiresAt && this.expiresAt < new Date();
};

export default mongoose.model('ShareLink', shareLinkSchema);
