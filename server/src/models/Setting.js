import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

const Setting = mongoose.model('Setting', settingSchema);

export const getSetting = async (key, fallback = null) => {
  const doc = await Setting.findOne({ key }).lean();
  return doc ? doc.value : fallback;
};

export const setSetting = async (key, value, description = '') =>
  Setting.findOneAndUpdate(
    { key },
    { value, ...(description ? { description } : {}) },
    { upsert: true, new: true }
  );

export default Setting;
