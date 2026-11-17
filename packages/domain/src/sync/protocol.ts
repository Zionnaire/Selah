import { z } from 'zod';
import { noteDocSchema } from '../note';
import { sermonDocSchema } from '../sermon';
import { studyDocSchema } from '../study';

/** What can sync. Reference data (Bibles, cross-references, lexicon, dictionary) never does. */
export const RECORD_KINDS = ['sermon', 'note', 'study', 'highlight', 'bookmark'] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];

/** Highlights and bookmarks are keyed by the verse itself, so the id is the canonical verse id. */
export const markDocSchema = z.object({ verseId: z.string().regex(/^[1-3]?[A-Z]{2,3}\.\d{1,3}\.\d{1,3}$/) });

export const docSchemaFor = (kind: RecordKind) =>
  ({ sermon: sermonDocSchema, note: noteDocSchema, study: studyDocSchema, highlight: markDocSchema, bookmark: markDocSchema })[kind];

export const LIMITS = {
  maxChangesPerPush: 100,
  /** Serialised size of one record. A long sermon is far below this. */
  maxRecordBytes: 500_000,
  maxRecordsPerAccount: 20_000,
  /** A push that deletes more than this many records waits for the person to confirm. */
  massDeleteThreshold: 25,
  pullPageSize: 200,
} as const;

/**
 * put: create or replace.   delete: a soft delete tombstone (the content is kept so it can be restored).
 * purge: remove the content for good, leaving only a stub so other devices learn it is gone.
 */
export const changeSchema = z
  .object({
    kind: z.enum(RECORD_KINDS),
    id: z.string().min(1).max(80),
    /** The server rev this device last saw for the record. 0 for a record it created. */
    baseRev: z.number().int().min(0),
    op: z.enum(['put', 'delete', 'purge']),
    doc: z.unknown().optional(),
  })
  .refine((c) => c.op !== 'put' || c.doc !== undefined, { message: 'A put needs a document', path: ['doc'] });

export const pushSchema = z.object({
  /** Makes a retry after a dropped connection safe. One per batch. */
  key: z.string().min(8).max(100),
  changes: z.array(changeSchema).min(1).max(LIMITS.maxChangesPerPush),
  confirmMassDelete: z.boolean().optional(),
});

export type Change = z.infer<typeof changeSchema>;
export type PushRequest = z.infer<typeof pushSchema>;

export type ChangeResult =
  | { kind: RecordKind; id: string; status: 'applied'; rev: number }
  /** The document is not included. A conflicted device pulls the current version. */
  | { kind: RecordKind; id: string; status: 'conflict'; rev: number; deleted: boolean }
  | { kind: RecordKind; id: string; status: 'rejected'; reason: string };

export interface PushResponse {
  results: ChangeResult[];
}

export interface PulledRecord {
  kind: RecordKind;
  id: string;
  rev: number;
  deleted: boolean;
  /** True once the content was purged. Only the id remains. */
  stub: boolean;
  doc?: unknown;
}

export interface PullResponse {
  records: PulledRecord[];
  /** Pass this as `since` next time. */
  cursor: number;
  hasMore: boolean;
  /** True when the cursor is older than the server keeps deletions for. Do a full reconcile instead. */
  resync?: boolean;
}

export const pullQuerySchema = z.object({
  since: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(LIMITS.pullPageSize).default(LIMITS.pullPageSize),
  /** Read everything from the start even if the cursor is behind the deletion horizon. Used to reconcile. */
  full: z.enum(['1']).optional(),
});
