import {
  ORIGINAL_ATTRIBUTION,
  ORIGINAL_TEXT_NOTE,
  describeGrammar,
  displayStrong,
  getBook,
  languageOf,
  partOfSpeech,
} from '@selah/domain';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { PageBar } from '@/app/PageBar';
import { getDb } from '@/data/client';
import type { OriginalWord } from '@/data/types';
import { useApp } from '@/store/app';
import { useReader } from '@/store/reader';
import { InstallCard } from './InstallCard';

export function WordsVerse() {
  const p = useParams();
  const book = getBook((p.book ?? '').toUpperCase());
  const chapter = Number(p.chapter);
  const verse = Number(p.verse);
  const valid = !!book && Number.isInteger(chapter) && chapter >= 1 && Number.isInteger(verse) && verse >= 1;
  if (!valid) return <Navigate to="/bible" replace />;
  return <Verse key={`${book.id}.${chapter}.${verse}`} bookId={book.id} bookNo={book.order} bookName={book.name} chapter={chapter} verse={verse} />;
}

function Verse({ bookId, bookNo, bookName, chapter, verse }: { bookId: string; bookNo: number; bookName: string; chapter: number; verse: number }) {
  const original = useApp((s) => s.original);
  const installed = useApp((s) => s.installed);
  const pref = useReader((s) => s.translation);
  const translation = installed[pref] ? pref : (Object.keys(installed)[0] ?? 'kjv');

  const [words, setWords] = useState<OriginalWord[] | null>(null);
  const [english, setEnglish] = useState('');

  useEffect(() => {
    if (original !== 'ready') return;
    let live = true;
    void getDb().originalVerse(bookNo, chapter, verse).then((w) => live && setWords(w));
    void getDb().verses([translation], bookNo, chapter, verse, verse).then((r) => live && setEnglish(r[0]?.text ?? ''));
    return () => {
      live = false;
    };
  }, [original, bookNo, chapter, verse, translation]);

  const lang = bookNo <= 39 ? 'hebrew' : 'greek';
  const ref = `${bookName} ${chapter}:${verse}`;

  return (
    <>
      <PageBar title="Word study" />
      <div className="page words-page">
        <Link to={`/bible/${bookId}/${chapter}?v=${verse}`} className="back-link">
          <ArrowLeft size={15} aria-hidden /> Back to the reader
        </Link>
        <div className="words-head">
          <div>
            <h2 className="page-title">{ref}</h2>
            <p className="muted">
              The {lang === 'hebrew' ? 'Hebrew' : 'Greek'} words, in the order they are written{lang === 'hebrew' ? ' (right to left)' : ''}. Choose one to study it.
            </p>
          </div>
          <div className="words-nav">
            <Link className={`icon-btn${verse <= 1 ? ' is-disabled' : ''}`} aria-label="Previous verse" aria-disabled={verse <= 1} to={`/words/${bookId}/${chapter}/${Math.max(1, verse - 1)}`}>
              <ChevronLeft size={18} aria-hidden />
            </Link>
            <Link className="icon-btn" aria-label="Next verse" to={`/words/${bookId}/${chapter}/${verse + 1}`}>
              <ChevronRight size={18} aria-hidden />
            </Link>
          </div>
        </div>

        {original !== 'ready' ? (
          original === 'unknown' ? <div className="skeleton" style={{ height: 160 }} aria-busy="true" /> : <InstallCard />
        ) : words === null ? (
          <div className="skeleton" style={{ height: 200 }} aria-busy="true" />
        ) : words.length === 0 ? (
          <div className="card">
            <div className="empty">
              <h3>No original words for this verse</h3>
              <p>It may be past the end of the chapter, or a verse the original text does not contain.</p>
            </div>
          </div>
        ) : (
          <>
            {english && (
              <div className="scripture words-english">
                <p className="ref">{ref}</p>
                <p>{english}</p>
              </div>
            )}
            <ul className={`word-grid is-${lang}`} dir={lang === 'hebrew' ? 'rtl' : 'ltr'}>
              {words.map((w) => (
                <li key={w.pos}>
                  <Link
                    className="word-card"
                    to={`/word/${w.strong}?ref=${bookId}.${chapter}.${verse}&p=${w.pos}`}
                    dir="ltr"
                  >
                    <span className={`orig orig-${lang}`} dir={lang === 'hebrew' ? 'rtl' : 'ltr'} lang={lang === 'hebrew' ? 'he' : 'grc'}>{w.word}</span>
                    <span className="translit">{w.translit}</span>
                    <span className="gloss">{w.gloss || ' '}</span>
                    <span className="meta">
                      {partOfSpeech(w.grammar, languageOf(w.strong))} · {displayStrong(w.strong)}
                    </span>
                    <span className="sr-only">{describeGrammar(w.grammar, languageOf(w.strong))}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="muted small">{ORIGINAL_TEXT_NOTE}</p>
          </>
        )}
        <p className="muted small attribution-line">{ORIGINAL_ATTRIBUTION}</p>
      </div>
    </>
  );
}
