import { getDb } from './db';

export type MarkKind = 'highlight' | 'bookmark';
const TABLE = { highlight: 'highlights', bookmark: 'bookmarks' } as const;

/** Verse ids in a chapter that carry this mark. A mark is the verse itself: its id is the canonical verse id. */
export async function markedInChapter(kind: MarkKind, bookId: string, chapterNo: number): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ verse_id: string }>(
    `SELECT verse_id FROM ${TABLE[kind]} WHERE deleted_at IS NULL AND verse_id LIKE ?`,
    `${bookId}.${chapterNo}.%`,
  );
  return new Set(rows.map((r) => r.verse_id));
}

/**
 * Turns marks on or off for verses. Off is a soft delete, so it can sync. Nothing is ever hard deleted here,
 * and every change bumps change_seq, which tells a later push which edit it carried.
 */
export async function setMarks(kind: MarkKind, verseIds: string[], on: boolean): Promise<void> {
  const db = await getDb();
  const t = TABLE[kind];
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (const id of verseIds) {
      if (on) {
        await db.runAsync(
          `INSERT INTO ${t} (id, verse_id, updated_at, dirty, change_seq) VALUES (?, ?, ?, 1, 1)
           ON CONFLICT(id) DO UPDATE SET deleted_at = NULL, stub = 0, updated_at = excluded.updated_at, dirty = 1, change_seq = change_seq + 1
           WHERE ${t}.deleted_at IS NOT NULL`,
          id,
          id,
          now,
        );
      } else {
        await db.runAsync(
          `UPDATE ${t} SET deleted_at = ?, updated_at = ?, dirty = 1, change_seq = change_seq + 1 WHERE id = ? AND deleted_at IS NULL`,
          now,
          now,
          id,
        );
      }
    }
  });
}
