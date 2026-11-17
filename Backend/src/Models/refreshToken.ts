import { model, Schema } from 'mongoose';

const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /** SHA-256 of the opaque token. The raw token is never stored. */
    tokenHash: { type: String, required: true, unique: true },
    /** All tokens descended from one sign-in share a family, so theft can revoke the lot. */
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    userAgent: { type: String, maxlength: 300 },
    /** A name the person gave this device. Carried to each new token in the family. */
    deviceName: { type: String, maxlength: 60 },
    /** False for a shared computer: a session cookie that also expires within a day. */
    persistent: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// MongoDB removes expired sessions on its own.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel = model('RefreshToken', refreshTokenSchema);
