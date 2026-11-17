import { formatReference, getBook, parseReference } from '@selah/domain';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getDb } from '@/data/client';
import type { VerseRow } from '@/data/types';

interface Props {
  translation: string;
  abbr: string;
  onClose: () => void;
}

/** Quick lookup overlay. It sits on top, so the preacher's place in the sermon is never lost. */
export function FindVerse({ translation, abbr, onClose }: Props) {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<VerseRow[]>([]);
  const ref = parseReference(text);

  useEffect(() => {
    if (!ref) return setRows([]);
    let live = true;
    const book = getBook(ref.book)!;
    const end = ref.verseEnd === 0 ? 200 : ref.verseEnd;
    void getDb()
      .verses([translation], book.order, ref.chapter, ref.verseStart, end)
      .then((r) => live && setRows(r.map(({ verse, text: t }) => ({ verse, text: t }))));
    return () => {
      live = false;
    };
    // ref derives from text
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, translation]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="pulpit-dialog-wrap" role="dialog" aria-modal="true" aria-label="Find a verse">
      <div className="pulpit-dialog find">
        <div className="find-head">
          <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a reference, for example John 3:16" aria-label="Reference" />
          <button className="pulpit-icon" onClick={onClose} aria-label="Close">
            <X size={18} aria-hidden />
          </button>
        </div>
        {text && !ref && <p className="muted">Not a reference. Try Romans 12:2.</p>}
        {ref && rows.length > 0 && (
          <div className="pulpit-verses">
            <p className="pulpit-ref">{formatReference(ref)} <span className="tr-badge">{abbr}</span></p>
            <p>
              {rows.map((v) => (
                <span key={v.verse}>
                  <sup className="vnum">{v.verse}</sup>
                  {v.text}{' '}
                </span>
              ))}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
