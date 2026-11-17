import mongoose from 'mongoose';
import {
  LIMITS,
  docSchemaFor,
  type Change,
  type ChangeResult,
  type PullResponse,
  type PushRequest,
  type PushResponse,
} from '@selah/domain';
import { syncRepository as repo } from '../Repositories/sync';
import { AppError } from '../Utils/errors';

const DUPLICATE_KEY = 11000;
const DELETION_HORIZON_DAYS = 90;

type Checked = { ok: true; doc: unknown } | { ok: false; reason: string };

/**
 * Validates a document for a put and returns the VALIDATED copy. That copy, not the raw input, is
 * what gets stored: the schemas drop keys they do not know, so nothing unchecked reaches the
 * database or comes back to other devices. The size is measured in bytes after that.
 */
function check(c: Change): Checked {
  if (c.op !== 'put') return { ok: true, doc: undefined };
  const parsed = docSchemaFor(c.kind).safeParse(c.doc);
  if (!parsed.success) return { ok: false, reason: 'The document is not valid' };
  if (Buffer.byteLength(JSON.stringify(parsed.data), 'utf8') > LIMITS.maxRecordBytes) {
    return { ok: false, reason: 'The document is too large' };
  }
  // A highlight or bookmark is the verse itself, so its id must be that verse.
  if ((c.kind === 'highlight' || c.kind === 'bookmark') && (parsed.data as { verseId: string }).verseId !== c.id) {
    return { ok: false, reason: 'The id must be the verse id' };
  }
  return { ok: true, doc: parsed.data };
}

async function applyOne(
  userId: string,
  c: Change,
  session: mongoose.ClientSession,
  creating: { room: number },
): Promise<ChangeResult> {
  const checked = check(c);
  if (!checked.ok) return { kind: c.kind, id: c.id, status: 'rejected', reason: checked.reason };

  const current = await repo.find(userId, c.kind, c.id, session);

  if (current && current.rev !== c.baseRev) {
    // Someone else changed it since this device last looked. Never overwrite. The document is not
    // sent back (it could be large, and a stored answer must stay small): the device pulls it.
    return { kind: c.kind, id: c.id, status: 'conflict', rev: current.rev, deleted: current.deleted };
  }

  if (!current && c.op === 'put') {
    if (creating.room <= 0) return { kind: c.kind, id: c.id, status: 'rejected', reason: 'This account has reached its limit of records' };
    creating.room--;
  }

  if (current) {
    await repo.addHistory(userId, current, c.op === 'put' ? 'replaced' : c.op === 'delete' ? 'deleted' : 'purged', session);
  }

  const rev = await repo.nextRev(userId, session);
  await repo.upsert(
    userId,
    {
      kind: c.kind,
      id: c.id,
      rev,
      // A delete keeps the content so it can be restored. A purge removes it.
      doc: c.op === 'put' ? checked.doc : c.op === 'delete' ? current?.doc : undefined,
      deleted: c.op !== 'put',
      stub: c.op === 'purge',
    },
    session,
  );
  return { kind: c.kind, id: c.id, status: 'applied', rev };
}

export const syncService = {
  /**
   * Applies a batch. The whole batch is one transaction, and the answer is stored under the batch's
   * key, so a retry returns the same answer instead of applying twice.
   */
  async push(userId: string, req: PushRequest): Promise<PushResponse> {
    const stored = await repo.getIdempotent(userId, req.key);
    if (stored) return stored as PushResponse;

    const removals = req.changes.filter((c) => c.op !== 'put').length;
    if (removals > LIMITS.massDeleteThreshold && !req.confirmMassDelete) {
      throw new AppError(409, 'confirm_required', `This would remove ${removals} items. Confirm to continue.`, { count: removals });
    }

    const session = await mongoose.startSession();
    try {
      let response: PushResponse = { results: [] };
      await session.withTransaction(async () => {
        // withTransaction may run this more than once, so every attempt starts clean. The room left
        // is counted inside the transaction, so two pushes cannot both spend the same last slots.
        const creating = { room: Math.max(0, LIMITS.maxRecordsPerAccount - (await repo.countStored(userId, session))) };
        const results: ChangeResult[] = [];
        for (const c of req.changes) results.push(await applyOne(userId, c, session, creating));
        response = { results };
        await repo.saveIdempotent(userId, req.key, response, session);
      });
      return response;
    } catch (err) {
      // Two identical pushes raced and the other one won: return its answer.
      if ((err as { code?: number }).code === DUPLICATE_KEY) {
        const won = await repo.getIdempotent(userId, req.key);
        if (won) return won as PushResponse;
      }
      throw err;
    } finally {
      await session.endSession();
    }
  },

  async pull(userId: string, since: number, limit: number, full = false): Promise<PullResponse> {
    const { horizonRev } = await repo.state(userId);
    if (!full && since < horizonRev) return { records: [], cursor: since, hasMore: false, resync: true };
    const rows = await repo.pull(userId, since, limit + 1);
    const hasMore = rows.length > limit;
    const records = hasMore ? rows.slice(0, limit) : rows;
    return { records, cursor: records.at(-1)?.rev ?? since, hasMore };
  },

  /** For a device that fell behind the deletion horizon: every id and its rev. */
  allIds: (userId: string) => repo.allIds(userId),

  /** Run occasionally. Deletion markers older than the horizon are removed. */
  pruneDeleted: (userId: string, now = new Date()) =>
    repo.pruneDeleted(userId, new Date(now.getTime() - DELETION_HORIZON_DAYS * 86_400_000)),
};
