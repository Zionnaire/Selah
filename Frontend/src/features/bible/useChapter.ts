import { useCallback, useEffect, useState } from 'react';
import { getDb } from '@/data/client';
import type { VerseRow } from '@/data/types';

interface ChapterData {
  verses: VerseRow[];
  loading: boolean;
}

/** Loads one chapter of one translation. Stale responses are dropped when the target changes. */
export function useChapterText(translation: string, bookNo: number, chapter: number): ChapterData {
  const [state, setState] = useState<ChapterData>({ verses: [], loading: true });

  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    getDb()
      .chapter(translation, bookNo, chapter)
      .then((verses) => live && setState({ verses, loading: false }))
      .catch(() => live && setState({ verses: [], loading: false }));
    return () => {
      live = false;
    };
  }, [translation, bookNo, chapter]);

  return state;
}

/** Highlights and bookmarks for a chapter as sets of verse numbers, with optimistic toggles. */
export function useMarks(bookId: string, chapter: number) {
  const [highlights, setHighlights] = useState<Set<number>>(new Set());
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());

  useEffect(() => {
    let live = true;
    const num = (id: string) => Number(id.split('.')[2]);
    Promise.all([getDb().highlights(bookId, chapter), getDb().bookmarks(bookId, chapter)]).then(
      ([h, b]) => {
        if (!live) return;
        setHighlights(new Set(h.map((r) => num(r.verseId))));
        setBookmarks(new Set(b.map((r) => num(r.verseId))));
      },
    );
    return () => {
      live = false;
    };
  }, [bookId, chapter]);

  const setHighlighted = useCallback(
    (verses: number[], on: boolean) => {
      setHighlights((prev) => {
        const next = new Set(prev);
        verses.forEach((v) => (on ? next.add(v) : next.delete(v)));
        return next;
      });
      void getDb().toggleHighlight(
        verses.map((v) => `${bookId}.${chapter}.${v}`),
        on,
      );
    },
    [bookId, chapter],
  );

  const setBookmarked = useCallback(
    (verse: number, on: boolean) => {
      setBookmarks((prev) => {
        const next = new Set(prev);
        if (on) next.add(verse);
        else next.delete(verse);
        return next;
      });
      void getDb().toggleBookmark(`${bookId}.${chapter}.${verse}`, on);
    },
    [bookId, chapter],
  );

  return { highlights, bookmarks, setHighlighted, setBookmarked };
}
