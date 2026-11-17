import { TRANSLATIONS, BOOKS } from '@selah/domain';
import { SearchX } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageBar } from '@/app/PageBar';
import { getDb } from '@/data/client';
import type { SearchHit } from '@/data/types';
import { useApp } from '@/store/app';
import { useReader } from '@/store/reader';

/** The snippet marks matches with [[ ]]. Turn them into real elements without innerHTML. */
function Snippet({ text }: { text: string }) {
  const parts = text.split(/\[\[|\]\]/);
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>{i % 2 === 1 ? <mark>{p}</mark> : p}</Fragment>
      ))}
    </>
  );
}

export function SearchResults() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q')?.trim() ?? '';
  const installed = Object.keys(useApp((s) => s.installed));
  const stored = useReader((s) => s.translation);
  const translation = installed.includes(stored) ? stored : (installed[0] ?? 'kjv');
  const [hits, setHits] = useState<SearchHit[] | null>(null);

  useEffect(() => {
    let live = true;
    setHits(null);
    if (!q) return setHits([]);
    getDb()
      .search(translation, q)
      .then((h) => live && setHits(h))
      .catch(() => live && setHits([]));
    return () => {
      live = false;
    };
  }, [q, translation]);

  const abbr = TRANSLATIONS.find((t) => t.id === translation)?.abbr ?? translation;

  return (
    <>
      <PageBar title="Search" />
      <div className="page search-page">
        <div className="search-head">
          <div>
            <h2 className="page-title">{q ? `Verses containing "${q}"` : 'Search Scripture'}</h2>
            <p className="muted">
              Exact matches in {abbr}, found on this device. Works without internet.
            </p>
          </div>
          {installed.length > 1 && (
            <div className="segmented" role="group" aria-label="Translation">
              {installed.map((id) => (
                <button key={id} aria-pressed={id === translation} onClick={() => { useReader.getState().setTranslation(id); setParams(params); }}>
                  {TRANSLATIONS.find((t) => t.id === id)?.abbr ?? id}
                </button>
              ))}
            </div>
          )}
        </div>

        {hits === null && (
          <div className="card" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="skeleton" style={{ height: 16, margin: '14px 0', width: `${90 - i * 7}%` }} />
            ))}
          </div>
        )}

        {hits && hits.length === 0 && (
          <div className="card">
            <div className="empty">
              <div className="empty-icon"><SearchX size={20} aria-hidden /></div>
              <h3>{q ? `No verses contain "${q}" in ${abbr}` : 'Type a word or phrase'}</h3>
              <p>
                {q
                  ? 'Check the spelling, try a shorter word, or search another translation. You can also type a reference such as Romans 12:2.'
                  : 'You can also type a reference such as Romans 12:2 to open it directly.'}
              </p>
            </div>
          </div>
        )}

        {hits && hits.length > 0 && (
          <ul className="hit-list card">
            {hits.map((h) => {
              const b = BOOKS[h.book - 1]!;
              return (
                <li key={`${h.book}.${h.chapter}.${h.verse}`}>
                  <Link to={`/bible/${b.id}/${h.chapter}?v=${h.verse}`}>
                    <span className="ref">{b.name} {h.chapter}:{h.verse}</span>
                    <span className="hit-text"><Snippet text={h.snippet} /></span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {hits && hits.length >= 60 && (
          <p className="muted small">Showing the first 60 matches. Add a word to narrow the search.</p>
        )}
      </div>
    </>
  );
}
