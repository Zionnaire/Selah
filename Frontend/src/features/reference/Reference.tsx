import { parseDictionaryText } from '@selah/domain';
import { ArrowLeft, BookText, Download, Search, TriangleAlert } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageBar } from '@/app/PageBar';
import { getDb } from '@/data/client';
import type { DictEntry, DictHit } from '@/data/types';
import { useApp } from '@/store/app';

export const DICTIONARY_SIZE_MB = 3;
export const DICTIONARY_CREDIT = "Smith's Bible Dictionary, William Smith, 1884. Public domain, from the Christian Classics Ethereal Library (ccel.org).";

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** Honest framing, shown on every dictionary screen. This is old scholarship, labelled as such. */
function Caution() {
  return (
    <aside className="card caution ref-caution">
      <h3>Historic reference, from 1884</h3>
      <p>
        This is a window into how earlier scholars read the Bible. Scholarship has moved on in places, especially dates, authorship and archaeology.
        Treat what you read here as a starting point and check a current source for those.
      </p>
    </aside>
  );
}

function InstallPrompt() {
  const { dictionary, dictProgress, dictError, installDictionary } = useApp();
  const busy = dictionary === 'installing';
  return (
    <div className="card install-card">
      <div className="empty">
        <div className="empty-icon"><BookText size={20} aria-hidden /></div>
        <h3>The Bible dictionary is not on this device yet</h3>
        <p>About {DICTIONARY_SIZE_MB} MB, downloaded once. It covers people, places and things in the Bible, and then works without internet.</p>
        {busy && (
          <div className="progress" style={{ width: '100%', maxWidth: 360 }} role="progressbar" aria-valuenow={Math.round(dictProgress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${Math.max(3, dictProgress * 100)}%` }} />
          </div>
        )}
        {dictionary === 'failed' && <p className="field-error"><TriangleAlert size={14} aria-hidden /> {dictError}</p>}
        <div className="actions">
          <button className="btn btn-primary" onClick={() => void installDictionary()} disabled={busy}>
            <Download size={16} aria-hidden /> {busy ? `Downloading ${Math.round(dictProgress * 100)}%` : dictionary === 'failed' ? 'Try again' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Renders entry text with clickable cross references and verse links. */
function EntryText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n\n').map((para, i) => (
        <p key={i} className="entry-para">
          {parseDictionaryText(para).map((s, j) => (
            <Fragment key={j}>
              {s.kind === 'text' && s.text}
              {s.kind === 'entry' && <Link className="entry-link" to={`/reference?term=${encodeURIComponent(s.term)}`}>{s.term}</Link>}
              {s.kind === 'ref' && (
                <Link className="ref" to={`/bible/${s.ref.book}/${s.ref.chapter}?v=${s.ref.verseStart}${s.ref.verseEnd > s.ref.verseStart ? `-${s.ref.verseEnd}` : ''}`}>{s.text}</Link>
              )}
            </Fragment>
          ))}
        </p>
      ))}
    </>
  );
}

export function Reference() {
  const { id } = useParams();
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();
  const ready = useApp((s) => s.dictionary);

  const [query, setQuery] = useState(search.get('q') ?? '');
  const [letter, setLetter] = useState<string | null>(null);
  const [hits, setHits] = useState<DictHit[] | null>(null);
  const [entry, setEntry] = useState<DictEntry | null | undefined>(undefined);

  // /reference?term=Alpha jumps straight to that entry when there is one.
  const term = search.get('term');
  useEffect(() => {
    if (ready !== 'ready' || !term) return;
    let live = true;
    void getDb().dictFind(term).then((e) => {
      if (!live) return;
      if (e) navigate(`/reference/${e.id}`, { replace: true });
      else setQuery(term);
    });
    return () => {
      live = false;
    };
  }, [ready, term, navigate]);

  useEffect(() => {
    if (ready !== 'ready' || !id) return setEntry(undefined);
    let live = true;
    setEntry(undefined);
    void getDb().dictEntry(Number(id)).then((e) => live && setEntry(e));
    return () => {
      live = false;
    };
  }, [ready, id]);

  useEffect(() => {
    if (ready !== 'ready' || id) return;
    let live = true;
    const q = query.trim();
    const t = setTimeout(() => {
      const job = q ? getDb().dictSearch(q) : letter ? getDb().dictBrowse(letter, 200) : Promise.resolve([] as DictHit[]);
      void job.then((h) => live && setHits(h));
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [ready, id, query, letter]);

  return (
    <>
      <PageBar title="Bible dictionary" />
      <div className="page reference-page">
        {id ? (
          <Link to="/reference" className="back-link"><ArrowLeft size={15} aria-hidden /> Bible dictionary</Link>
        ) : (
          <>
            <h2 className="page-title">Bible dictionary</h2>
            <p className="muted lead">People, places and things in the Bible. Historic reference, not current scholarship.</p>
          </>
        )}

        {ready === 'unknown' ? (
          <div className="skeleton" style={{ height: 140 }} aria-busy="true" />
        ) : ready !== 'ready' ? (
          <InstallPrompt />
        ) : id ? (
          entry === undefined ? (
            <div className="skeleton" style={{ height: 240 }} aria-busy="true" />
          ) : entry === null ? (
            <div className="card"><div className="empty"><h3>That entry was not found</h3></div></div>
          ) : (
            <article className="card entry">
              <h2 className="entry-title">{entry.headword}</h2>
              <EntryText text={entry.body} />
            </article>
          )
        ) : (
          <>
            <label className="searchbox ref-search">
              <Search size={16} aria-hidden />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setLetter(null); if (search.get('term')) setSearch({}, { replace: true }); }}
                placeholder="Search a name, place or word"
                aria-label="Search the dictionary"
              />
            </label>
            <div className="alpha" role="group" aria-label="Browse by letter">
              {LETTERS.map((l) => (
                <button key={l} aria-pressed={letter === l} onClick={() => { setLetter(l === letter ? null : l); setQuery(''); }}>{l}</button>
              ))}
            </div>

            {!query.trim() && !letter && (
              <div className="card"><div className="empty">
                <h3>Search or choose a letter</h3>
                <p>Try Aaron, Antioch or tabernacle. Words inside entries are searchable too.</p>
              </div></div>
            )}
            {hits && (query.trim() || letter) && hits.length === 0 && (
              <div className="card"><div className="empty"><h3>No entries found</h3><p>Try a shorter word or another spelling.</p></div></div>
            )}
            {hits && hits.length > 0 && (query.trim() || letter) && (
              <ul className="dict-hits card">
                {hits.map((h) => (
                  <li key={h.id}>
                    <Link to={`/reference/${h.id}`}>
                      <strong>{h.headword}</strong>
                      {h.snippet && (
                        <span className="muted small">
                          {h.snippet.split(/\[\[|\]\]/).map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : <Fragment key={i}>{p}</Fragment>))}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <Caution />
        <p className="muted small attribution-line">{DICTIONARY_CREDIT}</p>
      </div>
    </>
  );
}
