import { BOOKS, STUDY_KIND_LABEL, formatReference, noteDisplayTitle, parseVerseId, type Note } from '@selah/domain';
import { useCallback, useEffect, useState } from 'react';
import { getDb } from '@/data/client';
import { useApp } from '@/store/app';
import { useReader } from '@/store/reader';
import { sermonRepo, type SermonListItem } from '../sermons/repo';
import { studyRepo } from '../study/repo';
import { notesRepo } from './notesRepo';

export type ItemKind = 'sermon' | 'note' | 'study' | 'bookmark';

export interface LibraryItem {
  kind: ItemKind;
  id: string;
  title: string;
  subtitle: string;
  updatedAt: number;
  href: string;
  /** Bookmarks are removed by verse id, the others by their own id. */
  verseId?: string;
}

const clip = (s: string, n = 70) => (s.length > n ? `${s.slice(0, n).trimEnd()}...` : s);

/** Everything the user has saved, as one list, built from what is on this device. */
export function useLibrary() {
  const installed = useApp((s) => s.installed);
  const pref = useReader((s) => s.translation);
  const translation = installed[pref] ? pref : (Object.keys(installed)[0] ?? 'kjv');

  const [data, setData] = useState<{ sermons: SermonListItem[]; notes: Note[]; items: LibraryItem[] } | null>(null);

  const reload = useCallback(async () => {
    const [sermons, notes, marks, studies] = await Promise.all([
      sermonRepo.list(),
      notesRepo.list(),
      getDb().allBookmarks(),
      studyRepo.list(),
    ]);

    const bookmarkItems = await Promise.all(
      marks.map(async (m): Promise<LibraryItem | null> => {
        const v = parseVerseId(m.verseId);
        const book = v && BOOKS.find((b) => b.id === v.book);
        if (!v || !book) return null;
        const rows = await getDb().verses([translation], book.order, v.chapter, v.verse, v.verse);
        const ref = formatReference({ book: v.book, chapter: v.chapter, verseStart: v.verse, verseEnd: v.verse });
        return {
          kind: 'bookmark',
          id: m.id,
          verseId: m.verseId,
          title: ref,
          subtitle: `Bookmark${rows[0] ? `, ${clip(rows[0].text)}` : ''}`,
          updatedAt: m.updatedAt,
          href: `/bible/${v.book}/${v.chapter}?v=${v.verse}`,
        };
      }),
    );

    const items: LibraryItem[] = [
      ...sermons.map((s): LibraryItem => ({
        kind: 'sermon',
        id: s.id,
        title: s.title,
        subtitle: `Sermon${s.passage ? `, ${formatReference(s.passage)}` : ''}`,
        updatedAt: s.updatedAt,
        href: `/sermons/${s.id}`,
      })),
      ...notes.map((n): LibraryItem => {
        const first = n.links.find((l) => l.type === 'passage');
        return {
          kind: 'note',
          id: n.id,
          title: noteDisplayTitle(n),
          subtitle: `Note${first && first.type === 'passage' ? ` on ${formatReference(first.ref)}` : ''}`,
          updatedAt: n.updatedAt,
          href: `/library/notes/${n.id}`,
        };
      }),
      ...studies.map((s): LibraryItem => ({
        kind: 'study',
        id: s.id,
        title: s.title,
        subtitle: `${STUDY_KIND_LABEL[s.kind]}${s.passage ? `, ${formatReference(s.passage)}` : ''}`,
        updatedAt: s.updatedAt,
        href: `/study/${s.id}`,
      })),
      ...bookmarkItems.filter((x): x is LibraryItem => x !== null),
    ];
    setData({ sermons, notes, items });
  }, [translation]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, reload };
}
