/**
 * Ordered migrations. Never edit one that has shipped, append a new entry instead.
 * Entries are applied in order and PRAGMA user_version tracks how many have run.
 *
 * User data tables carry id, updated_at, deleted_at and dirty so the sync engine can be added
 * later without rewriting them: rows are never hard deleted, and dirty marks unsent changes.
 */
export const MIGRATIONS: string[] = [
  `
  CREATE TABLE translations (
    id            TEXT PRIMARY KEY,
    installed_at  INTEGER NOT NULL,
    verse_count   INTEGER NOT NULL
  );

  CREATE TABLE verses (
    id              INTEGER PRIMARY KEY,
    translation_id  TEXT    NOT NULL,
    book            INTEGER NOT NULL,
    chapter         INTEGER NOT NULL,
    verse           INTEGER NOT NULL,
    text            TEXT    NOT NULL,
    UNIQUE (translation_id, book, chapter, verse)
  );

  CREATE VIRTUAL TABLE verses_fts USING fts5(
    text,
    content = 'verses',
    content_rowid = 'id',
    tokenize = 'porter unicode61 remove_diacritics 2'
  );

  CREATE TABLE highlights (
    id          TEXT PRIMARY KEY,
    verse_id    TEXT NOT NULL UNIQUE,
    updated_at  INTEGER NOT NULL,
    deleted_at  INTEGER,
    dirty       INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE bookmarks (
    id          TEXT PRIMARY KEY,
    verse_id    TEXT NOT NULL UNIQUE,
    updated_at  INTEGER NOT NULL,
    deleted_at  INTEGER,
    dirty       INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE settings (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
  );
  `,
  // 2: sermons. The full document is stored as JSON in doc; the other columns are a
  // denormalised summary so the library can list and filter without parsing every document.
  `
  CREATE TABLE sermons (
    id                TEXT PRIMARY KEY,
    title             TEXT    NOT NULL,
    passage           TEXT,
    status            TEXT    NOT NULL DEFAULT 'idea',
    preach_date       TEXT,
    series            TEXT,
    target_minutes    INTEGER NOT NULL DEFAULT 30,
    words             INTEGER NOT NULL DEFAULT 0,
    sections_total    INTEGER NOT NULL DEFAULT 0,
    sections_started  INTEGER NOT NULL DEFAULT 0,
    doc               TEXT    NOT NULL,
    created_at        INTEGER NOT NULL,
    updated_at        INTEGER NOT NULL,
    deleted_at        INTEGER,
    dirty             INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX sermons_recent ON sermons (deleted_at, updated_at DESC);
  `,
  // 3: notes. links is a JSON array of what the note is attached to. A note never depends on
  // its links, so deleting a sermon keeps the note.
  `
  CREATE TABLE notes (
    id          TEXT PRIMARY KEY,
    title       TEXT    NOT NULL DEFAULT '',
    body        TEXT    NOT NULL DEFAULT '',
    links       TEXT    NOT NULL DEFAULT '[]',
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL,
    deleted_at  INTEGER,
    dirty       INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX notes_recent ON notes (deleted_at, updated_at DESC);
  `,
  // 4: studies (the user's own research documents) and the cross-reference dataset.
  `
  CREATE TABLE studies (
    id          TEXT PRIMARY KEY,
    title       TEXT    NOT NULL,
    kind        TEXT    NOT NULL,
    doc         TEXT    NOT NULL,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL,
    deleted_at  INTEGER,
    dirty       INTEGER NOT NULL DEFAULT 1
  );
  CREATE INDEX studies_recent ON studies (deleted_at, updated_at DESC);

  CREATE TABLE xrefs (
    sb INTEGER NOT NULL, sc INTEGER NOT NULL, sv INTEGER NOT NULL,
    db INTEGER NOT NULL, dc INTEGER NOT NULL, dv INTEGER NOT NULL, de INTEGER NOT NULL,
    votes INTEGER NOT NULL
  );
  CREATE INDEX xrefs_source ON xrefs (sb, sc, sv, votes DESC);
  `,
  // 5: original language words and the lexicon behind Word Study. Reference data, installed on
  // request. The lookup indexes are created after the bulk insert, which is much faster.
  `
  CREATE TABLE orig_words (
    book     INTEGER NOT NULL,
    chapter  INTEGER NOT NULL,
    verse    INTEGER NOT NULL,
    pos      INTEGER NOT NULL,
    word     TEXT    NOT NULL,
    translit TEXT    NOT NULL,
    gloss    TEXT    NOT NULL,
    strong   TEXT    NOT NULL,
    grammar  TEXT    NOT NULL
  );

  CREATE TABLE lexicon (
    strong   TEXT PRIMARY KEY,
    lemma    TEXT NOT NULL,
    translit TEXT NOT NULL,
    pos      TEXT NOT NULL,
    gloss    TEXT NOT NULL,
    def      TEXT,
    usage    TEXT
  );
  `,
  // 6: the interim Bible Dictionary (Smith, 1884). Headword and full text are searchable.
  `
  CREATE TABLE dict (
    id        INTEGER PRIMARY KEY,
    headword  TEXT NOT NULL,
    body      TEXT NOT NULL
  );
  CREATE INDEX dict_headword ON dict (headword COLLATE NOCASE);
  CREATE VIRTUAL TABLE dict_fts USING fts5(
    headword, body,
    content = 'dict',
    content_rowid = 'id',
    tokenize = 'porter unicode61 remove_diacritics 2'
  );
  `,
  // 7: sync (ADR 0005). A highlight or bookmark is keyed by the verse itself, so two devices that
  // mark the same verse offline are one record. Each syncable row learns who owns it (account_id,
  // empty for guest work), whether the owner chose to keep it off the account (local_only), the
  // server version last seen (rev), a counter that tells a push which edits it carried (change_seq)
  // and whether it is a content free stub waiting for the server to confirm a permanent delete.
  `
  UPDATE highlights SET id = verse_id;
  UPDATE bookmarks SET id = verse_id;

  ALTER TABLE sermons    ADD COLUMN account_id TEXT;
  ALTER TABLE sermons    ADD COLUMN local_only INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE sermons    ADD COLUMN change_seq INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE sermons    ADD COLUMN rev INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE sermons    ADD COLUMN stub INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE notes      ADD COLUMN account_id TEXT;
  ALTER TABLE notes      ADD COLUMN local_only INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE notes      ADD COLUMN change_seq INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE notes      ADD COLUMN rev INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE notes      ADD COLUMN stub INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE studies    ADD COLUMN account_id TEXT;
  ALTER TABLE studies    ADD COLUMN local_only INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE studies    ADD COLUMN change_seq INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE studies    ADD COLUMN rev INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE studies    ADD COLUMN stub INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE highlights ADD COLUMN account_id TEXT;
  ALTER TABLE highlights ADD COLUMN local_only INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE highlights ADD COLUMN change_seq INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE highlights ADD COLUMN rev INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE highlights ADD COLUMN stub INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE bookmarks  ADD COLUMN account_id TEXT;
  ALTER TABLE bookmarks  ADD COLUMN local_only INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE bookmarks  ADD COLUMN change_seq INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE bookmarks  ADD COLUMN rev INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE bookmarks  ADD COLUMN stub INTEGER NOT NULL DEFAULT 0;

  -- The last version the server and this device agreed on. Written the first time a synced record
  -- changes, so it only exists for records edited since the last sync.
  CREATE TABLE sync_base (
    kind     TEXT    NOT NULL,
    id       TEXT    NOT NULL,
    doc      TEXT    NOT NULL,
    deleted  INTEGER NOT NULL DEFAULT 0,
    rev      INTEGER NOT NULL,
    PRIMARY KEY (kind, id)
  );

  CREATE TABLE sync_state (
    key    TEXT PRIMARY KEY,
    value  TEXT NOT NULL
  );

  -- Records the person has to look at: a conflict, or a change the server refused.
  CREATE TABLE sync_attention (
    kind            TEXT    NOT NULL,
    id              TEXT    NOT NULL,
    type            TEXT    NOT NULL,
    remote_doc      TEXT,
    remote_deleted  INTEGER NOT NULL DEFAULT 0,
    remote_rev      INTEGER NOT NULL DEFAULT 0,
    reason          TEXT,
    created_at      INTEGER NOT NULL,
    PRIMARY KEY (kind, id)
  );

  -- A version about to be replaced by a merge or a choice. Kept 30 days.
  CREATE TABLE record_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    kind       TEXT    NOT NULL,
    record_id  TEXT    NOT NULL,
    doc        TEXT    NOT NULL,
    reason     TEXT    NOT NULL,
    saved_at   INTEGER NOT NULL
  );
  CREATE INDEX record_history_record ON record_history (kind, record_id, saved_at DESC);
  `,
];
