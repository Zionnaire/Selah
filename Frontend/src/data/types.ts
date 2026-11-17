import type { RecordKind } from '@selah/domain';

export interface DbInfo {
  /** persistent: stored on this device. memory: lost on reload (storage unavailable). */
  mode: 'persistent' | 'memory';
  reason?: string;
}

export interface TranslationRow {
  id: string;
  installedAt: number;
  verseCount: number;
}

export interface VerseRow {
  verse: number;
  text: string;
}

export interface SearchHit {
  book: number;
  chapter: number;
  verse: number;
  /** Matches are wrapped in [[ and ]]. */
  snippet: string;
}

export interface HighlightRow {
  id: string;
  verseId: string;
}

/** Library row: enough to list a sermon without parsing its document. */
export interface SermonRow {
  id: string;
  title: string;
  passage: string | null;
  status: string;
  preachDate: string | null;
  series: string | null;
  targetMinutes: number;
  words: number;
  sectionsTotal: number;
  sectionsStarted: number;
  createdAt: number;
  updatedAt: number;
}

export interface SermonSave {
  id: string;
  doc: string;
  title: string;
  passage: string | null;
  status: string;
  preachDate: string | null;
  series: string | null;
  targetMinutes: number;
  words: number;
  sectionsTotal: number;
  sectionsStarted: number;
}

export interface NoteRow {
  id: string;
  title: string;
  body: string;
  links: string;
  createdAt: number;
  updatedAt: number;
}

export interface BookmarkRow {
  id: string;
  verseId: string;
  updatedAt: number;
}

export interface OriginalStatus {
  installed: boolean;
  words: number;
}

export interface OriginalWord {
  pos: number;
  word: string;
  translit: string;
  gloss: string;
  strong: string;
  grammar: string;
  lemma: string | null;
}

export interface LexiconRow {
  strong: string;
  lemma: string;
  translit: string;
  pos: string;
  gloss: string;
  def: string | null;
  usage: string | null;
}

export interface OccurrenceRow {
  book: number;
  chapter: number;
  verse: number;
  pos: number;
  word: string;
  gloss: string;
}

export interface CountRow {
  label: string;
  n: number;
}

export interface DictEntry {
  id: number;
  headword: string;
  body: string;
}

export interface DictHit {
  id: number;
  headword: string;
  /** Matches are wrapped in [[ and ]]. Only present for text matches. */
  snippet: string | null;
}

export type DeletableKind = 'sermon' | 'note' | 'study';

export interface StudyRow {
  id: string;
  title: string;
  kind: string;
  doc: string;
  createdAt: number;
  updatedAt: number;
}

export interface XrefRow {
  book: number;
  chapter: number;
  verse: number;
  end: number;
  votes: number;
}

export interface DeletedRow {
  kind: DeletableKind;
  id: string;
  title: string;
  deletedAt: number;
}

/** Book content: books[book][chapter][verse] with everything zero-based. */
export type BibleBooks = string[][][];

export interface DbApi extends SyncDbApi {
  init(): Promise<DbInfo>;
  translations(): Promise<TranslationRow[]>;
  installTranslation(id: string, books: BibleBooks, onProgress?: unknown): Promise<void>;
  removeTranslation(id: string): Promise<void>;
  chapter(translation: string, book: number, chapter: number): Promise<VerseRow[]>;
  verses(
    translations: string[],
    book: number,
    chapter: number,
    from: number,
    to: number,
  ): Promise<(VerseRow & { translation: string })[]>;
  search(translation: string, query: string, limit?: number): Promise<SearchHit[]>;
  highlights(book: string, chapter: number): Promise<HighlightRow[]>;
  toggleHighlight(verseIds: string[], on: boolean): Promise<void>;
  bookmarks(book: string, chapter: number): Promise<HighlightRow[]>;
  toggleBookmark(verseId: string, on: boolean): Promise<void>;
  sermons(): Promise<SermonRow[]>;
  sermon(id: string): Promise<{ doc: string; createdAt: number; updatedAt: number } | null>;
  saveSermon(input: SermonSave): Promise<number>;
  deleteSermon(id: string): Promise<void>;
  dictCount(): Promise<number>;
  installDict(url: string, onProgress?: unknown): Promise<void>;
  removeDict(): Promise<void>;
  dictSearch(query: string, limit?: number): Promise<DictHit[]>;
  dictBrowse(prefix: string, limit?: number): Promise<DictHit[]>;
  dictEntry(id: number): Promise<DictEntry | null>;
  dictFind(headword: string): Promise<DictEntry | null>;
  originalStatus(): Promise<OriginalStatus>;
  /** Fetches and imports the Word Study data. Runs inside the worker so nothing large is copied. */
  installOriginal(baseUrl: string, onProgress?: unknown): Promise<void>;
  removeOriginal(): Promise<void>;
  originalVerse(book: number, chapter: number, verse: number): Promise<OriginalWord[]>;
  lexiconEntry(strong: string): Promise<LexiconRow | null>;
  occurrences(strong: string, limit: number, offset: number): Promise<{ total: number; rows: OccurrenceRow[] }>;
  renderings(strong: string): Promise<CountRow[]>;
  forms(strong: string): Promise<CountRow[]>;
  studies(): Promise<StudyRow[]>;
  study(id: string): Promise<StudyRow | null>;
  saveStudy(input: { id: string; title: string; kind: string; doc: string }): Promise<number>;
  deleteStudy(id: string): Promise<void>;
  installXrefs(rows: number[][], onProgress?: unknown): Promise<void>;
  xrefCount(): Promise<number>;
  xrefs(book: number, chapter: number, verse: number, limit?: number): Promise<XrefRow[]>;
  notes(): Promise<NoteRow[]>;
  note(id: string): Promise<NoteRow | null>;
  saveNote(input: { id: string; title: string; body: string; links: string }): Promise<number>;
  deleteNote(id: string): Promise<void>;
  allBookmarks(): Promise<BookmarkRow[]>;
  deletedItems(): Promise<DeletedRow[]>;
  restore(kind: DeletableKind, id: string): Promise<void>;
  purge(kind: DeletableKind, id: string): Promise<void>;
  /** Permanently removes items deleted more than the given number of days ago. */
  purgeExpired(days: number): Promise<number>;
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
}

/** One change waiting to be sent. `seq` says which local edit it carries. */
export interface SyncPending {
  kind: RecordKind;
  id: string;
  op: 'put' | 'delete' | 'purge';
  baseRev: number;
  seq: number;
  doc?: unknown;
}

export interface PushOutcome extends SyncPending {
  status: 'applied' | 'conflict' | 'rejected';
  rev?: number;
  reason?: string;
}

export interface GuestWork {
  sermons: number;
  notes: number;
  studies: number;
  highlights: number;
  bookmarks: number;
  total: number;
}

export interface SyncOverview {
  /** Changes waiting to be sent for the signed in account. */
  pending: number;
  /** Records that need the person: a conflict or a change the server refused. */
  attention: number;
  cursor: number;
  lastOkAt: number | null;
  /** Backed up, by kind. */
  counts: Record<RecordKind, number>;
  /** Work done without an account that has not been added or kept local. */
  guest: GuestWork;
}

export interface AttentionItem {
  kind: RecordKind;
  id: string;
  type: 'conflict' | 'rejected';
  title: string;
  reason: string | null;
  createdAt: number;
}

export interface ConflictDetail {
  kind: RecordKind;
  id: string;
  /** Null when this device never had a base to compare to. */
  base: unknown;
  local: unknown;
  remote: unknown;
  remoteRev: number;
}

export interface ApplyReport {
  /** Keys (`kind:id`) of records the server version changed on this device. */
  changed: string[];
  conflicts: number;
  /** Plain explanations to show the person, in order. */
  notices: { kind: RecordKind; id: string; title: string; notice: 'kept-over-delete' | 'restored-by-edit' | 'merged' }[];
  /** Set when a record the person is editing right now was left for the next round. */
  deferredAt?: number;
}

export interface SyncDbApi {
  /** Tells the data layer who is using the app. Null for a guest. */
  setAccount(accountId: string | null): Promise<void>;
  syncOverview(): Promise<SyncOverview>;
  /** `skip` holds keys (`kind:id`) already tried this round, so a refused record is not sent in a loop. */
  syncPrepare(maxBytes: number, limit: number, skip: string[], account: string): Promise<SyncPending[]>;
  syncAfterPush(outcomes: PushOutcome[], account: string): Promise<void>;
  syncApplyPull(
    records: import('@selah/domain').PulledRecord[],
    cursor: number,
    busy: string[],
    account: string,
    /** False during a full read, so an interrupted read starts again instead of skipping what was not checked. */
    saveCursor?: boolean,
  ): Promise<ApplyReport>;
  /** After a full read: removes what the server no longer has and the person never changed. */
  syncDropMissing(seen: string[]): Promise<number>;
  syncSetCursor(cursor: number): Promise<void>;
  syncMarkOk(): Promise<void>;
  /** Adds guest work to the account, or keeps it on this device only. */
  syncAdopt(accountId: string, mode: 'add' | 'keep'): Promise<GuestWork>;
  /** The account is gone. Its work on this device becomes guest work. */
  syncDetach(accountId: string): Promise<void>;
  syncAttention(): Promise<AttentionItem[]>;
  syncConflict(kind: RecordKind, id: string): Promise<ConflictDetail | null>;
  /** Finishes a conflict: `doc` becomes the local version and is sent. `copy` is added as a separate record. */
  syncResolve(kind: RecordKind, id: string, doc: unknown, copy: unknown, expectedRev: number): Promise<boolean>;
  /** Removes this account's backed up work from this device. Unsent changes stay, hidden. */
  syncRemoveCopy(accountId: string): Promise<{ removed: number; unsent: number }>;
  /** Puts a refused record back in the queue, for example after the person shortened it. */
  syncRetry(kind: RecordKind, id: string): Promise<void>;
}
