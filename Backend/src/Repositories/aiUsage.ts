import { AiUsageModel } from '../Models/aiUsage';

const DUPLICATE_KEY = 11000;

export const aiUsageRepository = {
  /**
   * Takes one from today's allowance if any is left. Atomic: two requests at once cannot both take
   * the last one. When the counter is already at the limit the filter matches nothing, the upsert
   * tries to insert a second document for the same day, and the unique index refuses it.
   */
  async consume(userId: string, day: string, limit: number): Promise<{ allowed: boolean; used: number }> {
    try {
      const doc = await AiUsageModel.findOneAndUpdate(
        { userId, day, count: { $lt: limit } },
        { $inc: { count: 1 }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true, new: true },
      ).lean();
      return { allowed: true, used: doc?.count ?? 1 };
    } catch (err) {
      if ((err as { code?: number }).code !== DUPLICATE_KEY) throw err;
      // Either the limit is reached, or two first requests of the day raced to create the counter.
      // Try once more without creating: it succeeds in the second case and finds nothing in the first.
      const again = await AiUsageModel.findOneAndUpdate({ userId, day, count: { $lt: limit } }, { $inc: { count: 1 } }, { new: true }).lean();
      return again ? { allowed: true, used: again.count } : { allowed: false, used: limit };
    }
  },

  /** Gives one back when the provider failed, so a person is not charged for an answer they did not get. */
  async refund(userId: string, day: string): Promise<void> {
    await AiUsageModel.updateOne({ userId, day, count: { $gt: 0 } }, { $inc: { count: -1 } });
  },

  async deleteFor(userId: string): Promise<void> {
    await AiUsageModel.deleteMany({ userId });
  },
};
