import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: String, enum: ['free', 'pro', 'business'], required: true },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'past_due'],
      default: 'active',
      index: true,
    },
    priceMonthly: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    startedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    cancelledAt: { type: Date },
    paymentProvider: { type: String, default: 'manual' },
    externalId: { type: String },
  },
  { timestamps: true }
);

export const PLANS = {
  free: { priceMonthly: 0, storageMb: 500, aiCreditsPerDay: 10 },
  pro: { priceMonthly: 9, storageMb: 10240, aiCreditsPerDay: 200 },
  business: { priceMonthly: 29, storageMb: 51200, aiCreditsPerDay: 1000 },
};

export default mongoose.model('Subscription', subscriptionSchema);
