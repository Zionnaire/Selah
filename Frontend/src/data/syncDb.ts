import {
  deepEqual,
  droppedByServer,
  reconcile,
  summarise,
  type LocalRecord,
  type NoteDoc,
  type PulledRecord,
  type RecordKind,
  type SermonDoc,
  type StudyDoc,
} from '@selah/domain';
import { database, rows, run } from './sqlite';
import type {
  ApplyReport,
  AttentionItem,
  ConflictDetail,
  GuestWork,
  PushOutcome,
  SyncDbApi,
  SyncOverview,
  SyncPending,
} from './types';

/** Table names come from this closed map, never from input. */
export const SYNC_TABLE: Record<RecordKind, string> = {
  sermon: 'sermons',
  note: 'notes',
  study: 'studies',
  highlight: 'highlights',
  bookmark: 'bookmarks',
};
const KINDS = Object.keys(SYNC_TABLE) as RecordKind[];
const isMark = (k: RecordKind) => k === 'highlight' || k === 'bookmark';

type Raw = Record<string, unknown>;

let current: string | null = null;

/** Who is using the app now. Everything that is sent, counted or shown follows from this. */
export const currentAccount = () => current;

export function initSync() {
  run('CREATE TEMP TABLE IF NOT EXISTS sync_cur (account_id TEXT)');
  run('DELETE FROM sync_cur');
  run('INSERT INTO sync_cur (account_id) VALUES (NULL)');
  current = null;
}

/** A round of sync belongs to the account that started it. If the person has changed since, it stops. */
function sameAccount(account: string) {
  if (account !== current) throw new Error('account changed');
}

const getRow = (kind: RecordKind, id: string): Raw | undefined =>
  rows<Raw>(`SELECT * FROM ${SYNC_TABLE[kind]} WHERE id = ?`, [id])[0];

/** The syncable document held by a row. Nothing else of the row is ever sent. */
function docOfRow(kind: RecordKind, row: Raw): unknown {
  if (kind === 'sermon' || kind === 'study') return JSON.parse(String(row.doc));
  if (kind === 'note') return { title: row.title, body: row.body, links: JSON.parse(String(row.links)) };
  return { verseId: row.verse_id };
}

function columns(kind: RecordKind, doc: unknown): Record<string, unknown> {
  if (kind === 'sermon') {
    const d = doc as SermonDoc;
    const s = summarise(d);
    return {
      title: d.title.trim() || 'Untitled sermon',
      passage: d.passage ? JSON.stringify(d.passage) : null,
      status: d.status,
      preach_date: d.preachDate ?? null,
      series: d.series ?? null,
      target_minutes: d.targetMinutes,
      words: s.words,
      sections_total: s.sectionsTotal,
      sections_started: s.sectionsStarted,
      doc: JSON.stringify(d),
    };
  }
  if (kind === 'study') {
    const d = doc as StudyDoc;
    return { title: d.title.trim() || 'Untitled study', kind: d.kind, doc: JSON.stringify(d) };
  }
  if (kind === 'note') {
    const d = doc as NoteDoc;
    return { title: d.title, body: d.body, links: JSON.stringify(d.links) };
  }
  return { verse_id: (doc as { verseId: string }).verseId };
}

const titleOf = (kind: RecordKind, doc: unknown): string => {
  if (isMark(kind)) return (doc as { verseId: string }).verseId;
  const d = doc as { title?: string; body?: string };
  return d.title?.trim() || d.body?.trim().slice(0, 60) || (kind === 'note' ? 'Untitled note' : 'Untitled');
};

const baseOf = (kind: RecordKind, id: string): LocalRecord['base'] => {
  const b = rows<{ doc: string; deleted: number }>('SELECT doc, deleted FROM sync_base WHERE kind = ? AND id = ?', [kind, id])[0];
  return b ? { doc: JSON.parse(b.doc) as unknown, deleted: !!b.deleted } : null;
};

const setBase = (kind: RecordKind, id: string, doc: unknown, deleted: boolean, rev: number) =>
  run('INSERT OR REPLACE INTO sync_base (kind, id, doc, deleted, rev) VALUES (?, ?, ?, ?, ?)', [
    kind,
    id,
    JSON.stringify(doc ?? null),
    deleted ? 1 : 0,
    rev,
  ]);

const dropBase = (kind: RecordKind, id: string) => run('DELETE FROM sync_base WHERE kind = ? AND id = ?', [kind, id]);

/**
 * Copy on write. The first time a backed up record changes after a sync, remember the version
 * the server has, so a later merge can tell what each side changed. Call before any change.
 */
export function cow(kind: RecordKind, id: string) {
  const row = getRow(kind, id);
  if (!row || row.dirty || Number(row.rev) === 0 || row.stub) return;
  setBase(kind, id, docOfRow(kind, row), row.deleted_at != null, Number(row.rev));
}

/** What the data layer stamps on a row it creates. */
export const ownerForNewRow = () => current;

const localOf = (kind: RecordKind, row: Raw): LocalRecord => ({
  doc: row.stub ? null : docOfRow(kind, row),
  deleted: row.deleted_at != null,
  stub: !!row.stub,
  dirty: !!row.dirty,
  rev: Number(row.rev),
  base: baseOf(kind, String(row.id)),
});

/** Writes a document into its table, creating the row if needed. Used for what the server sent. */
function put(kind: RecordKind, id: string, doc: unknown, m: { rev: number; deleted: boolean; dirty: boolean }) {
  const cols = columns(kind, doc);
  const now = Date.now();
  const names = ['id', ...Object.keys(cols), 'updated_at', 'deleted_at', 'dirty', 'rev', 'stub', 'account_id'];
  const values: unknown[] = [id, ...Object.values(cols), now, m.deleted ? now : null, m.dirty ? 1 : 0, m.rev, 0, current];
  if (!isMark(kind)) {
    names.push('created_at');
    values.push(now);
  }
  const updates = names
    .filter((n) => n !== 'id' && n !== 'created_at')
    .map((n) => `${n} = excluded.${n}`)
    .concat('change_seq = change_seq + 1');
  run(
    `INSERT INTO ${SYNC_TABLE[kind]} (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})
     ON CONFLICT(id) DO UPDATE SET ${updates.join(', ')}`,
    values,
  );
}

function removeRow(kind: RecordKind, id: string) {
  run(`DELETE FROM ${SYNC_TABLE[kind]} WHERE id = ?`, [id]);
  dropBase(kind, id);
  run('DELETE FROM sync_attention WHERE kind = ? AND id = ?', [kind, id]);
}

const history = (kind: RecordKind, id: string, doc: unknown, reason: string) =>
  run('INSERT INTO record_history (kind, record_id, doc, reason, saved_at) VALUES (?, ?, ?, ?, ?)', [
    kind,
    id,
    JSON.stringify(doc),
    reason,
    Date.now(),
  ]);

const state = (key: string): string | null =>
  rows<{ value: string }>('SELECT value FROM sync_state WHERE key = ?', [key])[0]?.value ?? null;
const setState = (key: string, value: string) =>
  run('INSERT INTO sync_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
const cursorKey = () => `cursor:${current}`;

/** Conditions for a row that this device should send for the signed in account. */
const SENDABLE = `dirty = 1 AND local_only = 0 AND account_id = (SELECT account_id FROM sync_cur)
  AND NOT (rev = 0 AND deleted_at IS NOT NULL AND stub = 0)`;

export const syncDbApi: SyncDbApi = {
  async setAccount(accountId) {
    current = accountId;
    run('DELETE FROM sync_cur');
    run('INSERT INTO sync_cur (account_id) VALUES (?)', [accountId]);
  },

  async syncOverview(): Promise<SyncOverview> {
    const counts = { sermon: 0, note: 0, study: 0, highlight: 0, bookmark: 0 } as Record<RecordKind, number>;
    const guestCounts = { sermons: 0, notes: 0, studies: 0, highlights: 0, bookmarks: 0 };
    const guestKey = { sermon: 'sermons', note: 'notes', study: 'studies', highlight: 'highlights', bookmark: 'bookmarks' } as const;
    let pending = 0;
    for (const kind of KINDS) {
      const t = SYNC_TABLE[kind];
      if (current) {
        pending +=
          rows<{ n: number }>(
            `SELECT COUNT(*) AS n FROM ${t} WHERE ${SENDABLE}
             AND NOT EXISTS (SELECT 1 FROM sync_attention a WHERE a.kind = ? AND a.id = ${t}.id)`,
            [kind],
          )[0]?.n ?? 0;
        counts[kind] =
          rows<{ n: number }>(`SELECT COUNT(*) AS n FROM ${t} WHERE account_id = ? AND rev > 0 AND deleted_at IS NULL AND stub = 0`, [current])[0]?.n ?? 0;
      }
      guestCounts[guestKey[kind]] =
        rows<{ n: number }>(`SELECT COUNT(*) AS n FROM ${t} WHERE account_id IS NULL AND local_only = 0 AND stub = 0 AND deleted_at IS NULL`)[0]?.n ?? 0;
    }
    const guest: GuestWork = { ...guestCounts, total: Object.values(guestCounts).reduce((a, b) => a + b, 0) };
    const attention = current ? (await syncDbApi.syncAttention()).length : 0;
    return {
      pending,
      attention,
      cursor: Number(current ? (state(cursorKey()) ?? 0) : 0),
      lastOkAt: current ? Number(state(`ok:${current}`) ?? 0) || null : null,
      counts,
      guest,
    };
  },

  async syncPrepare(maxBytes, limit, skip, account) {
    sameAccount(account);
    if (!current) return [];
    const out: SyncPending[] = [];
    let bytes = 0;
    for (const kind of KINDS) {
      const t = SYNC_TABLE[kind];
      // Something deleted before it ever reached the server has nothing to tell the server.
      run(`UPDATE ${t} SET dirty = 0 WHERE dirty = 1 AND rev = 0 AND deleted_at IS NOT NULL AND stub = 0 AND account_id = ?`, [current]);
      const list = rows<Raw>(
        `SELECT * FROM ${t} WHERE ${SENDABLE}
         AND NOT EXISTS (SELECT 1 FROM sync_attention a WHERE a.kind = ? AND a.id = ${t}.id)
         ORDER BY updated_at LIMIT ?`,
        [kind, limit + skip.length],
      );
      for (const row of list) {
        if (out.length >= limit) return out;
        if (skip.includes(`${kind}:${String(row.id)}`)) continue;
        const change: SyncPending = {
          kind,
          id: String(row.id),
          op: row.stub ? 'purge' : row.deleted_at != null ? 'delete' : 'put',
          baseRev: Number(row.rev),
          seq: Number(row.change_seq),
        };
        if (change.op === 'put') change.doc = docOfRow(kind, row);
        // Doc length approximates bytes. The server enforces the real limit.
        bytes += change.doc ? JSON.stringify(change.doc).length : 100;
        if (out.length > 0 && bytes > maxBytes) return out;
        out.push(change);
      }
    }
    return out;
  },

  async syncAfterPush(outcomes: PushOutcome[], account) {
    sameAccount(account);
    database().transaction(() => {
      for (const o of outcomes) {
        const t = SYNC_TABLE[o.kind];
        if (o.status === 'applied' && o.rev !== undefined) {
          if (o.op === 'purge') {
            // The server has confirmed it is gone. Now the stub can go too.
            removeRow(o.kind, o.id);
            continue;
          }
          run(`UPDATE ${t} SET rev = ?, dirty = CASE WHEN change_seq = ? THEN 0 ELSE 1 END WHERE id = ?`, [o.rev, o.seq, o.id]);
          const row = getRow(o.kind, o.id);
          if (row?.dirty) {
            // Edited again while the push was out. What the server holds now is what was sent.
            setBase(o.kind, o.id, o.op === 'put' ? o.doc : (baseOf(o.kind, o.id)?.doc ?? docOfRow(o.kind, row)), o.op !== 'put', o.rev);
          } else {
            dropBase(o.kind, o.id);
          }
        } else if (o.status === 'rejected') {
          run(
            `INSERT OR REPLACE INTO sync_attention (kind, id, type, remote_doc, remote_deleted, remote_rev, reason, created_at)
             VALUES (?, ?, 'rejected', NULL, 0, 0, ?, ?)`,
            [o.kind, o.id, o.reason ?? 'The server did not accept this change', Date.now()],
          );
        }
        // A conflict needs nothing here: the server's version arrives in the pull that follows.
      }
    });
  },

  async syncApplyPull(records: PulledRecord[], cursor, busy, account, saveCursor = true): Promise<ApplyReport> {
    sameAccount(account);
    const report: ApplyReport = { changed: [], conflicts: 0, notices: [] };
    let reached = Number(state(cursorKey()) ?? 0);
    let stopped = false;

    database().transaction(() => {
      for (const rec of records) {
        const key = `${rec.kind}:${rec.id}`;
        // A record being typed into right now waits for the next round, so a stale screen can never overwrite it.
        if (busy.includes(key)) {
          report.deferredAt = rec.rev;
          stopped = true;
          break;
        }
        applyOne(rec, report);
        reached = rec.rev;
      }
      if (saveCursor || stopped) setState(cursorKey(), String(stopped ? reached : cursor));
    });
    return report;
  },

  async syncDropMissing(seen) {
    if (!current) return 0;
    const keep = new Set(seen);
    let removed = 0;
    database().transaction(() => {
      for (const kind of KINDS) {
        const list = rows<Raw>(`SELECT id, rev, dirty FROM ${SYNC_TABLE[kind]} WHERE account_id = ? AND stub = 0`, [current]);
        for (const r of list) {
          if (keep.has(`${kind}:${String(r.id)}`)) continue;
          if (droppedByServer({ rev: Number(r.rev), dirty: !!r.dirty }) === 'remove') {
            removeRow(kind, String(r.id));
            removed++;
          }
        }
      }
    });
    return removed;
  },

  async syncSetCursor(cursor) {
    if (current) setState(cursorKey(), String(cursor));
  },

  async syncMarkOk() {
    if (current) setState(`ok:${current}`, String(Date.now()));
  },

  async syncAdopt(accountId, mode) {
    const before = (await syncDbApi.syncOverview()).guest;
    database().transaction(() => {
      for (const kind of KINDS) {
        const t = SYNC_TABLE[kind];
        if (mode === 'add') {
          run(
            `UPDATE ${t} SET account_id = ?, local_only = 0, rev = 0, dirty = 1, change_seq = change_seq + 1
             WHERE account_id IS NULL AND local_only = 0 AND stub = 0`,
            [accountId],
          );
        } else {
          run(`UPDATE ${t} SET local_only = 1 WHERE account_id IS NULL AND local_only = 0`);
        }
      }
    });
    return before;
  },

  async syncDetach(accountId) {
    database().transaction(() => {
      for (const kind of KINDS) {
        const t = SYNC_TABLE[kind];
        // Only this account's records: other accounts on the device keep their bases and open conflicts.
        for (const r of rows<{ id: string }>(`SELECT id FROM ${t} WHERE account_id = ?`, [accountId])) {
          run('DELETE FROM sync_base WHERE kind = ? AND id = ?', [kind, r.id]);
          run('DELETE FROM sync_attention WHERE kind = ? AND id = ?', [kind, r.id]);
        }
        // Content free stubs have nothing to keep. Everything else becomes guest work that stays on this device:
        // local_only, so it is never offered to the next account that signs in here.
        run(`DELETE FROM ${t} WHERE account_id = ? AND stub = 1`, [accountId]);
        run(`UPDATE ${t} SET account_id = NULL, rev = 0, dirty = 1, local_only = 1, change_seq = change_seq + 1 WHERE account_id = ?`, [accountId]);
      }
      run('DELETE FROM sync_state WHERE key LIKE ?', [`%:${accountId}`]);
    });
  },

  async syncRemoveCopy(accountId) {
    let removed = 0;
    let unsent = 0;
    database().transaction(() => {
      for (const kind of KINDS) {
        const t = SYNC_TABLE[kind];
        for (const r of rows<{ id: string; rev: number; dirty: number }>(`SELECT id, rev, dirty FROM ${t} WHERE account_id = ?`, [accountId])) {
          // Only what the server already holds and nothing changed since. Anything unsent stays, hidden.
          if (r.rev > 0 && !r.dirty) {
            removeRow(kind, r.id);
            removed++;
          } else {
            unsent++;
          }
        }
      }
    });
    return { removed, unsent };
  },

  async syncAttention() {
    if (!current) return [];
    const list = rows<{ kind: RecordKind; id: string; type: 'conflict' | 'rejected'; reason: string | null; created_at: number }>(
      'SELECT kind, id, type, reason, created_at FROM sync_attention ORDER BY created_at',
    );
    // Only this account's items. Another account's titles and text are never shown here.
    const mine = list.filter((a) => getRow(a.kind, a.id)?.account_id === current);
    return mine.map((a): AttentionItem => {
      const row = getRow(a.kind, a.id);
      return {
        kind: a.kind,
        id: a.id,
        type: a.type,
        reason: a.reason,
        createdAt: a.created_at,
        title: row && !row.stub ? titleOf(a.kind, docOfRow(a.kind, row)) : 'Removed item',
      };
    });
  },

  async syncConflict(kind, id): Promise<ConflictDetail | null> {
    const a = rows<{ remote_doc: string | null; remote_rev: number }>(
      `SELECT remote_doc, remote_rev FROM sync_attention WHERE kind = ? AND id = ? AND type = 'conflict'`,
      [kind, id],
    )[0];
    const row = getRow(kind, id);
    if (!a?.remote_doc || !row || row.stub || row.account_id !== current) return null;
    const base = baseOf(kind, id);
    return {
      kind,
      id,
      base: base && !base.deleted ? base.doc : null,
      local: docOfRow(kind, row),
      remote: JSON.parse(a.remote_doc) as unknown,
      remoteRev: a.remote_rev,
    };
  },

  async syncResolve(kind, id, doc, copy, expectedRev) {
    let done = false;
    database().transaction(() => {
      const a = rows<{ remote_doc: string | null; remote_rev: number }>(
        `SELECT remote_doc, remote_rev FROM sync_attention WHERE kind = ? AND id = ?`,
        [kind, id],
      )[0];
      const row = getRow(kind, id);
      // The choice was made on a version that has since moved, or the record changed state. Ask again.
      if (!a || !row || a.remote_rev !== expectedRev || row.deleted_at != null || row.account_id !== current) return;
      done = true;
      // Whatever is replaced stays recoverable for 30 days.
      history(kind, id, docOfRow(kind, row), 'conflict');
      put(kind, id, doc, { rev: a.remote_rev, deleted: false, dirty: true });
      if (a.remote_doc) setBase(kind, id, JSON.parse(a.remote_doc) as unknown, false, a.remote_rev);
      run('DELETE FROM sync_attention WHERE kind = ? AND id = ?', [kind, id]);
      if (copy !== undefined) put(kind, crypto.randomUUID(), copy, { rev: 0, deleted: false, dirty: true });
    });
    return done;
  },

  async syncRetry(kind, id) {
    run(`DELETE FROM sync_attention WHERE kind = ? AND id = ? AND type = 'rejected'`, [kind, id]);
  },
};

/** Applies one record from the server. Runs inside the caller's transaction. */
function applyOne(rec: PulledRecord, report: ApplyReport) {
  const { kind, id } = rec;
  const row = getRow(kind, id);
  // A highlight is one row per verse on a device. If it belongs to another account it is not this account's to compare.
  const local = row && (row.account_id == null || row.account_id === current) ? localOf(kind, row) : null;
  const out = reconcile(kind, local, rec);
  const key = `${kind}:${id}`;

  switch (out.action) {
    case 'none':
      return;
    case 'take': {
      if (out.doc === undefined) {
        // A deleted record with no content. Mark what we have deleted, if anything.
        if (row) {
          run(`UPDATE ${SYNC_TABLE[kind]} SET deleted_at = COALESCE(deleted_at, ?), rev = ?, dirty = 0 WHERE id = ?`, [Date.now(), out.rev, id]);
          dropBase(kind, id);
          run('DELETE FROM sync_attention WHERE kind = ? AND id = ?', [kind, id]);
          report.changed.push(key);
        }
        return;
      }
      put(kind, id, out.doc, { rev: out.rev, deleted: out.deleted, dirty: false });
      dropBase(kind, id);
      run('DELETE FROM sync_attention WHERE kind = ? AND id = ?', [kind, id]);
      report.changed.push(key);
      return;
    }
    case 'remove':
      removeRow(kind, id);
      report.changed.push(key);
      return;
    case 'keep': {
      run(`UPDATE ${SYNC_TABLE[kind]} SET rev = ? WHERE id = ?`, [out.rev, id]);
      // From here on the version this device builds on is the server's.
      setBase(kind, id, rec.doc ?? local?.doc ?? null, rec.deleted || rec.stub, out.rev);
      if (out.notice) report.notices.push({ kind, id, title: titleOf(kind, local?.doc ?? {}), notice: out.notice });
      return;
    }
    case 'merged': {
      if (!deepEqual(out.before, out.doc)) history(kind, id, out.before, 'merge');
      put(kind, id, out.doc, { rev: out.rev, deleted: false, dirty: true });
      setBase(kind, id, rec.doc, false, out.rev);
      report.changed.push(key);
      if (out.notice === 'kept-over-delete') report.notices.push({ kind, id, title: titleOf(kind, out.doc), notice: out.notice });
      return;
    }
    case 'conflict': {
      run(
        `INSERT OR REPLACE INTO sync_attention (kind, id, type, remote_doc, remote_deleted, remote_rev, reason, created_at)
         VALUES (?, ?, 'conflict', ?, ?, ?, NULL, ?)`,
        [kind, id, JSON.stringify(out.remoteDoc), out.remoteDeleted ? 1 : 0, out.rev, Date.now()],
      );
      report.conflicts++;
      return;
    }
  }
}
