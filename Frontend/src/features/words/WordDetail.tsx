import {
  BOOKS,
  ORIGINAL_ATTRIBUTION,
  ORIGINAL_TEXT_NOTE,
  describeGrammar,
  displayStrong,
  formatReference,
  languageOf,
  parseVerseId,
  testamentOfLanguage,
} from '@selah/domain';
import { ArrowLeft, NotebookPen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageBar } from '@/app/PageBar';
import { getDb } from '@/data/client';
import type { CountRow, LexiconRow, OccurrenceRow, OriginalWord } from '@/data/types';
import { useApp } from '@/store/app';
import { useReader } from '@/store/reader';
import { notesRepo } from '../library/notesRepo';
import { InstallCard } from './InstallCard';

const PAGE = 25;

export function WordDetail() {
  const { strong = '' } = useParams();
  return <Detail key={strong} strong={strong} />;
}

function Detail({ strong }: { strong: string }) {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const original = useApp((s) => s.original);
  const installed = useApp((s) => s.installed);
  const pref = useReader((s) => s.translation);
  const translation = installed[pref] ? pref : (Object.keys(installed)[0] ?? 'kjv');

  const lang = languageOf(strong);
  const ctx = parseVerseId(search.get('ref') ?? '');
  const ctxPos = Number(search.get('p'));

  const [entry, setEntry] = useState<LexiconRow | null | undefined>(undefined);
  const [inVerse, setInVerse] = useState<OriginalWord | null>(null);
  const [ranges, setRanges] = useState<CountRow[]>([]);
  const [forms, setForms] = useState<CountRow[]>([]);
  const [occ, setOcc] = useState<{ total: number; rows: OccurrenceRow[] }>({ total: 0, rows: [] });
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (original !== 'ready') return;
    let live = true;
    const db = getDb();
    void db.lexiconEntry(strong).then((e) => live && setEntry(e));
    void db.renderings(strong).then((r) => live && setRanges(r));
    void db.forms(strong).then((r) => live && setForms(r));
    void db.occurrences(strong, PAGE, 0).then((o) => live && setOcc(o));
    if (ctx) {
      const book = BOOKS.find((b) => b.id === ctx.book);
      if (book) {
        void db.originalVerse(book.order, ctx.chapter, ctx.verse).then((ws) => {
          if (live) setInVerse(ws.find((w) => w.pos === ctxPos && w.strong === strong) ?? ws.find((w) => w.strong === strong) ?? null);
        });
      }
    }
    return () => {
      live = false;
    };
    // the reference parts come from the URL, which is already covered by key={strong} plus search
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [original, strong, search.toString()]);

  // English verse text for each occurrence listed.
  useEffect(() => {
    let live = true;
    void (async () => {
      const next: Record<string, string> = {};
      for (const r of occ.rows) {
        const key = `${r.book}.${r.chapter}.${r.verse}`;
        if (texts[key] !== undefined || next[key] !== undefined) continue;
        const t = await getDb().verses([translation], r.book, r.chapter, r.verse, r.verse);
        next[key] = t[0]?.text ?? '';
      }
      if (live && Object.keys(next).length) setTexts((p) => ({ ...p, ...next }));
    })();
    return () => {
      live = false;
    };
    // texts is read only to skip work already done
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occ.rows, translation]);

  const more = async () => {
    setLoadingMore(true);
    const next = await getDb().occurrences(strong, PAGE, occ.rows.length);
    setOcc((o) => ({ total: next.total, rows: [...o.rows, ...next.rows] }));
    setLoadingMore(false);
  };

  const ctxRef = ctx ? formatReference({ book: ctx.book, chapter: ctx.chapter, verseStart: ctx.verse, verseEnd: ctx.verse }) : null;

  const writeNote = async () => {
    const title = `Word study: ${entry?.translit ?? strong} (${displayStrong(strong)})`;
    const id = await notesRepo.create({
      title,
      body: '',
      links: ctx ? [{ type: 'passage', ref: { book: ctx.book, chapter: ctx.chapter, verseStart: ctx.verse, verseEnd: ctx.verse } }] : [],
    });
    navigate(`/library/notes/${id}`);
  };

  const maxCount = Math.max(1, ...ranges.map((r) => r.n));
  const back = ctx ? `/words/${ctx.book}/${ctx.chapter}/${ctx.verse}` : '/study';

  return (
    <>
      <PageBar title="Word study" />
      <div className="page word-detail">
        <Link to={back} className="back-link">
          <ArrowLeft size={15} aria-hidden /> {ctxRef ? `Words of ${ctxRef}` : 'Study'}
        </Link>

        {original !== 'ready' ? (
          original === 'unknown' ? <div className="skeleton" style={{ height: 160 }} aria-busy="true" /> : <InstallCard />
        ) : entry === undefined ? (
          <div className="skeleton" style={{ height: 240 }} aria-busy="true" />
        ) : entry === null ? (
          <div className="card">
            <div className="empty">
              <h3>No dictionary entry for {displayStrong(strong)}</h3>
              <p>A few words in the text have no entry in the lexicon. The occurrences are still listed below.</p>
            </div>
          </div>
        ) : (
          <div className="word-layout">
            <div className="word-main">
              <article className="card word-sheet">
                {ctxRef && <p className="ref">{ctxRef}{inVerse?.gloss ? `, "${inVerse.gloss}"` : ''}</p>}
                <div className="word-title">
                  <span className={`orig orig-${lang} orig-xl`} dir={lang === 'hebrew' ? 'rtl' : 'ltr'} lang={lang === 'hebrew' ? 'he' : 'grc'}>{entry.lemma}</span>
                  <span className="translit-xl">{entry.translit.replace(/\./g, '')}</span>
                  <span className="chip">{lang === 'hebrew' ? 'Hebrew' : 'Greek'}</span>
                </div>

                <dl className="facts">
                  {inVerse && (
                    <div>
                      <dt>Form in this verse</dt>
                      <dd>
                        <span className={`orig orig-${lang}`} dir={lang === 'hebrew' ? 'rtl' : 'ltr'} lang={lang === 'hebrew' ? 'he' : 'grc'}>{inVerse.word}</span>: {describeGrammar(inVerse.grammar, lang)}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt>Strong's number</dt>
                    <dd>{displayStrong(strong)}</dd>
                  </div>
                  {entry.gloss && (
                    <div>
                      <dt>Gloss</dt>
                      <dd>{entry.gloss}</dd>
                    </div>
                  )}
                  {entry.def && (
                    <div>
                      <dt>Definition</dt>
                      <dd>
                        {entry.def}
                        {entry.usage && <span className="muted"> Rendered in the King James Version as: {entry.usage}.</span>}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt>Occurrences</dt>
                    <dd>{occ.total.toLocaleString()} in the {testamentOfLanguage(lang)}</dd>
                  </div>
                </dl>
                {entry.def && <p className="muted small">Definition from Strong's Concordance (1890), through the OpenScriptures Hebrew Lexicon.</p>}
              </article>

              {ranges.length > 0 && (
                <section className="card">
                  <h3 className="card-title">How translators render it</h3>
                  <p className="muted small">What this word is translated as across all {occ.total.toLocaleString()} occurrences. Not every meaning fits every verse.</p>
                  <ul className="range-list">
                    {ranges.map((r) => (
                      <li key={r.label}>
                        <span>{r.label}</span>
                        <span className="range-bar" aria-hidden><i style={{ width: `${(r.n / maxCount) * 100}%` }} /></span>
                        <span className="muted small">{r.n.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="card">
                <h3 className="card-title">Every occurrence</h3>
                {occ.rows.length === 0 ? (
                  <div className="skeleton" style={{ height: 60 }} aria-busy="true" />
                ) : (
                  <ul className="occ-list">
                    {occ.rows.map((r) => {
                      const b = BOOKS[r.book - 1]!;
                      const key = `${r.book}.${r.chapter}.${r.verse}`;
                      return (
                        <li key={`${key}.${r.pos}`}>
                          <Link className="ref" to={`/words/${b.id}/${r.chapter}/${r.verse}`}>
                            {b.name} {r.chapter}:{r.verse}
                          </Link>
                          <span className="occ-word">
                            <span className={`orig orig-${lang}`} dir={lang === 'hebrew' ? 'rtl' : 'ltr'} lang={lang === 'hebrew' ? 'he' : 'grc'}>{r.word}</span>
                            {r.gloss && <span className="muted"> {r.gloss}</span>}
                          </span>
                          <p className="occ-text">{texts[key] ?? ''}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {occ.rows.length < occ.total && (
                  <button className="btn btn-sm" onClick={() => void more()} disabled={loadingMore}>
                    {loadingMore ? 'Loading' : `Show ${Math.min(PAGE, occ.total - occ.rows.length)} more of ${(occ.total - occ.rows.length).toLocaleString()}`}
                  </button>
                )}
              </section>
            </div>

            <aside className="word-side">
              <section className="card">
                <h3 className="card-title">Forms found</h3>
                <ul className="forms">
                  {forms.map((f) => (
                    <li key={f.label}>
                      <span className={`orig orig-${lang}`} dir={lang === 'hebrew' ? 'rtl' : 'ltr'} lang={lang === 'hebrew' ? 'he' : 'grc'}>{f.label}</span>
                      <span className="muted small">{f.n.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="card caution">
                <h3>A caution to keep in mind</h3>
                <p>A word's whole range of meaning does not apply in every verse. Read the definition through the sentence the word sits in.</p>
              </section>

              <button className="btn" onClick={() => void writeNote()}>
                <NotebookPen size={16} aria-hidden /> Write a note on this word
              </button>
            </aside>
          </div>
        )}
        <p className="muted small attribution-line">{ORIGINAL_TEXT_NOTE}</p>
        <p className="muted small attribution-line">{ORIGINAL_ATTRIBUTION}</p>
      </div>
    </>
  );
}
