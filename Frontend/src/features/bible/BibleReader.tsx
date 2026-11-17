import { BOOKS, TRANSLATIONS, formatReference, formatVerseRanges, getBook } from '@selah/domain';
import {
  AArrowDown,
  AArrowUp,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns2,
  PanelRight,
  WrapText,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageBar } from '@/app/PageBar';
import { useMedia } from '@/lib/useMedia';
import { notesRepo } from '../library/notesRepo';
import { useApp } from '@/store/app';
import { useReader } from '@/store/reader';
import { BookList } from './BookList';
import { SelectionBar } from './SelectionBar';
import { SidePanel, type PanelTab } from './SidePanel';
import { useChapterText, useMarks } from './useChapter';

const abbrOf = (id: string) => TRANSLATIONS.find((t) => t.id === id);

function neighbour(bookId: string, chapter: number, dir: 1 | -1) {
  const book = getBook(bookId)!;
  const next = chapter + dir;
  if (next >= 1 && next <= book.chapters) return { book: book.id, chapter: next, label: `${book.name} ${next}` };
  const other = BOOKS[book.order - 1 + dir];
  if (!other) return null;
  const c = dir === 1 ? 1 : other.chapters;
  return { book: other.id, chapter: c, label: `${other.name} ${c}` };
}

function parseVerseParam(v: string | null): number[] {
  const m = /^(\d+)(?:-(\d+))?$/.exec(v ?? '');
  if (!m) return [];
  const a = Number(m[1]);
  const b = m[2] ? Number(m[2]) : a;
  return b >= a && b - a < 200 ? Array.from({ length: b - a + 1 }, (_, i) => a + i) : [];
}

function Picker({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="select">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
      <ChevronDown size={15} aria-hidden />
    </label>
  );
}

export function BibleReader() {
  const params = useParams();
  const bookId = (params.book ?? '').toUpperCase();
  const book = getBook(bookId);
  const chapter = Number(params.chapter);
  const valid = !!book && Number.isInteger(chapter) && chapter >= 1 && chapter <= book.chapters;
  if (!valid) return <Navigate to="/bible/JHN/1" replace />;
  return <Reader key={`${bookId}.${chapter}`} bookId={bookId} chapter={chapter} />;
}

function Reader({ bookId, chapter }: { bookId: string; chapter: number }) {
  const book = getBook(bookId)!;
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const installed = useApp((s) => s.installed);
  const installedIds = Object.keys(installed);
  const r = useReader();

  const translation = installed[r.translation] ? r.translation : (installedIds[0] ?? 'kjv');
  const second = installed[r.parallelWith] && r.parallelWith !== translation
    ? r.parallelWith
    : (installedIds.find((id) => id !== translation) ?? translation);
  const wide = useMedia('(min-width: 721px)');
  const canParallel = installedIds.length > 1 && wide;
  const parallel = r.parallel && canParallel;

  const main = useChapterText(translation, book.order, chapter);
  const other = useChapterText(second, book.order, parallel ? chapter : 0);
  const { highlights, bookmarks, setHighlighted, setBookmarked } = useMarks(bookId, chapter);

  const [selected, setSelected] = useState<number[]>(() => parseVerseParam(search.get('v')));
  const [panelOpen, setPanelOpen] = useState(() => window.matchMedia('(min-width: 1280px)').matches);
  const [tab, setTab] = useState<PanelTab>('xrefs');

  const prev = useMemo(() => neighbour(bookId, chapter, -1), [bookId, chapter]);
  const next = useMemo(() => neighbour(bookId, chapter, 1), [bookId, chapter]);
  const sorted = useMemo(() => [...selected].sort((a, b) => a - b), [selected]);

  // Remember where the reader stopped so Overview can offer to resume.
  useEffect(() => {
    r.setLast({ book: bookId, chapter, verse: sorted[0] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, chapter, sorted[0]]);

  // Bring a linked passage into view once the text has loaded.
  useEffect(() => {
    if (!main.loading && sorted[0]) {
      document.getElementById(`v-${sorted[0]}`)?.scrollIntoView({ block: 'center' });
    }
    // only on first load of this chapter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [main.loading]);

  const toggle = useCallback((v: number) => {
    setSelected((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'Escape') setSelected([]);
      if (e.key === 'ArrowLeft' && prev) navigate(`/bible/${prev.book}/${prev.chapter}`);
      if (e.key === 'ArrowRight' && next) navigate(`/bible/${next.book}/${next.chapter}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next, navigate]);

  const label = `${book.name} ${chapter}:${formatVerseRanges(sorted)}`;
  const allHighlighted = sorted.length > 0 && sorted.every((v) => highlights.has(v));
  const single = sorted.length === 1 ? sorted[0]! : null;

  const copy = async () => {
    const body = sorted
      .map((v) => main.verses.find((x) => x.verse === v)?.text ?? '')
      .filter(Boolean)
      .join(' ');
    await navigator.clipboard.writeText(`${body}\n${label} (${abbrOf(translation)?.abbr ?? translation})`);
  };

  const fontSize = `${1.1875 + r.textStep * 0.125}rem`;
  const info = abbrOf(translation);

  const renderVerse = (v: { verse: number; text: string }) => {
    const sel = selected.includes(v.verse);
    const cls = ['verse', highlights.has(v.verse) && 'is-highlight', sel && 'is-selected'].filter(Boolean).join(' ');
    return (
      <span
        key={v.verse}
        id={`v-${v.verse}`}
        className={cls}
        role="button"
        tabIndex={0}
        aria-pressed={sel}
        onClick={() => toggle(v.verse)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle(v.verse);
          }
        }}
      >
        <sup className="vnum">
          {bookmarks.has(v.verse) && <Bookmark size={9} fill="currentColor" aria-label="Bookmarked" />}
          {v.verse}
        </sup>
        {v.text}{' '}
      </span>
    );
  };

  return (
    <div className={`reader${panelOpen ? ' has-panel' : ''}`}>
      <PageBar>
        <Picker label="Book" value={bookId} onChange={(id) => navigate(`/bible/${id}/1`)}>
          <optgroup label="Old Testament">
            {BOOKS.filter((b) => b.testament === 'OT').map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </optgroup>
          <optgroup label="New Testament">
            {BOOKS.filter((b) => b.testament === 'NT').map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </optgroup>
        </Picker>
        <Picker label="Chapter" value={String(chapter)} onChange={(c) => navigate(`/bible/${bookId}/${c}`)}>
          {Array.from({ length: book.chapters }, (_, i) => i + 1).map((c) => (
            <option key={c} value={c}>{wide ? `Chapter ${c}` : c}</option>
          ))}
        </Picker>
        <Picker label="Translation" value={translation} onChange={r.setTranslation}>
          {installedIds.map((id) => (
            <option key={id} value={id}>{abbrOf(id)?.abbr ?? id}</option>
          ))}
        </Picker>
        <button
          className="btn hide-sm"
          aria-pressed={parallel}
          disabled={!canParallel}
          title={canParallel ? 'Read two translations side by side' : 'Download another translation in Settings to use this'}
          onClick={() => r.setParallel(!r.parallel)}
        >
          <Columns2 size={16} aria-hidden /> Parallel
        </button>
        {parallel && (
          <Picker label="Second translation" value={second} onChange={r.setParallelWith}>
            {installedIds.filter((id) => id !== translation).map((id) => (
              <option key={id} value={id}>{abbrOf(id)?.abbr ?? id}</option>
            ))}
          </Picker>
        )}
        <span className="reader-tools hide-sm">
          <button className="icon-btn" aria-label="Smaller text" disabled={r.textStep <= -2} onClick={() => r.bumpText(-1)}>
            <AArrowDown size={18} aria-hidden />
          </button>
          <button className="icon-btn" aria-label="Larger text" disabled={r.textStep >= 4} onClick={() => r.bumpText(1)}>
            <AArrowUp size={18} aria-hidden />
          </button>
          <button className="icon-btn" aria-label="One verse per line" aria-pressed={r.lines} onClick={() => r.setLines(!r.lines)}>
            <WrapText size={18} aria-hidden />
          </button>
        </span>
        <button
          className="icon-btn"
          aria-label={panelOpen ? 'Hide reader tools' : 'Show reader tools'}
          aria-pressed={panelOpen}
          onClick={() => setPanelOpen((o) => !o)}
        >
          <PanelRight size={18} aria-hidden />
        </button>
      </PageBar>

      <div className="reader-body">
        <BookList current={bookId} chapter={chapter} />

        <article className="reader-col" style={{ ['--scripture-size' as string]: fontSize }}>
          <div className="chapter-nav">
            {prev ? (
              <Link to={`/bible/${prev.book}/${prev.chapter}`} aria-label={`Previous: ${prev.label}`}>
                <ChevronLeft size={16} aria-hidden /> {prev.label}
              </Link>
            ) : <span />}
            {next ? (
              <Link to={`/bible/${next.book}/${next.chapter}`} aria-label={`Next: ${next.label}`}>
                {next.label} <ChevronRight size={16} aria-hidden />
              </Link>
            ) : <span />}
          </div>

          <h1 className="chapter-title">{book.name} {chapter}</h1>

          {main.loading ? (
            <div className="verses-skeleton" aria-busy="true" aria-label="Loading chapter">
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} className="skeleton" style={{ height: 18, width: `${96 - (i % 3) * 9}%` }} />
              ))}
            </div>
          ) : main.verses.length === 0 ? (
            <div className="empty">
              <h3>{info?.abbr ?? translation} has no text for this chapter</h3>
              <p>Some translations leave out passages that older manuscripts do not contain. Try another translation.</p>
            </div>
          ) : parallel ? (
            <div className="parallel">
              {main.verses.map((v) => (
                <div key={v.verse} className="parallel-row">
                  <div className="verses">{renderVerse(v)}</div>
                  <div className="verses">
                    {other.verses.find((o) => o.verse === v.verse) ? (
                      <span className="verse is-plain">
                        <sup className="vnum">{v.verse}</sup>
                        {other.verses.find((o) => o.verse === v.verse)!.text}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`verses${r.lines ? ' is-lines' : ''}`}>{main.verses.map(renderVerse)}</div>
          )}

          <footer className="attribution">{info?.attribution}</footer>
        </article>

        {panelOpen && (
          <SidePanel
            tab={tab}
            onTab={setTab}
            onClose={() => setPanelOpen(false)}
            bookNo={book.order}
            bookName={book.name}
            chapter={chapter}
            translation={translation}
            selected={sorted}
            verses={main.verses}
            highlights={highlights}
            bookmarks={bookmarks}
            onJump={(v) => {
              setSelected([v]);
              document.getElementById(`v-${v}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }}
            onUnhighlight={(v) => setHighlighted([v], false)}
            onUnbookmark={(v) => setBookmarked(v, false)}
          />
        )}
      </div>

      {sorted.length > 0 && (
        <SelectionBar
          label={label}
          allHighlighted={allHighlighted}
          singleBookmarked={single === null ? null : bookmarks.has(single)}
          onCompare={() => {
            setTab('translations');
            setPanelOpen(true);
          }}
          onHighlight={() => setHighlighted(sorted, !allHighlighted)}
          onBookmark={() => single !== null && setBookmarked(single, !bookmarks.has(single))}
          onWords={single !== null ? () => navigate(`/words/${bookId}/${chapter}/${single}`) : undefined}
          onNote={async () => {
            const ref = { book: bookId, chapter, verseStart: sorted[0]!, verseEnd: sorted[sorted.length - 1]! };
            const noteId = await notesRepo.create({
              title: formatReference(ref),
              body: '',
              links: [{ type: 'passage', ref }],
            });
            navigate(`/library/notes/${noteId}`);
          }}
          onCopy={copy}
          onClear={() => setSelected([])}
        />
      )}
    </div>
  );
}
