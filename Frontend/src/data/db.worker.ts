/// <reference lib="webworker" />
import sqlite3InitModule, { type Database } from '@sqlite.org/sqlite-wasm';
import * as Comlink from 'comlink';
import { deepEqual } from '@selah/domain';
import { MIGRATIONS } from './schema';
import { rows, run, useDatabase, VISIBLE as VIS } from './sqlite';
import { cow, currentAccount, initSync, ownerForNewRow, syncDbApi } from './syncDb';
import type {
  BookmarkRow,
  CountRow,
  DbApi,
  DictEntry,
  DictHit,
  LexiconRow,
  OccurrenceRow,
  OriginalWord,
  DbInfo,
  DeletedRow,
  HighlightRow,
  NoteRow,
  SearchHit,
  SermonRow,
  StudyRow,
  TranslationRow,
  VerseRow,
  XrefRow,
} from './types';

const TABLE = { sermon: 'sermons', note: 'notes', study: 'studies' } as const;

let db: Database;
let info: DbInfo = { mode: 'memory', reason: 'not started' };

function migrate() {
  const current = Number(rows<{ user_version: number }>('PRAGMA user_version')[0]?.user_version ?? 0);
  MIGRATIONS.forEach((sql, i) => {
    const version = i + 1;
    if (version <= current) return;
    db.transaction(() => {
      db.exec(sql);
      db.exec(`PRAGMA user_version = ${version}`);
    });
  });
}

const safeParse = (text: string | null | undefined): unknown => {
  try {
    return text ? (JSON.parse(text) as unknown) : null;
  } catch {
    return null;
  }
};

const existingDoc = (table: 'sermons' | 'studies', id: string): string | null =>
  rows<{ doc: string }>(`SELECT doc FROM ${table} WHERE id = ?`, [id])[0]?.doc ?? null;

/**
 * Saving the same content again is not an edit: it must not mark the record changed, move its
 * time, or touch a deleted record. Returns the existing time to answer with, or null to go ahead.
 */
function unchanged(kind: keyof typeof TABLE, id: string, sameContent: () => boolean): number | null {
  const row = rows<{ updated_at: number }>(`SELECT updated_at FROM ${TABLE[kind]} WHERE id = ? AND stub = 0`, [id])[0];
  return row && sameContent() ? row.updated_at : null;
}

/**
 * Permanent delete. A record the server knows about becomes a content free stub that waits to be
 * confirmed, so other devices learn it is gone. One the server never saw is simply removed.
 */
function purgeRow(kind: keyof typeof TABLE, id: string) {
  const t = TABLE[kind];
  const row = rows<{ rev: number }>(`SELECT rev FROM ${t} WHERE id = ? AND deleted_at IS NOT NULL`, [id])[0];
  if (!row) return;
  run('DELETE FROM sync_base WHERE kind = ? AND id = ?', [kind, id]);
  run('DELETE FROM sync_attention WHERE kind = ? AND id = ?', [kind, id]);
  if (row.rev === 0) {
    run(`DELETE FROM ${t} WHERE id = ?`, [id]);
    return;
  }
  const blank =
    kind === 'sermon' ? "title = '', passage = NULL, series = NULL, preach_date = NULL, doc = ''"
    : kind === 'note' ? "title = '', body = '', links = '[]'"
    : "title = '', doc = ''";
  run(`UPDATE ${t} SET ${blank}, stub = 1, dirty = 1, change_seq = change_seq + 1 WHERE id = ?`, [id]);
}

const MARK_TABLE = { highlight: 'highlights', bookmark: 'bookmarks' } as const;

/** A highlight or bookmark is the verse itself: its id is the canonical verse id. */
function setMark(kind: keyof typeof MARK_TABLE, verseId: string, on: boolean) {
  const t = MARK_TABLE[kind];
  const now = Date.now();
  const me = currentAccount();
  const row = rows<{ account_id: string | null; deleted_at: number | null }>(
    `SELECT account_id, deleted_at FROM ${t} WHERE id = ?`,
    [verseId],
  )[0];
  // One row per verse on a device. If it belongs to another account that this person cannot see,
  // marking it takes the row over, so it is never shown to them under the old owner.
  const foreign = !!row && row.account_id !== null && me !== null && row.account_id !== me;
  if (!row) {
    if (on) {
      run(`INSERT INTO ${t} (id, verse_id, updated_at, dirty, account_id, change_seq) VALUES (?, ?, ?, 1, ?, 1)`, [
        verseId,
        verseId,
        now,
        ownerForNewRow(),
      ]);
    }
    return;
  }
  if (foreign) {
    if (!on) return;
    run('DELETE FROM sync_base WHERE kind = ? AND id = ?', [kind, verseId]);
    run(
      `UPDATE ${t} SET deleted_at = NULL, stub = 0, rev = 0, account_id = ?, local_only = 0, updated_at = ?, dirty = 1, change_seq = change_seq + 1 WHERE id = ?`,
      [me, now, verseId],
    );
    return;
  }
  const isOn = row.deleted_at === null;
  if (on === isOn) return;
  cow(kind, verseId);
  run(
    `UPDATE ${t} SET deleted_at = ?, stub = 0, updated_at = ?, dirty = 1, change_seq = change_seq + 1 WHERE id = ?`,
    [on ? null : now, now, verseId],
  );
}

const api: DbApi = {
  ...syncDbApi,

  async init() {
    const sqlite3 = await sqlite3InitModule();
    try {
      // sahpool needs no cross origin isolation headers, unlike the plain opfs VFS.
      const pool = await sqlite3.installOpfsSAHPoolVfs({ name: 'selah', clearOnInit: false });
      db = new pool.OpfsSAHPoolDb('/selah.db');
      info = { mode: 'persistent' };
    } catch (err) {
      db = new sqlite3.oo1.DB(':memory:', 'c');
      info = {
        mode: 'memory',
        reason: err instanceof Error ? err.message : 'Persistent storage is not available',
      };
    }
    useDatabase(db);
    run('PRAGMA foreign_keys = ON');
    migrate();
    initSync();
    return info;
  },

  async translations() {
    return rows<TranslationRow>(
      'SELECT id, installed_at AS installedAt, verse_count AS verseCount FROM translations ORDER BY id',
    );
  },

  async installTranslation(id, books, onProgress) {
    const cb = onProgress as ((p: number) => void) | undefined;
    db.transaction(() => {
      run('DELETE FROM verses WHERE translation_id = ?', [id]);
      const stmt = db.prepare(
        'INSERT INTO verses (translation_id, book, chapter, verse, text) VALUES (?, ?, ?, ?, ?)',
      );
      let count = 0;
      try {
        books.forEach((chapters, b) => {
          chapters.forEach((verses, c) => {
            verses.forEach((text, v) => {
              if (!text) return;
              stmt.bind([id, b + 1, c + 1, v + 1, text]).stepReset();
              count++;
            });
          });
          if (cb) cb((b + 1) / books.length);
        });
      } finally {
        stmt.finalize();
      }
      run(
        'INSERT OR REPLACE INTO translations (id, installed_at, verse_count) VALUES (?, ?, ?)',
        [id, Date.now(), count],
      );
    });
    // Rebuild the search index outside the big write so a failure here keeps the text readable.
    run(`INSERT INTO verses_fts(verses_fts) VALUES ('rebuild')`);
  },

  async removeTranslation(id) {
    db.transaction(() => {
      run('DELETE FROM verses WHERE translation_id = ?', [id]);
      run('DELETE FROM translations WHERE id = ?', [id]);
    });
    run(`INSERT INTO verses_fts(verses_fts) VALUES ('rebuild')`);
  },

  async chapter(translation, book, chapter) {
    return rows<VerseRow>(
      `SELECT verse, text FROM verses
       WHERE translation_id = ? AND book = ? AND chapter = ? ORDER BY verse`,
      [translation, book, chapter],
    );
  },

  async verses(translations, book, chapter, from, to) {
    if (!translations.length) return [];
    const marks = translations.map(() => '?').join(',');
    return rows<VerseRow & { translation: string }>(
      `SELECT translation_id AS translation, verse, text FROM verses
       WHERE translation_id IN (${marks}) AND book = ? AND chapter = ? AND verse BETWEEN ? AND ?
       ORDER BY verse, translation_id`,
      [...translations, book, chapter, from, to],
    );
  },

  async search(translation, query, limit = 60) {
    const terms = query
      .replace(/["*()^:-]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => `"${t}"*`)
      .join(' ');
    if (!terms) return [];
    return rows<SearchHit>(
      `SELECT v.book, v.chapter, v.verse,
              snippet(verses_fts, 0, '[[', ']]', '…', 24) AS snippet
       FROM verses_fts
       JOIN verses v ON v.id = verses_fts.rowid
       WHERE verses_fts MATCH ? AND v.translation_id = ?
       ORDER BY v.book, v.chapter, v.verse
       LIMIT ?`,
      [terms, translation, limit],
    );
  },

  async highlights(book, chapter) {
    const prefix = `${book}.${chapter}.`;
    return rows<HighlightRow>(
      `SELECT id, verse_id AS verseId FROM highlights
       WHERE deleted_at IS NULL AND ${VIS} AND verse_id LIKE ? ESCAPE '\\'`,
      [`${prefix}%`],
    );
  },

  async toggleHighlight(verseIds, on) {
    db.transaction(() => {
      for (const verseId of verseIds) setMark('highlight', verseId, on);
    });
  },

  async bookmarks(book, chapter) {
    return rows<HighlightRow>(
      `SELECT id, verse_id AS verseId FROM bookmarks
       WHERE deleted_at IS NULL AND ${VIS} AND verse_id LIKE ? ESCAPE '\\'`,
      [`${book}.${chapter}.%`],
    );
  },

  async toggleBookmark(verseId, on) {
    db.transaction(() => setMark('bookmark', verseId, on));
  },

  async sermons() {
    return rows<SermonRow>(
      `SELECT id, title, passage, status, preach_date AS preachDate, series,
              target_minutes AS targetMinutes, words, sections_total AS sectionsTotal,
              sections_started AS sectionsStarted, created_at AS createdAt, updated_at AS updatedAt
       FROM sermons WHERE deleted_at IS NULL AND ${VIS} ORDER BY updated_at DESC`,
    );
  },

  async sermon(id) {
    const row = rows<{ doc: string; createdAt: number; updatedAt: number }>(
      `SELECT doc, created_at AS createdAt, updated_at AS updatedAt
       FROM sermons WHERE id = ? AND deleted_at IS NULL AND ${VIS}`,
      [id],
    )[0];
    return row ?? null;
  },

  /** Insert or update. Returns the updated_at written so the caller can detect stale writes. */
  async saveSermon(s) {
    const same = unchanged('sermon', s.id, () => deepEqual(JSON.parse(s.doc), safeParse(existingDoc('sermons', s.id))));
    if (same !== null) return same;
    const now = Date.now();
    cow('sermon', s.id);
    run(
      `INSERT INTO sermons (id, title, passage, status, preach_date, series, target_minutes, words,
                            sections_total, sections_started, doc, created_at, updated_at, dirty, account_id, change_seq)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title, passage = excluded.passage, status = excluded.status,
         preach_date = excluded.preach_date, series = excluded.series,
         target_minutes = excluded.target_minutes, words = excluded.words,
         sections_total = excluded.sections_total, sections_started = excluded.sections_started,
         doc = excluded.doc, updated_at = excluded.updated_at, dirty = 1, change_seq = change_seq + 1`,
      [s.id, s.title, s.passage, s.status, s.preachDate, s.series, s.targetMinutes, s.words,
       s.sectionsTotal, s.sectionsStarted, s.doc, now, now, ownerForNewRow()],
    );
    return now;
  },

  async deleteSermon(id) {
    const now = Date.now();
    cow('sermon', id);
    run('UPDATE sermons SET deleted_at = ?, updated_at = ?, dirty = 1, change_seq = change_seq + 1 WHERE id = ?', [now, now, id]);
  },

  async dictCount() {
    return rows<{ n: number }>('SELECT COUNT(*) AS n FROM dict')[0]?.n ?? 0;
  },

  async installDict(url, onProgress) {
    const cb = onProgress as ((p: number) => void) | undefined;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not download the dictionary (${res.status})`);
    cb?.(0.3);
    const entries = (await res.json()) as [string, string][];
    cb?.(0.5);
    db.transaction(() => {
      run('DELETE FROM dict');
      const stmt = db.prepare('INSERT INTO dict (headword, body) VALUES (?, ?)');
      try {
        for (const [h, b] of entries) stmt.bind([h, b]).stepReset();
      } finally {
        stmt.finalize();
      }
    });
    cb?.(0.85);
    run(`INSERT INTO dict_fts(dict_fts) VALUES ('rebuild')`);
    cb?.(1);
  },

  async removeDict() {
    run('DELETE FROM dict');
    run(`INSERT INTO dict_fts(dict_fts) VALUES ('rebuild')`);
  },

  async dictBrowse(prefix, limit = 80) {
    const p = prefix.replace(/[%_]/g, '');
    return rows<DictHit>(
      `SELECT id, headword, NULL AS snippet FROM dict WHERE headword LIKE ? ORDER BY headword COLLATE NOCASE LIMIT ?`,
      [`${p}%`, limit],
    );
  },

  /** Headword matches come first, then matches inside the text. */
  async dictSearch(query, limit = 40) {
    const q = query.trim();
    if (!q) return [];
    const heads = await api.dictBrowse(q, limit);
    const terms = q
      .replace(/["*()^:-]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => `"${t}"*`)
      .join(' ');
    if (!terms) return heads;
    const text = rows<DictHit>(
      `SELECT d.id, d.headword, snippet(dict_fts, 1, '[[', ']]', '…', 22) AS snippet
       FROM dict_fts JOIN dict d ON d.id = dict_fts.rowid
       WHERE dict_fts MATCH ? ORDER BY rank LIMIT ?`,
      [terms, limit],
    );
    const have = new Set(heads.map((h) => h.id));
    return [...heads, ...text.filter((t) => !have.has(t.id))].slice(0, limit);
  },

  async dictEntry(id) {
    return rows<DictEntry>('SELECT id, headword, body FROM dict WHERE id = ?', [id])[0] ?? null;
  },

  async dictFind(headword) {
    return (
      rows<DictEntry>('SELECT id, headword, body FROM dict WHERE headword = ? COLLATE NOCASE LIMIT 1', [headword])[0] ??
      rows<DictEntry>('SELECT id, headword, body FROM dict WHERE headword LIKE ? COLLATE NOCASE ORDER BY length(headword) LIMIT 1', [`${headword}%`])[0] ??
      null
    );
  },

  async originalStatus() {
    const n = rows<{ n: number }>('SELECT COUNT(*) AS n FROM orig_words')[0]?.n ?? 0;
    return { installed: n > 0, words: n };
  },

  async installOriginal(baseUrl, onProgress) {
    const cb = onProgress as ((p: number) => void) | undefined;
    type Table = { first: number; strongs: string[]; grammar: string[]; books: [string, string, string, number, number][][][][] };

    // Streams a JSON file and reports progress between from and to (0 to 1).
    const getJson = async <T>(file: string, from: number, to: number): Promise<T> => {
      const res = await fetch(`${baseUrl}${file}`);
      if (!res.ok || !res.body) throw new Error(`Could not download ${file} (${res.status})`);
      const total = Number(res.headers.get('content-length')) || 0;
      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        got += value.length;
        if (total) cb?.(from + (to - from) * Math.min(1, got / total));
      }
      cb?.(to);
      return JSON.parse(await new Blob(chunks as BlobPart[]).text()) as T;
    };

    const lexicon = await getJson<Record<string, { l: string; x: string; p: string; g: string; d?: string; u?: string }>>('lexicon.json', 0, 0.05);
    const ot = await getJson<Table>('original-ot.json', 0.05, 0.4);
    const nt = await getJson<Table>('original-nt.json', 0.4, 0.55);

    run('DROP INDEX IF EXISTS orig_by_strong');
    run('DROP INDEX IF EXISTS orig_by_verse');
    db.transaction(() => {
      run('DELETE FROM orig_words');
      run('DELETE FROM lexicon');

      const lx = db.prepare('INSERT INTO lexicon (strong, lemma, translit, pos, gloss, def, usage) VALUES (?, ?, ?, ?, ?, ?, ?)');
      try {
        for (const [k, e] of Object.entries(lexicon)) lx.bind([k, e.l, e.x, e.p, e.g, e.d ?? null, e.u ?? null]).stepReset();
      } finally {
        lx.finalize();
      }

      const ins = db.prepare('INSERT INTO orig_words (book, chapter, verse, pos, word, translit, gloss, strong, grammar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      try {
        let done = 0;
        const total = ot.books.length + nt.books.length;
        for (const t of [ot, nt]) {
          t.books.forEach((chapters, bi) => {
            chapters.forEach((verses, ci) => {
              verses.forEach((words, vi) => {
                words.forEach((w, pi) => {
                  ins.bind([t.first + bi, ci + 1, vi + 1, pi, w[0], w[1], w[2], t.strongs[w[3]]!, t.grammar[w[4]]!]).stepReset();
                });
              });
            });
            cb?.(0.55 + 0.35 * (++done / total));
          });
        }
      } finally {
        ins.finalize();
      }
    });
    run('CREATE INDEX orig_by_strong ON orig_words (strong, book, chapter, verse, pos)');
    run('CREATE INDEX orig_by_verse ON orig_words (book, chapter, verse, pos)');
    cb?.(1);
  },

  async removeOriginal() {
    run('DROP INDEX IF EXISTS orig_by_strong');
    run('DROP INDEX IF EXISTS orig_by_verse');
    run('DELETE FROM orig_words');
    run('DELETE FROM lexicon');
  },

  async originalVerse(book, chapter, verse) {
    return rows<OriginalWord>(
      `SELECT w.pos, w.word, w.translit, w.gloss, w.strong, w.grammar, l.lemma AS lemma
       FROM orig_words w LEFT JOIN lexicon l ON l.strong = w.strong
       WHERE w.book = ? AND w.chapter = ? AND w.verse = ? ORDER BY w.pos`,
      [book, chapter, verse],
    );
  },

  async lexiconEntry(strong) {
    return rows<LexiconRow>(
      'SELECT strong, lemma, translit, pos, gloss, def, usage FROM lexicon WHERE strong = ?',
      [strong],
    )[0] ?? null;
  },

  async occurrences(strong, limit, offset) {
    const total = rows<{ n: number }>('SELECT COUNT(*) AS n FROM orig_words WHERE strong = ?', [strong])[0]?.n ?? 0;
    const list = rows<OccurrenceRow>(
      `SELECT book, chapter, verse, pos, word, gloss FROM orig_words WHERE strong = ?
       ORDER BY book, chapter, verse, pos LIMIT ? OFFSET ?`,
      [strong, limit, offset],
    );
    return { total, rows: list };
  },

  async renderings(strong) {
    return rows<CountRow>(
      `SELECT gloss AS label, COUNT(*) AS n FROM orig_words WHERE strong = ? AND gloss != ''
       GROUP BY gloss ORDER BY n DESC, gloss LIMIT 14`,
      [strong],
    );
  },

  async forms(strong) {
    return rows<CountRow>(
      `SELECT word AS label, COUNT(*) AS n FROM orig_words WHERE strong = ?
       GROUP BY word ORDER BY n DESC, word LIMIT 24`,
      [strong],
    );
  },

  async studies() {
    return rows<StudyRow>(
      `SELECT id, title, kind, doc, created_at AS createdAt, updated_at AS updatedAt
       FROM studies WHERE deleted_at IS NULL AND ${VIS} ORDER BY updated_at DESC`,
    );
  },

  async study(id) {
    return (
      rows<StudyRow>(
        `SELECT id, title, kind, doc, created_at AS createdAt, updated_at AS updatedAt
         FROM studies WHERE id = ? AND deleted_at IS NULL AND ${VIS}`,
        [id],
      )[0] ?? null
    );
  },

  async saveStudy(s) {
    const same = unchanged('study', s.id, () => deepEqual(JSON.parse(s.doc), safeParse(existingDoc('studies', s.id))));
    if (same !== null) return same;
    const now = Date.now();
    cow('study', s.id);
    run(
      `INSERT INTO studies (id, title, kind, doc, created_at, updated_at, dirty, account_id, change_seq)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, 1)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title, kind = excluded.kind, doc = excluded.doc,
         updated_at = excluded.updated_at, dirty = 1, change_seq = change_seq + 1`,
      [s.id, s.title, s.kind, s.doc, now, now, ownerForNewRow()],
    );
    return now;
  },

  async deleteStudy(id) {
    const now = Date.now();
    cow('study', id);
    run('UPDATE studies SET deleted_at = ?, updated_at = ?, dirty = 1, change_seq = change_seq + 1 WHERE id = ?', [now, now, id]);
  },

  async installXrefs(data, onProgress) {
    const cb = onProgress as ((p: number) => void) | undefined;
    db.transaction(() => {
      run('DELETE FROM xrefs');
      const stmt = db.prepare('INSERT INTO xrefs (sb, sc, sv, db, dc, dv, de, votes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      try {
        data.forEach((r, i) => {
          stmt.bind(r).stepReset();
          if (cb && i % 5000 === 0) cb(i / data.length);
        });
      } finally {
        stmt.finalize();
      }
    });
    cb?.(1);
  },

  async xrefCount() {
    return rows<{ n: number }>('SELECT COUNT(*) AS n FROM xrefs')[0]?.n ?? 0;
  },

  async xrefs(book, chapter, verse, limit = 12) {
    return rows<XrefRow>(
      `SELECT db AS book, dc AS chapter, dv AS verse, de AS "end", votes
       FROM xrefs WHERE sb = ? AND sc = ? AND sv = ? ORDER BY votes DESC LIMIT ?`,
      [book, chapter, verse, limit],
    );
  },

  async notes() {
    return rows<NoteRow>(
      `SELECT id, title, body, links, created_at AS createdAt, updated_at AS updatedAt
       FROM notes WHERE deleted_at IS NULL AND ${VIS} ORDER BY updated_at DESC`,
    );
  },

  async note(id) {
    return (
      rows<NoteRow>(
        `SELECT id, title, body, links, created_at AS createdAt, updated_at AS updatedAt
         FROM notes WHERE id = ? AND deleted_at IS NULL AND ${VIS}`,
        [id],
      )[0] ?? null
    );
  },

  async saveNote(n) {
    const same = unchanged('note', n.id, () => {
      const cur = rows<{ title: string; body: string; links: string }>('SELECT title, body, links FROM notes WHERE id = ?', [n.id])[0];
      return !!cur && cur.title === n.title && cur.body === n.body && deepEqual(safeParse(cur.links), safeParse(n.links));
    });
    if (same !== null) return same;
    const now = Date.now();
    cow('note', n.id);
    run(
      `INSERT INTO notes (id, title, body, links, created_at, updated_at, dirty, account_id, change_seq)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, 1)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title, body = excluded.body,
         links = excluded.links, updated_at = excluded.updated_at, dirty = 1, change_seq = change_seq + 1`,
      [n.id, n.title, n.body, n.links, now, now, ownerForNewRow()],
    );
    return now;
  },

  async deleteNote(id) {
    const now = Date.now();
    cow('note', id);
    run('UPDATE notes SET deleted_at = ?, updated_at = ?, dirty = 1, change_seq = change_seq + 1 WHERE id = ?', [now, now, id]);
  },

  async allBookmarks() {
    return rows<BookmarkRow>(
      `SELECT id, verse_id AS verseId, updated_at AS updatedAt FROM bookmarks
       WHERE deleted_at IS NULL AND ${VIS} ORDER BY updated_at DESC`,
    );
  },

  async deletedItems() {
    return rows<DeletedRow>(
      `SELECT 'sermon' AS kind, id, title, deleted_at AS deletedAt FROM sermons WHERE deleted_at IS NOT NULL AND stub = 0 AND ${VIS}
       UNION ALL
       SELECT 'note' AS kind, id,
              CASE WHEN title != '' THEN title ELSE substr(body, 1, 80) END AS title,
              deleted_at AS deletedAt
       FROM notes WHERE deleted_at IS NOT NULL AND stub = 0 AND ${VIS}
       UNION ALL
       SELECT 'study' AS kind, id, title, deleted_at AS deletedAt FROM studies WHERE deleted_at IS NOT NULL AND stub = 0 AND ${VIS}
       ORDER BY deletedAt DESC`,
    );
  },

  // Table names come from a closed set, never from user input.
  async restore(kind, id) {
    cow(kind, id);
    run(`UPDATE ${TABLE[kind]} SET deleted_at = NULL, updated_at = ?, dirty = 1, change_seq = change_seq + 1 WHERE id = ? AND stub = 0`, [Date.now(), id]);
  },

  async purge(kind, id) {
    db.transaction(() => purgeRow(kind, id));
  },

  async purgeExpired(days) {
    const cutoff = Date.now() - days * 86_400_000;
    let removed = 0;
    db.transaction(() => {
      for (const kind of Object.keys(TABLE) as (keyof typeof TABLE)[]) {
        const ids = rows<{ id: string }>(
          `SELECT id FROM ${TABLE[kind]} WHERE deleted_at IS NOT NULL AND deleted_at < ? AND stub = 0`,
          [cutoff],
        );
        for (const { id } of ids) {
          purgeRow(kind, id);
          removed++;
        }
      }
      run('DELETE FROM record_history WHERE saved_at < ?', [cutoff]);
    });
    return removed;
  },

  async getSetting(key) {
    return rows<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key])[0]?.value ?? null;
  },

  async setSetting(key, value) {
    run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [
      key,
      value,
    ]);
  },
};

Comlink.expose(api);
