import { RefreshTokenModel } from '../Models/refreshToken';
import type { SessionRecord } from '../Types';

export interface LiveSession {
  family: string;
  deviceName?: string;
  userAgent?: string;
  lastActive: Date;
}

export const refreshTokenRepository = {
  async create(input: {
    userId: string;
    tokenHash: string;
    family: string;
    expiresAt: Date;
    userAgent?: string;
    deviceName?: string;
    persistent?: boolean;
  }): Promise<void> {
    await RefreshTokenModel.create(input);
  },

  async findByHash(tokenHash: string): Promise<SessionRecord | null> {
    const doc = await RefreshTokenModel.findOne({ tokenHash }).lean();
    if (!doc) return null;
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      family: doc.family,
      expiresAt: doc.expiresAt,
      revokedAt: doc.revokedAt ?? undefined,
      deviceName: doc.deviceName ?? undefined,
      persistent: doc.persistent !== false,
    };
  },

  /** Marks a token used. Returns false if another request already revoked it. */
  async revoke(id: string): Promise<boolean> {
    const res = await RefreshTokenModel.updateOne(
      { _id: id, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
    return res.modifiedCount === 1;
  },

  async revokeFamily(family: string): Promise<void> {
    await RefreshTokenModel.updateMany(
      { family, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
  },

  /** Is this sign in still valid: not signed out, not expired, not ended by a reset or deletion? */
  async isFamilyLive(userId: string, family: string): Promise<boolean> {
    return (
      (await RefreshTokenModel.exists({ userId, family, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } })) !== null
    );
  },

  /** Signed in devices: the newest live token of each family. */
  async liveSessions(userId: string): Promise<LiveSession[]> {
    const docs = await RefreshTokenModel.find({ userId, revokedAt: { $exists: false }, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .lean();
    const seen = new Set<string>();
    const out: LiveSession[] = [];
    for (const d of docs) {
      if (seen.has(d.family)) continue;
      seen.add(d.family);
      out.push({ family: d.family, deviceName: d.deviceName ?? undefined, userAgent: d.userAgent ?? undefined, lastActive: (d as { createdAt: Date }).createdAt });
    }
    return out;
  },

  /** Revokes one device, but only if it belongs to this user. Returns whether anything was revoked. */
  async revokeUserFamily(userId: string, family: string): Promise<boolean> {
    const res = await RefreshTokenModel.updateMany(
      { userId, family, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
    return res.modifiedCount > 0;
  },

  async renameFamily(userId: string, family: string, deviceName: string): Promise<boolean> {
    const res = await RefreshTokenModel.updateMany({ userId, family }, { $set: { deviceName } });
    return res.matchedCount > 0;
  },

  async revokeAllForUser(userId: string): Promise<void> {
    await RefreshTokenModel.updateMany({ userId, revokedAt: { $exists: false } }, { $set: { revokedAt: new Date() } });
  },

  async deleteAllForUser(userId: string): Promise<void> {
    await RefreshTokenModel.deleteMany({ userId });
  },
};
