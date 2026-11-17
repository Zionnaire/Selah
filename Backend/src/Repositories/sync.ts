import type { ClientSession } from 'mongoose';
import type { PulledRecord, RecordKind } from '@selah/domain';
import { IdempotencyModel } from '../Models/idempotency';
import { RecordModel } from '../Models/record';
import { RecordHistoryModel } from '../Models/recordHistory';
import { SyncStateModel } from '../Models/syncState';
import type { StoredRecord } from '../Types';

const MAX_HISTORY = 5000;

type Raw = {
  kind: RecordKind;
  recordId: string;
  rev: number;
  doc?: unknown;
  deleted?: boolean;
  stub?: boolean;
  updatedAt?: Date;
};

const toStored = (r: Raw): StoredRecord => ({
  kind: r.kind,
  id: r.recordId,
  rev: r.rev,
  doc: r.doc ?? undefined,
  deleted: !!r.deleted,
  stub: !!r.stub,
});

/** Data access only. Every write that must be atomic takes the session of the push transaction. */
export const syncRepository = {
  async getIdempotent(userId: string, key: string): Promise<unknown | null> {
    const hit = await IdempotencyModel.findOne({ userId, key }).lean();
    return hit ? hit.response : null;
  },

  async saveIdempotent(userId: string, key: string, response: unknown, session: ClientSession): Promise<void> {
    await IdempotencyModel.create([{ userId, key, response }], { session });
  },

  /**
   * Takes the next rev. Because it writes the account's counter document, two transactions for the
   * same account cannot both be in flight: one waits or retries. That is what makes revs commit in order.
   */
  async nextRev(userId: string, session: ClientSession): Promise<number> {
    const s = await SyncStateModel.findOneAndUpdate(
      { userId },
      { $inc: { lastRev: 1 } },
      { upsert: true, new: true, session, setDefaultsOnInsert: true },
    ).lean();
    return s!.lastRev;
  },

  async find(userId: string, kind: RecordKind, id: string, session?: ClientSession): Promise<StoredRecord | null> {
    const r = await RecordModel.findOne({ userId, kind, recordId: id }).session(session ?? null).lean<Raw>();
    return r ? toStored(r) : null;
  },

  /** Every record that still holds content. A deleted record keeps its document until purged, so it counts. */
  async countStored(userId: string, session?: ClientSession): Promise<number> {
    return RecordModel.countDocuments({ userId, stub: false }).session(session ?? null);
  },

  async countHistory(userId: string, session?: ClientSession): Promise<number> {
    return RecordHistoryModel.countDocuments({ userId }).session(session ?? null);
  },

  async upsert(
    userId: string,
    rec: { kind: RecordKind; id: string; rev: number; doc: unknown; deleted: boolean; stub: boolean },
    session: ClientSession,
  ): Promise<void> {
    await RecordModel.updateOne(
      { userId, kind: rec.kind, recordId: rec.id },
      { $set: { rev: rec.rev, doc: rec.doc ?? null, deleted: rec.deleted, stub: rec.stub } },
      { upsert: true, session },
    );
  },

  async addHistory(
    userId: string,
    old: StoredRecord,
    reason: 'replaced' | 'deleted' | 'purged',
    session: ClientSession,
  ): Promise<void> {
    if (old.doc === undefined || old.stub) return;
    // History is a safety net with a ceiling, so replacing the same record in a loop cannot fill the database.
    if ((await RecordHistoryModel.countDocuments({ userId }).session(session)) >= MAX_HISTORY) return;
    await RecordHistoryModel.create([{ userId, kind: old.kind, recordId: old.id, rev: old.rev, doc: old.doc, reason }], { session });
  },

  async state(userId: string): Promise<{ lastRev: number; horizonRev: number }> {
    const s = await SyncStateModel.findOne({ userId }).lean();
    return { lastRev: s?.lastRev ?? 0, horizonRev: s?.horizonRev ?? 0 };
  },

  async pull(userId: string, since: number, limit: number): Promise<PulledRecord[]> {
    const rows = await RecordModel.find({ userId, rev: { $gt: since } }).sort({ rev: 1 }).limit(limit).lean<Raw[]>();
    return rows.map((r) => {
      const s = toStored(r);
      return { kind: s.kind, id: s.id, rev: s.rev, deleted: s.deleted, stub: s.stub, doc: s.stub ? undefined : s.doc };
    });
  },

  /** Every id with its rev, for a device that fell behind the deletion horizon. */
  async allIds(userId: string): Promise<Pick<PulledRecord, 'kind' | 'id' | 'rev' | 'deleted' | 'stub'>[]> {
    const rows = await RecordModel.find({ userId }).select('kind recordId rev deleted stub').lean<Raw[]>();
    return rows.map((r) => ({ kind: r.kind, id: r.recordId, rev: r.rev, deleted: !!r.deleted, stub: !!r.stub }));
  },

  /** Removes deletion markers older than the cutoff and moves the horizon up past them. */
  async pruneDeleted(userId: string, cutoff: Date): Promise<number> {
    const old = await RecordModel.find({ userId, deleted: true, updatedAt: { $lt: cutoff } }).select('rev').lean<{ rev: number }[]>();
    if (!old.length) return 0;
    const top = Math.max(...old.map((r) => r.rev));
    await RecordModel.deleteMany({ userId, deleted: true, updatedAt: { $lt: cutoff } });
    await SyncStateModel.updateOne({ userId }, { $max: { horizonRev: top } }, { upsert: true });
    return old.length;
  },

  async deleteEverythingFor(userId: string): Promise<void> {
    await Promise.all([
      RecordModel.deleteMany({ userId }),
      RecordHistoryModel.deleteMany({ userId }),
      IdempotencyModel.deleteMany({ userId }),
      SyncStateModel.deleteMany({ userId }),
    ]);
  },
};
