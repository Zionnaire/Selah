import { CROSSREF_ATTRIBUTION, formatReference } from '@selah/domain';
import { Link2, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/store/app';
import type { XrefItem } from './useXrefs';

interface Props {
  items: XrefItem[] | null;
  status: 'checking' | 'installing' | 'ready' | 'failed';
  /** Extra control per row, for example "Add to study". */
  action?: (item: XrefItem) => ReactNode;
  emptyHint?: string;
}

const clip = (s: string, n = 220) => (s.length > n ? `${s.slice(0, n).trimEnd()}...` : s);

export function XrefList({ items, status, action, emptyHint }: Props) {
  const progress = useApp((s) => s.xrefProgress);

  if (status === 'failed') {
    return (
      <div className="empty">
        <div className="empty-icon"><TriangleAlert size={20} aria-hidden /></div>
        <h3>Cross-references are not on this device yet</h3>
        <p>They download once. Connect to the internet and reopen SELAH, and they will be ready for offline use.</p>
      </div>
    );
  }
  if (status !== 'ready') {
    return (
      <div className="empty" aria-busy="true">
        <h3>Preparing cross-references</h3>
        <p>This happens once, then they work offline.</p>
        <div className="progress" style={{ width: '100%' }}><span style={{ width: `${Math.max(4, progress * 100)}%` }} /></div>
      </div>
    );
  }
  if (items === null) return <div className="skeleton" style={{ height: 120, margin: 16 }} aria-busy="true" />;
  if (items.length === 0) {
    return (
      <div className="empty">
        <div className="empty-icon"><Link2 size={20} aria-hidden /></div>
        <h3>No cross-references</h3>
        <p>{emptyHint ?? 'Nothing well supported links to this passage.'}</p>
      </div>
    );
  }

  return (
    <div className="xrefs">
      <ul>
        {items.map((it) => (
          <li key={formatReference(it.ref)}>
            <div className="xref-head">
              <Link
                className="ref"
                to={`/bible/${it.ref.book}/${it.ref.chapter}?v=${it.ref.verseStart}${it.ref.verseEnd > it.ref.verseStart ? `-${it.ref.verseEnd}` : ''}`}
              >
                {formatReference(it.ref)}
              </Link>
              {action?.(it)}
            </div>
            <p className="xref-text">{clip(it.text)}</p>
          </li>
        ))}
      </ul>
      <p className="muted small xref-attrib">{CROSSREF_ATTRIBUTION}</p>
    </div>
  );
}
