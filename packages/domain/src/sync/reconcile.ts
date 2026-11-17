import type { NoteDoc } from '../note';
import type { SermonDoc } from '../sermon';
import type { StudyDoc } from '../study';
import { deepEqual } from './equal';
import { mergeMark, mergeNote, mergeSermon, mergeStudy } from './merge';
import type { PulledRecord, RecordKind } from './protocol';

/** What this device holds for one record, in the shape the sync engine needs. */
export interface LocalRecord {
  /** The syncable document. For a highlight or bookmark, `{ verseId }`. */
  doc: unknown;
  deleted: boolean;
  /** A purge waiting to reach the server. The content is already gone. */
  stub: boolean;
  /** Changed on this device since the last sync. */
  dirty: boolean;
  /** The server rev this device last saw for the record. 0 if it never reached the server. */
  rev: number;
  /** The last version the server and this device agreed on. Only present while the record is dirty. */
  base: { doc: unknown; deleted: boolean } | null;
}

export type Remote = Pick<PulledRecord, 'kind' | 'rev' | 'deleted' | 'stub' | 'doc'>;

/** A short plain sentence for the person, never shown for a quiet merge. */
export type Notice = 'kept-over-delete' | 'restored-by-edit' | 'merged';

export type Outcome =
  /** Already seen, or an echo of this device's own push. */
  | { action: 'none' }
  /** Take the server version as the clean local version. */
  | { action: 'take'; doc: unknown; deleted: boolean; rev: number }
  /** The record is gone on the server and nothing here depends on it. Remove the local row. */
  | { action: 'remove' }
  /** Keep the local version, move its base forward, and push it. */
  | { action: 'keep'; rev: number; notice?: Notice }
  /** A merged document that still differs from the server, so it is pushed. `before` is the local document it replaced. */
  | { action: 'merged'; doc: unknown; rev: number; before: unknown; notice: Notice; overwritten: string[] }
  /** The same thing changed on both devices. The local version stays in use until the person chooses. */
  | { action: 'conflict'; rev: number; remoteDoc: unknown; remoteDeleted: boolean };

const docOf = (r: Remote) => r.doc;

function mergeDocs(kind: RecordKind, base: unknown, local: unknown, remote: unknown) {
  if (kind === 'sermon') return mergeSermon(base as SermonDoc | null, local as SermonDoc, remote as SermonDoc);
  if (kind === 'study') return mergeStudy(base as StudyDoc | null, local as StudyDoc, remote as StudyDoc);
  return mergeNote(base as NoteDoc | null, local as NoteDoc, remote as NoteDoc);
}

/**
 * Decides what a record from the server does to this device's copy. No clocks, no guessing:
 * only the local copy, the server copy and the last version both agreed on.
 * Nothing the person wrote is dropped. Where that cannot be promised, the result is a conflict.
 */
export function reconcile(kind: RecordKind, local: LocalRecord | null, remote: Remote): Outcome {
  if (!local) {
    if (remote.stub) return { action: 'none' };
    return { action: 'take', doc: docOf(remote), deleted: remote.deleted, rev: remote.rev };
  }
  if (remote.rev <= local.rev) return { action: 'none' };

  if (!local.dirty) {
    if (remote.stub) return { action: 'remove' };
    return { action: 'take', doc: docOf(remote), deleted: remote.deleted, rev: remote.rev };
  }

  // From here this device has changes the server has not seen.

  // "Delete forever" here is deliberate. It meets whatever the server has.
  if (local.stub) return remote.stub ? { action: 'remove' } : { action: 'keep', rev: remote.rev };

  if (kind === 'highlight' || kind === 'bookmark') {
    const present = mergeMark(local.base ? !local.base.deleted : undefined, !local.deleted, !remote.deleted && !remote.stub);
    if (present === (!remote.deleted && !remote.stub)) {
      return remote.stub ? { action: 'remove' } : { action: 'take', doc: docOf(remote), deleted: remote.deleted, rev: remote.rev };
    }
    return { action: 'keep', rev: remote.rev };
  }

  if (remote.stub) {
    // Gone for good elsewhere. If this device only deleted it too, we agree. If it was edited here, the edit stays.
    return local.deleted ? { action: 'remove' } : { action: 'keep', rev: remote.rev, notice: 'kept-over-delete' };
  }

  if (local.deleted && remote.deleted) return { action: 'take', doc: docOf(remote), deleted: true, rev: remote.rev };
  if (remote.deleted) return { action: 'keep', rev: remote.rev, notice: 'kept-over-delete' };

  if (local.deleted) {
    // Deleted here, live there. If the other device did not change it since the base, the delete stands.
    if (local.base && deepEqual(local.base.doc, remote.doc)) return { action: 'keep', rev: remote.rev };
    return { action: 'take', doc: docOf(remote), deleted: false, rev: remote.rev };
  }

  const merge = mergeDocs(kind, local.base && !local.base.deleted ? local.base.doc : null, local.doc, remote.doc);
  if (merge.conflicts.length > 0) {
    return { action: 'conflict', rev: remote.rev, remoteDoc: remote.doc, remoteDeleted: false };
  }
  if (deepEqual(merge.merged, remote.doc)) return { action: 'take', doc: remote.doc, deleted: false, rev: remote.rev };

  const { notices } = merge;
  const notice: Notice = notices.keptSections.length || notices.keptBlocks.length ? 'kept-over-delete' : 'merged';
  return {
    action: 'merged',
    doc: merge.merged,
    rev: remote.rev,
    before: local.doc,
    notice,
    overwritten: notices.overwritten.map((o) => o.field),
  };
}

/** A record this device holds that is not in the server's full list. It was removed and pruned elsewhere. */
export function droppedByServer(local: Pick<LocalRecord, 'dirty' | 'rev'>): 'remove' | 'keep' {
  // Never touch what was not backed up, or what was changed since.
  return local.rev > 0 && !local.dirty ? 'remove' : 'keep';
}
