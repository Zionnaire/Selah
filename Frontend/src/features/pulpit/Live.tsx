import {
  TRANSLATIONS,
  firstSentence,
  formatReference,
  type Block,
  type PassageRef,
  type Sermon,
} from '@selah/domain';
import { BookOpen, ChevronLeft, ChevronRight, EyeOff, Pause, Play, Search, Type, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { clock, todayIso } from '@/lib/format';
import { useApp } from '@/store/app';
import { useReader } from '@/store/reader';
import { useScriptureTexts } from '../sermons/hooks';
import { sermonRepo } from '../sermons/repo';
import { pulpitFontSize, usePulpitPrefs, type PulpitMode } from './prefs';
import { FindVerse } from './FindVerse';

const MODES: { id: PulpitMode; label: string }[] = [
  { id: 'manuscript', label: 'Manuscript' },
  { id: 'outline', label: 'Outline' },
  { id: 'scripture', label: 'Scripture' },
];

function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const acquire = () => navigator.wakeLock.request('screen').then((l) => (lock = l)).catch(() => undefined);
    void acquire();
    // The lock is released whenever the tab is hidden, so take it again on return.
    const onVisible = () => document.visibilityState === 'visible' && void acquire();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, [on]);
}

export function PulpitLive() {
  const { id = '' } = useParams();
  const [sermon, setSermon] = useState<Sermon | null | undefined>(undefined);
  useEffect(() => {
    void sermonRepo.load(id).then(setSermon);
  }, [id]);
  if (sermon === null) return <Navigate to="/pulpit" replace />;
  if (!sermon) return <div className="pulpit pulpit-loading" aria-busy="true" />;
  return <Session sermon={sermon} />;
}

function Session({ sermon }: { sermon: Sermon }) {
  const navigate = useNavigate();
  const prefs = usePulpitPrefs();
  const installed = useApp((s) => s.installed);
  const pref = useReader((s) => s.translation);
  const translation = installed[pref] ? pref : (Object.keys(installed)[0] ?? 'kjv');
  const abbr = TRANSLATIONS.find((t) => t.id === translation)?.abbr ?? translation;

  const sections = sermon.sections;
  const [index, setIndex] = useState(0);
  const [mode, setMode] = useState<PulpitMode>(prefs.startMode);
  const [paused, setPaused] = useState(false);
  const [blank, setBlank] = useState(false);
  const [finding, setFinding] = useState(false);
  const [ending, setEnding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [clockNow, setClockNow] = useState(() => new Date());
  const perSection = useRef<number[]>(sections.map(() => 0));
  const indexRef = useRef(0);
  indexRef.current = index;

  const section = sections[index];

  // Theme applies to the whole document while preaching and is always cleaned up.
  useEffect(() => {
    document.documentElement.dataset.pulpit = prefs.theme;
    return () => {
      delete document.documentElement.dataset.pulpit;
    };
  }, [prefs.theme]);

  useWakeLock(prefs.keepAwake);

  // One clock. Paused time is not counted, and each second is credited to the open section.
  useEffect(() => {
    const t = setInterval(() => {
      setClockNow(new Date());
      if (paused || ending) return;
      perSection.current[indexRef.current] = (perSection.current[indexRef.current] ?? 0) + 1;
      setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [paused, ending]);

  const refs: PassageRef[] = useMemo(
    () => sections.flatMap((s) => s.blocks.flatMap((b) => (b.type === 'scripture' ? [b.ref] : []))),
    [sections],
  );
  const { texts, keyOf } = useScriptureTexts(refs, translation);

  const go = useCallback((delta: number) => setIndex((i) => Math.min(sections.length - 1, Math.max(0, i + delta))), [sections.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finding || ending) return;
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowright' || k === 'pagedown') go(1);
      else if (k === 'arrowleft' || k === 'pageup') go(-1);
      else if (k === 's') setMode((m) => (m === 'scripture' ? prefs.startMode : 'scripture'));
      else if (k === 'f') (e.preventDefault(), setFinding(true));
      else if (k === 'b') setBlank((b) => !b);
      else if (k === ' ') (e.preventDefault(), setPaused((p) => !p));
      else if (k === 'escape') setBlank(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, finding, ending, prefs.startMode]);

  // Pace: where the clock says you should be at the end of this section, versus now.
  const target = sermon.targetMinutes * 60;
  const planned = sections.slice(0, index + 1).reduce((n, s) => n + s.minutes, 0) * 60;
  const startOfSection = sections.slice(0, index).reduce((n, s) => n + s.minutes, 0) * 60;
  // Over: this section's slot has run out. Ahead: you reached this section well before its start.
  const over = Math.max(0, elapsed - planned);
  const early = startOfSection - elapsed;
  const pace =
    over > 60
      ? { cls: 'is-over', text: `${Math.round(over / 60)} min over` }
      : early > 90
        ? { cls: 'is-ahead', text: `${Math.round(early / 60)} min ahead` }
        : { cls: 'is-ok', text: 'On time' };

  const remaining = target - elapsed;
  const prev = sections[index - 1];
  const next = sections[index + 1];

  const finish = async (markPreached: boolean) => {
    if (markPreached) {
      const fresh = await sermonRepo.load(sermon.id);
      if (fresh) {
        const { id: _i, createdAt: _c, updatedAt: _u, ...doc } = fresh;
        await sermonRepo.save(sermon.id, { ...doc, status: 'delivered', preachDate: doc.preachDate ?? todayIso() });
      }
    }
    navigate(`/sermons/${sermon.id}`, { replace: true });
  };

  if (!section) return <Navigate to={`/sermons/${sermon.id}`} replace />;

  const fontSize = pulpitFontSize(prefs.textStep);

  return (
    <div className="pulpit" style={{ ['--pulpit-size' as string]: fontSize }}>
      {blank && (
        <button className="pulpit-blank" onClick={() => setBlank(false)} aria-label="Screen is blank. Tap to show the sermon again.">
          <span>Tap or press B to return</span>
        </button>
      )}

      <header className="pulpit-bar">
        <div className="pulpit-brand">
          <img src="/brand/selah-symbol-gold.svg" alt="" width={24} height={24} />
          <strong>{sermon.title}</strong>
        </div>
        <div className="segmented pulpit-modes" role="group" aria-label="View">
          {MODES.map((m) => (
            <button key={m.id} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <div className="pulpit-status">
          <span className="pill"><span className="dot ok" aria-hidden /> Offline copy</span>
          <span className={`pill ${pace.cls}`}><span className="dot" aria-hidden /> {pace.text}</span>
          <span className="pulpit-clock" aria-label="Time now">{clockNow.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
          <span className="pulpit-left muted">{remaining >= 0 ? `${clock(remaining)} left` : `${clock(-remaining)} over`}</span>
          <button className="pulpit-icon" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Resume timer' : 'Pause timer'}>
            {paused ? <Play size={18} aria-hidden /> : <Pause size={18} aria-hidden />}
          </button>
          <button className="pulpit-icon" onClick={() => setEnding(true)} aria-label="End session">
            <X size={18} aria-hidden />
          </button>
        </div>
      </header>

      <main className={`pulpit-main mode-${mode}`} key={`${index}-${mode}`}>
        <SectionView
          mode={mode}
          index={index}
          total={sections.length}
          title={section.title}
          blocks={section.blocks}
          texts={texts}
          keyOf={keyOf}
          abbr={abbr}
        />
      </main>

      <footer className="pulpit-foot">
        <button className="pulpit-nav" onClick={() => go(-1)} disabled={!prev} aria-label={prev ? `Previous section: ${prev.title}` : 'No previous section'}>
          <ChevronLeft size={22} aria-hidden />
          <span>
            <small>Previous</small>
            {prev?.title ?? ''}
          </span>
        </button>

        <div className="pulpit-center">
          <ol className="pulpit-progress" aria-label="Sections">
            {sections.map((s, i) => (
              <li key={s.id}>
                <button className={i === index ? 'is-now' : i < index ? 'is-done' : ''} onClick={() => setIndex(i)} aria-label={`Go to ${s.title || `section ${i + 1}`}`} aria-current={i === index ? 'step' : undefined} />
              </li>
            ))}
          </ol>
          <div className="pulpit-tools">
            <button onClick={() => setFinding(true)} aria-label="Find a verse (F)" title="Find a verse (F)"><Search size={18} aria-hidden /></button>
            <button onClick={() => setBlank(true)} aria-label="Blank the screen (B)" title="Blank the screen (B)"><EyeOff size={18} aria-hidden /></button>
            <button onClick={() => prefs.set({ textStep: Math.max(-2, prefs.textStep - 1) })} aria-label="Smaller text" title="Smaller text"><Type size={14} aria-hidden /></button>
            <button onClick={() => prefs.set({ textStep: Math.min(6, prefs.textStep + 1) })} aria-label="Larger text" title="Larger text"><Type size={20} aria-hidden /></button>
          </div>
        </div>

        <button className="pulpit-nav is-next" onClick={() => go(1)} disabled={!next} aria-label={next ? `Next section: ${next.title}` : 'No next section'}>
          <span>
            <small>Next</small>
            {next?.title ?? ''}
          </span>
          <ChevronRight size={22} aria-hidden />
        </button>
      </footer>

      {finding && <FindVerse translation={translation} abbr={abbr} onClose={() => setFinding(false)} />}

      {ending && (
        <div className="pulpit-dialog-wrap" role="dialog" aria-modal="true" aria-label="Session summary">
          <div className="pulpit-dialog">
            <h2>End this session?</h2>
            <p className="muted">
              You preached for <strong>{clock(elapsed)}</strong> of {sermon.targetMinutes} minutes.
            </p>
            <ul className="session-times">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <span>{s.title || `Section ${i + 1}`}</span>
                  <span className="muted">{clock(perSection.current[i] ?? 0)} of {s.minutes}:00</span>
                </li>
              ))}
            </ul>
            <div className="dialog-actions">
              <button className="btn" onClick={() => setEnding(false)} autoFocus>Keep preaching</button>
              <button className="btn" onClick={() => void finish(false)}>Leave without marking</button>
              <button className="btn btn-gilt" onClick={() => void finish(true)}>Mark as preached today</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ViewProps {
  mode: PulpitMode;
  index: number;
  total: number;
  title: string;
  blocks: Block[];
  texts: Record<string, { verse: number; text: string }[]>;
  keyOf: (r: PassageRef) => string;
  abbr: string;
}

function Verses({ rows }: { rows: { verse: number; text: string }[] | undefined }) {
  if (!rows) return null;
  return (
    <p>
      {rows.map((v) => (
        <span key={v.verse}>
          <sup className="vnum">{v.verse}</sup>
          {v.text}{' '}
        </span>
      ))}
    </p>
  );
}

function SectionView({ mode, index, total, title, blocks, texts, keyOf, abbr }: ViewProps) {
  const scriptures = blocks.filter((b): b is Extract<Block, { type: 'scripture' }> => b.type === 'scripture');
  const [shown, setShown] = useState<string | null>(null);
  const shownBlock = scriptures.find((b) => b.id === shown) ?? scriptures[0];

  const head = (
    <>
      <p className="pulpit-eyebrow">Section {index + 1} of {total}</p>
      <h1 className="pulpit-title">{title || 'Untitled section'}</h1>
    </>
  );

  if (mode === 'scripture') {
    return (
      <div className="pulpit-scroll">
        {head}
        {scriptures.length === 0 && <p className="muted pulpit-empty">No Scripture in this section.</p>}
        {scriptures.map((b) => (
          <section key={b.id} className="pulpit-verses">
            <p className="pulpit-ref">{formatReference(b.ref)} <span className="tr-badge">{abbr}</span></p>
            <Verses rows={texts[keyOf(b.ref)]} />
          </section>
        ))}
      </div>
    );
  }

  if (mode === 'outline') {
    return (
      <div className="pulpit-split">
        <div className="pulpit-scroll">
          {head}
          {blocks.length === 0 && <p className="muted pulpit-empty">Nothing written in this section.</p>}
          <ul className="pulpit-bullets">
            {blocks.map((b) => {
              if (b.type === 'cue') return <li key={b.id} className="pulpit-cue">{b.text}</li>;
              if (b.type === 'scripture')
                return (
                  <li key={b.id} className="no-bullet">
                    <button className={`ref-chip${b.id === shownBlock?.id ? ' is-on' : ''}`} onClick={() => setShown(b.id)}>
                      <BookOpen size={16} aria-hidden /> {formatReference(b.ref)}
                    </button>
                  </li>
                );
              const text = b.type === 'story' ? b.title || firstSentence(b.text) : firstSentence(b.text);
              return text ? <li key={b.id}>{text}</li> : null;
            })}
          </ul>
        </div>
        <aside className="pulpit-side" aria-label="Scripture for this section">
          {shownBlock ? (
            <>
              <p className="pulpit-ref">{formatReference(shownBlock.ref)} <span className="tr-badge">{abbr}</span></p>
              <Verses rows={texts[keyOf(shownBlock.ref)]} />
            </>
          ) : (
            <p className="muted">No Scripture in this section.</p>
          )}
        </aside>
      </div>
    );
  }

  return (
    <div className="pulpit-scroll">
      {head}
      {blocks.length === 0 && <p className="muted pulpit-empty">Nothing written in this section.</p>}
      {blocks.map((b) => {
        switch (b.type) {
          case 'text':
          case 'application':
            return b.text ? <p key={b.id} className="pulpit-para">{b.text}</p> : null;
          case 'story':
            return (
              <div key={b.id} className="pulpit-story">
                {b.title && <h2>{b.title}</h2>}
                <p className="pulpit-para">{b.text}</p>
              </div>
            );
          case 'cue':
            return <p key={b.id} className="pulpit-cue">{b.text}</p>;
          case 'scripture':
            return (
              <section key={b.id} className="pulpit-verses">
                <p className="pulpit-ref">{formatReference(b.ref)} <span className="tr-badge">{abbr}</span></p>
                <Verses rows={texts[keyOf(b.ref)]} />
              </section>
            );
        }
      })}
    </div>
  );
}
