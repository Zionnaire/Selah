import { BOOKS, type PassageRef } from '@selah/domain';
import { useEffect, useState } from 'react';
import { getDb } from '@/data/client';
import { useApp } from '@/store/app';

export interface XrefItem {
  ref: PassageRef;
  votes: number;
  /** Text of the target in the chosen translation, trimmed for display. */
  text: string;
  /** The verse number in the source passage that this link comes from. */
  from: number;
}

const MAX = 12;

/**
 * Cross-references for a set of verses in one chapter. Links to the same target from several
 * source verses are merged, and the passage itself is never offered as its own cross-reference.
 */
export function useXrefs(bookNo: number, chapter: number, verses: number[], translation: string) {
  const status = useApp((s) => s.xrefs);
  const [items, setItems] = useState<XrefItem[] | null>(null);
  const key = verses.join(',');

  useEffect(() => {
    if (status !== 'ready' || verses.length === 0) return setItems(verses.length === 0 ? [] : null);
    let live = true;
    void (async () => {
      const merged = new Map<string, XrefItem>();
      for (const v of verses) {
        for (const r of await getDb().xrefs(bookNo, chapter, v, MAX)) {
          if (r.book === bookNo && r.chapter === chapter && verses.includes(r.verse)) continue;
          const id = `${r.book}.${r.chapter}.${r.verse}.${r.end}`;
          const have = merged.get(id);
          if (have) {
            have.votes += r.votes;
            continue;
          }
          const book = BOOKS[r.book - 1]!;
          const rows = await getDb().verses([translation], r.book, r.chapter, r.verse, r.end);
          merged.set(id, {
            ref: { book: book.id, chapter: r.chapter, verseStart: r.verse, verseEnd: r.end },
            votes: r.votes,
            from: v,
            text: rows.map((x) => x.text).join(' '),
          });
        }
      }
      if (live) setItems([...merged.values()].sort((a, b) => b.votes - a.votes).slice(0, MAX));
    })();
    return () => {
      live = false;
    };
    // key stands in for the verses array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, bookNo, chapter, key, translation]);

  return { items, status };
}
