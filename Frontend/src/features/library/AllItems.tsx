import { Bookmark, FileText, PenLine, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { getDb } from '@/data/client';
import { relativeTime } from '@/lib/format';
import { sermonRepo } from '../sermons/repo';
import { studyRepo } from '../study/repo';
import { notesRepo } from './notesRepo';
import { useLibrary, type ItemKind, type LibraryItem } from './useLibrary';

const ICON = { sermon: PenLine, note: FileText, study: Search, bookmark: Bookmark } as const;
const TITLE: Record<ItemKind | 'all', string> = {
  all: 'All items',
  sermon: 'Sermons',
  note: 'Notes',
  study: 'Studies',
  bookmark: 'Bookmarks',
};

type Sort = 'recent' | 'title';

export function AllItems({ only }: { only?: ItemKind }) {
  const { data, reload } = useLibrary();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (data?.items ?? []).filter(
      (i) => (!only || i.kind === only) && (!q || `${i.title} ${i.subtitle}`.toLowerCase().includes(q)),
    );
    return list.sort((a, b) => (sort === 'title' ? a.title.localeCompare(b.title) : b.updatedAt - a.updatedAt));
  }, [data, only, query, sort]);

  const keyOf = (i: LibraryItem) => `${i.kind}:${i.id}`;
  const toggle = (i: LibraryItem) =>
    setPicked((p) => {
      const n = new Set(p);
      if (!n.delete(keyOf(i))) n.add(keyOf(i));
      return n;
    });

  const chosen = shown.filter((i) => picked.has(keyOf(i)));
  const recoverable = chosen.filter((i) => i.kind !== 'bookmark').length;

  const remove = async () => {
    await Promise.all(
      chosen.map((i) =>
        i.kind === 'sermon'
          ? sermonRepo.remove(i.id)
          : i.kind === 'note'
            ? notesRepo.remove(i.id)
            : i.kind === 'study'
              ? studyRepo.remove(i.id)
              : getDb().toggleBookmark(i.verseId!, false),
      ),
    );
    setPicked(new Set());
    setConfirming(false);
    await reload();
  };

  return (
    <section className="lib-section">
      <div className="lib-head">
        <h2 className="page-title">{TITLE[only ?? 'all']}</h2>
        <div className="lib-controls">
          <label className="searchbox">
            <Search size={16} aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by title" aria-label="Filter by title" />
          </label>
          <div className="segmented" role="group" aria-label="Sort">
            <button aria-pressed={sort === 'recent'} onClick={() => setSort('recent')}>Last edited</button>
            <button aria-pressed={sort === 'title'} onClick={() => setSort('title')}>Title</button>
          </div>
        </div>
      </div>

      {chosen.length > 0 && (
        <div className="bulkbar" role="toolbar" aria-label="Selected items">
          <strong>{chosen.length} selected</strong>
          <span className="spacer" />
          <button className="btn btn-on-navy btn-sm" onClick={() => setPicked(new Set())}>Clear</button>
          <button className="btn btn-on-navy btn-sm" onClick={() => setConfirming(true)}>
            <Trash2 size={14} aria-hidden /> Delete
          </button>
        </div>
      )}

      {data === null ? (
        <div className="skeleton" style={{ height: 180 }} aria-busy="true" />
      ) : shown.length === 0 ? (
        <div className="card">
          <div className="empty">
            <h3>{query ? 'Nothing matches' : `No ${only ? TITLE[only].toLowerCase() : 'items'} yet`}</h3>
            <p>
              {query
                ? 'Try a different word.'
                : only === 'bookmark'
                  ? 'Select a verse in the Bible and choose Bookmark. It appears here.'
                  : only === 'note'
                    ? 'Open Notes to write your first one.'
                    : 'Sermons, notes and bookmarks you make appear here.'}
            </p>
          </div>
        </div>
      ) : (
        <ul className="lib-list">
          {shown.map((i) => {
            const Icon = ICON[i.kind];
            return (
              <li key={keyOf(i)} className={picked.has(keyOf(i)) ? 'is-picked' : undefined}>
                <input type="checkbox" checked={picked.has(keyOf(i))} onChange={() => toggle(i)} aria-label={`Select ${i.title}`} />
                <Icon size={17} aria-hidden className="lib-icon" />
                <Link to={i.href} className="lib-title">
                  <strong>{i.title}</strong>
                  <small className="muted">{i.subtitle}</small>
                </Link>
                <span className="muted small">{relativeTime(i.updatedAt)}</span>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={confirming}
        title={`Delete ${chosen.length} item${chosen.length === 1 ? '' : 's'}?`}
        body={
          recoverable
            ? 'Sermons, studies and notes stay in Recently deleted for 30 days, so you can restore them. Bookmarks are removed.'
            : 'Bookmarks are removed. You can add them again from the Bible.'
        }
        confirmLabel="Delete"
        onCancel={() => setConfirming(false)}
        onConfirm={() => void remove()}
      />
    </section>
  );
}
