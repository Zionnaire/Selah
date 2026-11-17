import { PasswordResetModel } from '../Models/passwordReset';

export const passwordResetRepository = {
  async create(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    // One live request per account: asking again replaces the earlier link.
    await PasswordResetModel.deleteMany({ userId: input.userId });
    await PasswordResetModel.create(input);
  },

  /** Was a link already requested for this account within the last few milliseconds? */
  async recentlyRequested(userId: string, withinMs: number): Promise<boolean> {
    return (await PasswordResetModel.exists({ userId, createdAt: { $gt: new Date(Date.now() - withinMs) } })) !== null;
  },

  /** Marks a link used. Returns the account it was for, or null if it is unknown, expired or used. */
  async consume(tokenHash: string): Promise<string | null> {
    const doc = await PasswordResetModel.findOneAndUpdate(
      { tokenHash, usedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
      { $set: { usedAt: new Date() } },
    ).lean();
    return doc ? doc.userId.toString() : null;
  },

  async deleteAllForUser(userId: string): Promise<void> {
    await PasswordResetModel.deleteMany({ userId });
  },
};
