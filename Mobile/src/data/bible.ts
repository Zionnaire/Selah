import { BOOKS, getBook, type TranslationInfo } from '@selah/domain';
import { getDb } from './db';

export interface Verse {
  verse: number;
  text: string;
}

/** Book content as the web app ships it: books[book][chapter][verse], everything zero based. */
export type BibleBooks = string[][][];

export async function isInstalled(translationId: string): Promise<boolean> {
  const db = await getDb();
  return !!(await db.getFirstAsync('SELECT 1 FROM translations WHERE id = ?', translationId));
}

/**
 * Puts a translation into SQLite, once. The text is read from the file bundled in the app, so the
 * first launch needs no network. Progress runs from 0 to 1 and the search index is built at the end.
 */
export async function installTranslation(t: TranslationInfo, books: BibleBooks, onProgress?: (p: number) => void): Promise<void> {
  const db = await getDb();
  let count = 0;
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM verses WHERE translation_id = ?', t.id);
    const stmt = await db.prepareAsync('INSERT INTO verses (translation_id, book, chapter, verse, text) VALUES (?, ?, ?, ?, ?)');
    try {
      for (let b = 0; b < books.length; b++) {
        const chapters = books[b]!;
        for (let c = 0; c < chapters.length; c++) {
          const verses = chapters[c]!;
          for (let v = 0; v < verses.length; v++) {
            const text = verses[v];
            if (!text) continue;
            await stmt.executeAsync(t.id, b + 1, c + 1, v + 1, text);
            count++;
          }
        }
        onProgress?.((b + 1) / books.length);
      }
    } finally {
      await stmt.finalizeAsync();
    }
    await db.runAsync('INSERT OR REPLACE INTO translations (id, installed_at, verse_count) VALUES (?, ?, ?)', t.id, Date.now(), count);
  });
  await db.execAsync(`INSERT INTO verses_fts(verses_fts) VALUES ('rebuild')`);
}

export async function chapter(translationId: string, bookId: string, chapterNo: number): Promise<Verse[]> {
  const book = getBook(bookId);
  if (!book) return [];
  const db = await getDb();
  return db.getAllAsync<Verse>(
    'SELECT verse, text FROM verses WHERE translation_id = ? AND book = ? AND chapter = ? ORDER BY verse',
    translationId,
    book.order,
    chapterNo,
  );
}

/** The canonical id for a verse, the key for every highlight, bookmark and note: ROM.12.2 */
export const verseId = (bookId: string, chapterNo: number, verse: number) => `${bookId}.${chapterNo}.${verse}`;

export const bookName = (id: string) => BOOKS.find((b) => b.id === id)?.name ?? id;
