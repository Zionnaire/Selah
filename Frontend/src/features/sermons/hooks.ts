import { getBook, type PassageRef, type SermonDoc } from '@selah/domain';
import { useCallback, useEffect, useState } from 'react';
import { getDb } from '@/data/client';
import type { VerseRow } from '@/data/types';
import { useAutosave, type AutosaveIo } from '@/lib/useAutosave';
import { sermonRepo, type SermonListItem } from './repo';

export function useSermonList() {
  const [items, setItems] = useState<SermonListItem[] | null>(null);
  const reload = useCallback(() => {
    void sermonRepo.list().then(setItems);
  }, []);
  useEffect(reload, [reload]);
  return { items, reload };
}

export type { SaveState } from '@/lib/useAutosave';

const sermonIo: AutosaveIo<SermonDoc> = {
  kind: 'sermon',
  async load(id) {
    const s = await sermonRepo.load(id);
    if (!s) return null;
    const { id: _i, createdAt: _c, updatedAt, ...doc } = s;
    return { doc, updatedAt };
  },
  save: (id, doc) => sermonRepo.save(id, doc),
};

export const useSermonEditor = (id: string) => useAutosave<SermonDoc>(id, sermonIo);

const keyOf = (r: PassageRef) => `${r.book}.${r.chapter}.${r.verseStart}.${r.verseEnd}`;

/** Resolves scripture references to text in one translation, read from the device. */
export function useScriptureTexts(refs: PassageRef[], translation: string) {
  const [texts, setTexts] = useState<Record<string, VerseRow[]>>({});
  const signature = refs.map(keyOf).join('|');

  useEffect(() => {
    let live = true;
    const unique = [...new Map(refs.map((r) => [keyOf(r), r])).values()];
    void Promise.all(
      unique.map(async (r) => {
        const book = getBook(r.book);
        if (!book) return [keyOf(r), []] as const;
        const end = r.verseEnd === 0 ? 200 : r.verseEnd;
        const rows = await getDb().verses([translation], book.order, r.chapter, r.verseStart, end);
        return [keyOf(r), rows.map(({ verse, text }) => ({ verse, text }))] as const;
      }),
    ).then((pairs) => live && setTexts(Object.fromEntries(pairs)));
    return () => {
      live = false;
    };
    // signature captures the refs, avoiding a new effect for every identical array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, translation]);

  return { texts, keyOf };
}
