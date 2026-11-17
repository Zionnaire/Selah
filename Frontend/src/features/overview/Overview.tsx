import { TRANSLATIONS, formatReference, getBook, type PassageRef } from '@selah/domain';
import { BookOpen, CloudOff, Download, HardDrive, Lectern, PenLine, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageBar } from '@/app/PageBar';
import { getDb } from '@/data/client';
import { relativeTime, shortDate } from '@/lib/format';
import { useApp } from '@/store/app';
import { useReader } from '@/store/reader';
import { useSermonList } from '../sermons/hooks';
import { pickNext, type SermonListItem } from '../sermons/repo';
import { StatusChip } from '../sermons/Studio';
import { HeroBackdrop } from './HeroBackdrop';

/** Short, well known passages. One is shown per day, read from the local Bible. */
const REFLECTIONS: PassageRef[] = [
  { book: 'PSA', chapter: 119, verseStart: 105, verseEnd: 105 },
  { book: 'PRO', chapter: 3, verseStart: 5, verseEnd: 5 },
  { book: 'ISA', chapter: 40, verseStart: 31, verseEnd: 31 },
  { book: 'LAM', chapter: 3, verseStart: 22, verseEnd: 22 },
  { book: 'MIC', chapter: 6, verseStart: 8, verseEnd: 8 },
  { book: 'JHN', chapter: 1, verseStart: 14, verseEnd: 14 },
  { book: 'ROM', chapter: 12, verseStart: 2, verseEnd: 2 },
  { book: 'PHP', chapter: 4, verseStart: 6, verseEnd: 6 },
  { book: 'PSA', chapter: 46, verseStart: 10, verseEnd: 10 },
  { book: 'MAT', chapter: 11, verseStart: 28, verseEnd: 28 },
  { book: 'HEB', chapter: 4, verseStart: 12, verseEnd: 12 },
  { book: 'JAS', chapter: 1, verseStart: 5, verseEnd: 5 },
];

const dayOfYear = (d: Date) => Math.floor((+d - +new Date(d.getFullYear(), 0, 0)) / 86_400_000);

function headline(now: Date) {
  const left = (7 - now.getDay()) % 7;
  if (left === 0) return 'Today is Sunday.';
  if (left === 1) return 'Sunday is tomorrow.';
  return `Sunday is ${left} days away.`;
}

function greeting(now: Date) {
  const h = now.getHours();
  return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

function Reflection() {
  const installed = useApp((s) => s.installed);
  const pref = useReader((s) => s.translation);
  const tr = installed[pref] ? pref : (Object.keys(installed)[0] ?? 'kjv');
  const ref = REFLECTIONS[dayOfYear(new Date()) % REFLECTIONS.length]!;
  const [text, setText] = useState('');

  useEffect(() => {
    let live = true;
    const book = getBook(ref.book)!;
    getDb()
      .verses([tr], book.order, ref.chapter, ref.verseStart, ref.verseEnd)
      .then((rows) => live && setText(rows[0]?.text ?? ''));
    return () => {
      live = false;
    };
  }, [tr, ref.book, ref.chapter, ref.verseStart, ref.verseEnd]);

  if (!text) return <p className="hero-verse" aria-hidden>&nbsp;</p>;
  return (
    <p className="hero-verse">
      {text}{' '}
      <Link to={`/bible/${ref.book}/${ref.chapter}?v=${ref.verseStart}`} className="hero-ref">
        {formatReference(ref)}
      </Link>
    </p>
  );
}

function ContinueReading() {
  const last = useReader((s) => s.last);
  const installed = useApp((s) => s.installed);
  const pref = useReader((s) => s.translation);
  const tr = installed[pref] ? pref : (Object.keys(installed)[0] ?? 'kjv');
  const book = getBook(last.book)!;
  const [verses, setVerses] = useState<string[]>([]);
  const from = last.verse ?? 1;

  useEffect(() => {
    let live = true;
    getDb()
      .verses([tr], book.order, last.chapter, from, from + 2)
      .then((rows) => live && setVerses(rows.map((r) => r.text)));
    return () => {
      live = false;
    };
  }, [tr, book.order, last.chapter, from]);

  const abbr = TRANSLATIONS.find((t) => t.id === tr)?.abbr ?? tr;
  const to = `/bible/${last.book}/${last.chapter}${last.verse ? `?v=${last.verse}` : ''}`;

  return (
    <section className="card">
      <h2 className="card-title">
        Continue reading <Link to="/bible">Open Bible</Link>
      </h2>
      <p className="ref">
        {book.name} {last.chapter} <span className="tr-badge">{abbr}</span>
      </p>
      <p className="read-preview">
        {verses.length ? verses.join(' ') : <span className="skeleton" style={{ display: 'block', height: 60 }} />}
      </p>
      <Link className="btn" to={to}>
        {last.verse ? `Resume at verse ${last.verse}` : 'Resume reading'}
      </Link>
    </section>
  );
}

function OnThisDevice() {
  const { installed, installing, failed, download, db } = useApp();
  return (
    <section className="card">
      <h2 className="card-title">On this device</h2>
      <ul className="device-list">
        {TRANSLATIONS.map((t) => {
          const have = installed[t.id];
          const progress = installing[t.id];
          return (
            <li key={t.id}>
              <span>{t.name}</span>
              {have ? (
                <span className="chip chip-ok">Offline</span>
              ) : progress !== undefined ? (
                <span className="chip">{Math.round(progress * 100)}%</span>
              ) : (
                <button className="btn btn-sm" onClick={() => void download(t.id)}>
                  <Download size={14} aria-hidden /> Download
                </button>
              )}
              {failed[t.id] && <p className="field-error">{failed[t.id]}</p>}
            </li>
          );
        })}
      </ul>
      {db?.mode === 'memory' ? (
        <p className="notice warn">
          <CloudOff size={16} aria-hidden /> This browser is not letting SELAH store data. Reading works, but
          downloads and highlights are lost when you close the tab.
        </p>
      ) : (
        <p className="muted small">Your Bible and anything you save open without internet.</p>
      )}
    </section>
  );
}

const QUICK = [
  { to: '/bible', label: 'Read Scripture', icon: BookOpen },
  { to: '/study', label: 'Start a study', icon: Search },
  { to: '/sermons', label: 'New sermon', icon: Plus },
  { to: '/pulpit', label: 'Enter Pulpit', icon: Lectern },
] as const;

function NextSermon({ items }: { items: SermonListItem[] | null }) {
  const next = items ? pickNext(items) : undefined;
  if (!next) {
    return (
      <div className="next-sermon">
        <div>
          <p className="eyebrow">Preaching next</p>
          <h2>{items?.length ? 'Nothing scheduled' : 'No sermon planned yet'}</h2>
          <p className="hero-sub">
            {items?.length
              ? 'Give a sermon a preaching date and it appears here.'
              : 'Start from a passage or a study and SELAH keeps track of your progress.'}
          </p>
        </div>
        <div className="next-actions">
          <Link className="btn btn-gilt" to={items?.length ? '/sermons' : '/sermons/new'}>
            <PenLine size={16} aria-hidden /> {items?.length ? 'Open Sermon Studio' : 'Start a sermon'}
          </Link>
        </div>
      </div>
    );
  }
  const pct = next.sectionsTotal ? (next.sectionsStarted / next.sectionsTotal) * 100 : 0;
  return (
    <div className="next-sermon">
      <div className="next-main">
        <p className="eyebrow">Preaching {shortDate(next.preachDate)}</p>
        <h2>{next.title}</h2>
        {next.passage && <p className="next-ref">{formatReference(next.passage)}</p>}
        <div className="next-progress">
          <div className="progress on-navy" aria-hidden>
            <span style={{ width: `${pct}%` }} />
          </div>
          <p>
            {next.sectionsStarted} of {next.sectionsTotal} sections written, about {Math.round(next.writtenMinutes)} of{' '}
            {next.targetMinutes} min
          </p>
        </div>
      </div>
      <div className="next-actions">
        <Link className="btn btn-on-navy" to={`/sermons/${next.id}`}>
          <PenLine size={16} aria-hidden /> Continue writing
        </Link>
        <Link className="btn btn-gilt" to={`/pulpit/${next.id}`}>
          <Lectern size={16} aria-hidden /> Prepare for pulpit
        </Link>
      </div>
    </div>
  );
}

function RecentSermons({ items }: { items: SermonListItem[] | null }) {
  return (
    <section className="card span-all">
      <h2 className="card-title">
        Recent sermons <Link to="/sermons">Sermon Studio</Link>
      </h2>
      {items === null ? (
        <div className="skeleton" style={{ height: 64 }} aria-busy="true" />
      ) : items.length === 0 ? (
        <div className="empty">
          <div className="empty-icon"><PenLine size={20} aria-hidden /></div>
          <h3>Your sermons will appear here</h3>
          <p>Each one shows its passage, status and how far you have written.</p>
        </div>
      ) : (
        <ul className="recent-list">
          {items.slice(0, 4).map((s) => (
            <li key={s.id}>
              <Link to={`/sermons/${s.id}`}>
                <span>
                  <strong>{s.title}</strong>
                  <small className="muted">
                    {s.passage ? formatReference(s.passage) : 'No passage'}, edited {relativeTime(s.updatedAt).toLowerCase()}
                  </small>
                </span>
                <StatusChip status={s.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Overview() {
  const now = new Date();
  const { items } = useSermonList();
  return (
    <>
      <section className="hero">
        <HeroBackdrop />
        <span className="ray" aria-hidden />
        <PageBar>
          <span className="spacer" />
        </PageBar>
        <div className="hero-inner">
          <p className="hero-greet">{greeting(now)}</p>
          <h1 className="hero-title">{headline(now)}</h1>
          <Reflection />

          <NextSermon items={items} />
        </div>
      </section>

      <div className="page overview-grid">
        <ContinueReading />
        <OnThisDevice />
        <section className="card">
          <h2 className="card-title">Quick actions</h2>
          <div className="quick">
            {QUICK.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className="btn">
                <Icon size={16} aria-hidden /> {label}
              </Link>
            ))}
          </div>
          <p className="muted small hint">
            <HardDrive size={13} aria-hidden /> Press <kbd>/</kbd> anywhere to search.
          </p>
        </section>
        <RecentSermons items={items} />
      </div>
    </>
  );
}
