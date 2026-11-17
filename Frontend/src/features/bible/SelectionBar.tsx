import { Bookmark, Check, Columns2, Copy, Highlighter, Languages, NotebookPen, X } from 'lucide-react';
import { useState } from 'react';

interface Props {
  label: string;
  allHighlighted: boolean;
  singleBookmarked: boolean | null;
  onCompare: () => void;
  onHighlight: () => void;
  onBookmark: () => void;
  onNote: () => void;
  /** Only offered for a single verse, since word study works one verse at a time. */
  onWords?: () => void;
  onCopy: () => Promise<void>;
  onClear: () => void;
}

/** Labels collapse to icons on phones, so every button also carries an accessible name. */
export function SelectionBar({
  label,
  allHighlighted,
  singleBookmarked,
  onCompare,
  onHighlight,
  onBookmark,
  onNote,
  onWords,
  onCopy,
  onClear,
}: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const hl = allHighlighted ? 'Remove highlight' : 'Highlight';
  const bm = singleBookmarked ? 'Bookmarked' : 'Bookmark';

  return (
    <div className="selbar" role="toolbar" aria-label={`Actions for ${label}`}>
      <span className="selbar-ref">{label}</span>
      <button onClick={onCompare} aria-label="Compare translations" title="Compare translations">
        <Columns2 size={16} aria-hidden /> <span className="lbl">Compare</span>
      </button>
      <button onClick={onHighlight} aria-pressed={allHighlighted} aria-label={hl} title={hl}>
        <Highlighter size={16} aria-hidden /> <span className="lbl">{hl}</span>
      </button>
      {singleBookmarked !== null && (
        <button onClick={onBookmark} aria-pressed={singleBookmarked} aria-label={bm} title={bm}>
          <Bookmark size={16} aria-hidden fill={singleBookmarked ? 'currentColor' : 'none'} />{' '}
          <span className="lbl">{bm}</span>
        </button>
      )}
      {onWords && (
        <button onClick={onWords} aria-label="Study the original words" title="Study the original words">
          <Languages size={16} aria-hidden /> <span className="lbl">Words</span>
        </button>
      )}
      <button onClick={onNote} aria-label="Write a note on these verses" title="Write a note on these verses">
        <NotebookPen size={16} aria-hidden /> <span className="lbl">Note</span>
      </button>
      <button onClick={copy} aria-label="Copy verses" title="Copy verses">
        {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}{' '}
        <span className="lbl">{copied ? 'Copied' : 'Copy'}</span>
      </button>
      <button className="selbar-close" onClick={onClear} aria-label="Clear selection" title="Clear selection (Esc)">
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
