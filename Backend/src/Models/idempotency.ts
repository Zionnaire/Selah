import { model, Schema } from 'mongoose';

const DAY = 24 * 60 * 60;

/** The stored answer to a push, so a retry after a dropped connection gets the same answer. */
const idempotencySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  key: { type: String, required: true, maxlength: 100 },
  response: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
});
idempotencySchema.index({ userId: 1, key: 1 }, { unique: true });
idempotencySchema.index({ createdAt: 1 }, { expireAfterSeconds: DAY });

export const IdempotencyModel = model('Idempotency', idempotencySchema);
