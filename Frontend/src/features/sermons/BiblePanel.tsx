import { TRANSLATIONS, formatReference, getBook, parseReference, type PassageRef } from '@selah/domain';
import { ChevronDown, Plus } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { getDb } from '@/data/client';
import type { VerseRow } from '@/data/types';
import { useApp } from '@/store/app';

interface Props {
  start?: PassageRef;
  translation: string;
  onTranslation: (id: string) => void;
  onInsert: (ref: PassageRef) => void;
  /** The tab strip, shared with the other panels. */
  header: ReactNode;
  hidden: boolean;
  /** On narrow screens the panel opens as a sheet over the manuscript. */
  sheet: boolean;
}

/** Look up any passage from the device while writing, and drop it into the manuscript. */
export function BiblePanel({ start, translation, onTranslation, onInsert, header, hidden, sheet }: Props) {
  const installed = Object.keys(useApp((s) => s.installed));
  const [text, setText] = useState(start ? formatReference(start) : '');
  const [ref, setRef] = useState<PassageRef | null>(start ?? null);
  const [verses, setVerses] = useState<VerseRow[]>([]);

  const onType = (v: string) => {
    setText(v);
    setRef(parseReference(v));
  };

  useEffect(() => {
    if (!ref) return setVerses([]);
    let live = true;
    const book = getBook(ref.book)!;
    const end = ref.verseEnd === 0 ? 200 : ref.verseEnd;
    void getDb()
      .verses([translation], book.order, ref.chapter, ref.verseStart, end)
      .then((rows) => live && setVerses(rows.map(({ verse, text: t }) => ({ verse, text: t }))));
    return () => {
      live = false;
    };
  }, [ref, translation]);

  return (
    <aside className={`editor-panel${sheet ? ' is-sheet' : ''}`} aria-label="Bible" hidden={hidden}>
      {header}
      <div className="panel-pad">
        <label className="field">
          <span className="sr-only">Passage</span>
          <input value={text} onChange={(e) => onType(e.target.value)} placeholder="Look up a passage" aria-invalid={!!text && !ref} />
        </label>
        <label className="select panel-select">
          <span className="sr-only">Translation</span>
          <select value={translation} onChange={(e) => onTranslation(e.target.value)}>
            {installed.map((id) => (
              <option key={id} value={id}>
                {TRANSLATIONS.find((t) => t.id === id)?.abbr ?? id}
              </option>
            ))}
          </select>
          <ChevronDown size={15} aria-hidden />
        </label>

        {ref && verses.length > 0 && (
          <>
            <div className="scripture panel-verses">
              <p className="ref">{formatReference(ref)}</p>
              <p>
                {verses.map((v) => (
                  <span key={v.verse}>
                    <sup className="vnum">{v.verse}</sup>
                    {v.text}{' '}
                  </span>
                ))}
              </p>
            </div>
            <button className="btn btn-sm" onClick={() => onInsert(ref)}>
              <Plus size={14} aria-hidden /> Insert as Scripture
            </button>
            <p className="muted small">The sermon keeps the reference, so you can change the translation later.</p>
          </>
        )}
        {text && !ref && <p className="field-error">That reference is not in the Bible.</p>}
      </div>
    </aside>
  );
}
