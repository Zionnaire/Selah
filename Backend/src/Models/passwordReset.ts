import { model, Schema } from 'mongoose';

const passwordResetSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  /** SHA-256 of the token in the email. The token itself is never stored. */
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});
// MongoDB removes expired requests on its own.
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetModel = model('PasswordReset', passwordResetSchema);
