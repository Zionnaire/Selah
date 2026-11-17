import {
  TRANSLATIONS,
  buildExport,
  modelToText,
  type ExportFormat,
  type ExportItem,
  type ExportOptions,
  type PassageRef,
  type Sermon,
} from '@selah/domain';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { SideToggle } from '@/components/SideToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { shortDate } from '@/lib/format';
import { useStoredFlag } from '@/lib/useStoredFlag';
import { useApp } from '@/store/app';
import { useReader } from '@/store/reader';
import { useScriptureTexts } from './hooks';
import { sermonRepo } from './repo';

const FORMATS: { id: ExportFormat; name: string; blurb: string }[] = [
  { id: 'pulpit', name: 'Pulpit Edition', blurb: 'Large type, main points, Scripture and optional cues.' },
  { id: 'manuscript', name: 'Manuscript', blurb: 'The full text, to print or save as PDF.' },
  { id: 'outline', name: 'Printable outline', blurb: 'One page of points and references.' },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sermon';

function Item({ it }: { it: ExportItem }) {
  switch (it.kind) {
    case 'bullet':
      return <li>{it.text}</li>;
    case 'para':
      return <p className="x-para">{it.text}</p>;
    case 'cue':
      return <p className="x-cue">{it.text}</p>;
    case 'story':
      return (
        <div className="x-story">
          {it.title && <h4>{it.title}</h4>}
          <p className="x-para">{it.text}</p>
        </div>
      );
    case 'scripture':
      return (
        <div className="scripture x-scripture">
          <p className="ref">{it.ref}</p>
          {it.verses?.length ? (
            <p>
              {it.verses.map((v) => (
                <span key={v.verse}>
                  <sup className="vnum">{v.verse}</sup>
                  {v.text}{' '}
                </span>
              ))}
            </p>
          ) : null}
        </div>
      );
  }
}

/** Groups consecutive bullets into one list so the page reads as real lists. */
function Items({ items }: { items: ExportItem[] }) {
  const out: React.ReactNode[] = [];
  let run: ExportItem[] = [];
  const flush = (k: number) => {
    if (run.length) out.push(<ul key={`l${k}`} className="x-bullets">{run.map((r, i) => <Item key={i} it={r} />)}</ul>);
    run = [];
  };
  items.forEach((it, i) => {
    if (it.kind === 'bullet') run.push(it);
    else (flush(i), out.push(<Item key={i} it={it} />));
  });
  flush(items.length);
  return <>{out}</>;
}

export function SermonExport() {
  const { id = '' } = useParams();
  const [sermon, setSermon] = useState<Sermon | null | undefined>(undefined);
  useEffect(() => {
    void sermonRepo.load(id).then(setSermon);
  }, [id]);
  if (sermon === null) return <Navigate to="/sermons" replace />;
  if (!sermon) return <div className="page"><div className="skeleton" style={{ height: 300 }} aria-busy="true" /></div>;
  return <ExportScreen sermon={sermon} />;
}

function ExportScreen({ sermon }: { sermon: Sermon }) {
  const [controlsOpen, setControlsOpen] = useStoredFlag('selah.export.controls', true);
  const installed = useApp((s) => s.installed);
  const pref = useReader((s) => s.translation);
  const [translation, setTranslation] = useState(installed[pref] ? pref : (Object.keys(installed)[0] ?? 'kjv'));
  const [paper, setPaper] = useState<'A4' | 'Letter'>('A4');
  const [opts, setOpts] = useState<ExportOptions>({ format: 'pulpit', scripture: true, cues: true, stories: false });
  const set = (p: Partial<ExportOptions>) => setOpts((o) => ({ ...o, ...p }));

  const refs: PassageRef[] = useMemo(
    () => sermon.sections.flatMap((s) => s.blocks.flatMap((b) => (b.type === 'scripture' ? [b.ref] : []))),
    [sermon],
  );
  const { texts, keyOf } = useScriptureTexts(refs, translation);
  const model = useMemo(() => buildExport(sermon, opts, (r) => texts[keyOf(r)]), [sermon, opts, texts, keyOf]);

  const info = TRANSLATIONS.find((t) => t.id === translation);
  const usesScripture = refs.length > 0 && opts.scripture && opts.format !== 'outline';
  const attribution = usesScripture ? (info?.attribution ?? '') : '';

  const download = () => {
    const blob = new Blob([modelToText(model, attribution)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: `${slug(sermon.title)}.txt` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="export">
      <style>{`@page { size: ${paper}; margin: 18mm; }`}</style>
      <header className="editor-bar export-bar">
        <Link to={`/sermons/${sermon.id}`} className="back-link">
          <ArrowLeft size={15} aria-hidden /> <span className="hide-sm">Editor</span>
        </Link>
        <span className="editor-title">Export: {sermon.title || 'Untitled sermon'}</span>
        <span className="spacer" />
        <button className="btn" onClick={download}>
          <Download size={16} aria-hidden /> <span className="hide-sm">Plain text</span>
        </button>
        <ThemeToggle />
        <SideToggle side="left" open={controlsOpen} onToggle={() => setControlsOpen(!controlsOpen)} label="export options" />
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Printer size={16} aria-hidden /> <span className="hide-sm">Print or save as PDF</span>
        </button>
      </header>

      <div className={`export-layout${controlsOpen ? '' : ' controls-collapsed'}`}>
        <aside className="export-controls" aria-label="Export options">
          <h2 className="outline-head">Format</h2>
          <div className="format-list" role="radiogroup">
            {FORMATS.map((f) => (
              <label key={f.id} className={`template${opts.format === f.id ? ' is-on' : ''}`}>
                <input type="radio" name="format" checked={opts.format === f.id} onChange={() => set({ format: f.id })} />
                <strong>{f.name}</strong>
                <span>{f.blurb}</span>
              </label>
            ))}
          </div>

          <h2 className="outline-head">Include</h2>
          <label className="check"><input type="checkbox" checked={opts.scripture} disabled={opts.format === 'outline'} onChange={(e) => set({ scripture: e.target.checked })} /> Full Scripture text</label>
          <label className="check"><input type="checkbox" checked={opts.cues && opts.format !== 'outline'} disabled={opts.format === 'outline'} onChange={(e) => set({ cues: e.target.checked })} /> Pulpit cues</label>
          <label className="check"><input type="checkbox" checked={opts.stories || opts.format === 'manuscript'} disabled={opts.format !== 'pulpit'} onChange={(e) => set({ stories: e.target.checked })} /> Stories in full</label>

          <h2 className="outline-head">Translation</h2>
          <div className="segmented" role="group" aria-label="Translation">
            {Object.keys(installed).map((tid) => (
              <button key={tid} aria-pressed={translation === tid} onClick={() => setTranslation(tid)}>
                {TRANSLATIONS.find((t) => t.id === tid)?.abbr ?? tid}
              </button>
            ))}
          </div>

          <h2 className="outline-head">Paper</h2>
          <div className="segmented" role="group" aria-label="Paper size">
            {(['A4', 'Letter'] as const).map((p) => (
              <button key={p} aria-pressed={paper === p} onClick={() => setPaper(p)}>{p}</button>
            ))}
          </div>

          <p className="muted small">
            Made on your device, so it works offline. Choose Save as PDF in the print window. Scripture carries the translation's attribution.
          </p>
        </aside>

        <div className="export-stage">
          <article className={`export-sheet fmt-${opts.format}`}>
            <header className="x-head">
              <span>{FORMATS.find((f) => f.id === opts.format)?.name}</span>
              <span>{sermon.preachDate ? shortDate(sermon.preachDate) : ''}</span>
            </header>
            <h1 className="x-title">{model.title}</h1>
            {model.passage && <p className="x-passage">{model.passage}</p>}
            {model.sections.length === 0 && (
              <p className="x-para x-empty">Nothing to export yet. Write in the sermon, or switch on more of the options.</p>
            )}
            {model.sections.map((s, i) => (
              <section key={i} className="x-section">
                <h2>{i + 1}. {s.title}</h2>
                <Items items={s.items} />
              </section>
            ))}
            {attribution && <footer className="x-foot">Scripture: {attribution}</footer>}
          </article>
        </div>
      </div>
    </div>
  );
}
