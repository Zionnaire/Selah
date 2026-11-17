import { TRANSLATIONS, formatVerseRanges } from '@selah/domain';
import { Bookmark, Columns2, Highlighter, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getDb } from '@/data/client';
import type { VerseRow } from '@/data/types';
import { useApp } from '@/store/app';
import { useXrefs } from '../study/useXrefs';
import { XrefList } from '../study/XrefList';

export type PanelTab = 'xrefs' | 'translations' | 'saved';

interface Props {
  tab: PanelTab;
  onTab: (t: PanelTab) => void;
  onClose: () => void;
  bookNo: number;
  bookName: string;
  chapter: number;
  translation: string;
  selected: number[];
  verses: VerseRow[];
  highlights: Set<number>;
  bookmarks: Set<number>;
  onJump: (verse: number) => void;
  onUnhighlight: (verse: number) => void;
  onUnbookmark: (verse: number) => void;
}

const abbr = (id: string) => TRANSLATIONS.find((t) => t.id === id)?.abbr ?? id.toUpperCase();
const MAX_COMPARE = 10;

function Compare({ bookNo, chapter, selected }: Pick<Props, 'bookNo' | 'chapter' | 'selected'>) {
  const installed = Object.keys(useApp((s) => s.installed));
  const [rows, setRows] = useState<Record<number, Record<string, string>>>({});
  const shown = selected.slice(0, MAX_COMPARE);
  const from = shown[0];
  const to = shown[shown.length - 1];

  useEffect(() => {
    if (from === undefined || to === undefined) return setRows({});
    let live = true;
    getDb()
      .verses(installed, bookNo, chapter, from, to)
      .then((all) => {
        if (!live) return;
        const next: Record<number, Record<string, string>> = {};
        for (const r of all) (next[r.verse] ??= {})[r.translation] = r.text;
        setRows(next);
      });
    return () => {
      live = false;
    };
    // installed is a stable list of ids for the session; joining avoids a new array each render
  }, [bookNo, chapter, from, to, installed.join(',')]);

  if (!shown.length) {
    return (
      <div className="empty">
        <div className="empty-icon">
          <Columns2 size={20} aria-hidden />
        </div>
        <h3>Compare translations</h3>
        <p>Select one or more verses to read them in every translation on this device.</p>
      </div>
    );
  }

  return (
    <div className="panel-body">
      {shown.map((v) => (
        <section key={v} className="compare-verse">
          <h3 className="ref">Verse {v}</h3>
          {installed.map((t) => (
            <p key={t} className="compare-line">
              <span className="tr-badge">{abbr(t)}</span> {rows[v]?.[t] ?? ''}
            </p>
          ))}
        </section>
      ))}
      {selected.length > MAX_COMPARE && (
        <p className="muted small">Showing the first {MAX_COMPARE} of {selected.length} selected verses.</p>
      )}
    </div>
  );
}

function Xrefs({ bookNo, chapter, selected, translation }: Pick<Props, 'bookNo' | 'chapter' | 'selected' | 'translation'>) {
  // With nothing selected, offer the first verse of the chapter so the tab is never blank.
  const verses = selected.length ? selected.slice(0, 6) : [1];
  const { items, status } = useXrefs(bookNo, chapter, verses, translation);
  return (
    <XrefList
      items={items}
      status={status}
      emptyHint="Select a verse to see passages that other readers have linked to it."
    />
  );
}

function Saved(p: Props) {
  const text = (v: number) => p.verses.find((x) => x.verse === v)?.text ?? '';
  const items = [
    ...[...p.highlights].map((v) => ({ v, kind: 'highlight' as const })),
    ...[...p.bookmarks].map((v) => ({ v, kind: 'bookmark' as const })),
  ].sort((a, b) => a.v - b.v);

  if (!items.length) {
    return (
      <div className="empty">
        <div className="empty-icon">
          <Highlighter size={20} aria-hidden />
        </div>
        <h3>Nothing saved in this chapter</h3>
        <p>Highlights and bookmarks you make here appear in this list, and stay on this device.</p>
      </div>
    );
  }

  return (
    <ul className="saved-list">
      {items.map(({ v, kind }) => (
        <li key={`${kind}${v}`}>
          <button className="saved-main" onClick={() => p.onJump(v)}>
            <span className="ref">
              {kind === 'bookmark' ? <Bookmark size={12} fill="currentColor" aria-hidden /> : <Highlighter size={12} aria-hidden />}{' '}
              {p.bookName} {p.chapter}:{v}
            </span>
            <span className="saved-text">{text(v)}</span>
          </button>
          <button
            className="icon-btn"
            aria-label={`Remove ${kind} on verse ${v}`}
            onClick={() => (kind === 'highlight' ? p.onUnhighlight(v) : p.onUnbookmark(v))}
          >
            <X size={15} aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function SidePanel(p: Props) {
  const heading = p.selected.length
    ? `${p.bookName} ${p.chapter}:${formatVerseRanges(p.selected)}`
    : `${p.bookName} ${p.chapter}`;
  return (
    <aside className="sidepanel" aria-label="Reader tools">
      <header className="sidepanel-head">
        <div>
          <h2>{heading}</h2>
          <p className="muted small">
            {p.selected.length ? `${p.selected.length} verse${p.selected.length === 1 ? '' : 's'} selected` : 'No verses selected'}
          </p>
        </div>
        <button className="icon-btn sidepanel-close" aria-label="Close panel" onClick={p.onClose}>
          <X size={18} aria-hidden />
        </button>
      </header>
      <div className="tabs" role="tablist">
        {(['xrefs', 'translations', 'saved'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={p.tab === t} onClick={() => p.onTab(t)}>
            {t === 'xrefs' ? 'Cross-references' : t === 'translations' ? 'Translations' : 'Saved here'}
          </button>
        ))}
      </div>
      {p.tab === 'xrefs' ? (
        <Xrefs bookNo={p.bookNo} chapter={p.chapter} selected={p.selected} translation={p.translation} />
      ) : p.tab === 'translations' ? (
        <Compare bookNo={p.bookNo} chapter={p.chapter} selected={p.selected} />
      ) : (
        <Saved {...p} />
      )}
    </aside>
  );
}
