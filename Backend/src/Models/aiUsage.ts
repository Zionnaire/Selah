import { model, Schema } from 'mongoose';

const DAY = 24 * 60 * 60;

/**
 * How many suggestions an account has used today. Only a counter: what was asked and what came back
 * is never stored (ADR 0004). One document per account per UTC day.
 */
const aiUsageSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  day: { type: String, required: true },
  count: { type: Number, required: true, default: 0 },
  createdAt: { type: Date, default: Date.now },
});
aiUsageSchema.index({ userId: 1, day: 1 }, { unique: true });
aiUsageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 3 * DAY });

export const AiUsageModel = model('AiUsage', aiUsageSchema);
