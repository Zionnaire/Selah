import { model, Schema } from 'mongoose';

const THIRTY_DAYS = 30 * 24 * 60 * 60;

/** A version that was replaced, deleted or purged. Kept 30 days so nothing is ever lost at once. */
const historySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kind: { type: String, required: true },
  recordId: { type: String, required: true },
  /** The rev this version had before it was replaced. */
  rev: { type: Number, required: true },
  doc: { type: Schema.Types.Mixed },
  reason: { type: String, enum: ['replaced', 'deleted', 'purged'], required: true },
  at: { type: Date, default: Date.now },
});
historySchema.index({ at: 1 }, { expireAfterSeconds: THIRTY_DAYS });
historySchema.index({ userId: 1, kind: 1, recordId: 1 });

export const RecordHistoryModel = model('RecordHistory', historySchema);
