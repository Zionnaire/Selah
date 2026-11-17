import {
  SERMON_STATUSES,
  STATUS_LABEL,
  formatReference,
  newBlock,
  parseReference,
  type Block,
  type BlockType,
  type PassageRef,
  type Section,
  type SermonDoc,
  type SermonStatus,
} from '@selah/domain';
import {
  ArrowLeft,
  BookOpen,
  FileDown,
  Flag,
  Lectern,
  PanelLeft,
  PanelRight,
  Plus,
  Quote,
  Sparkles,
  Trash2,
  X,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SaveIndicator } from '@/components/SaveIndicator';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useApp } from '@/store/app';
import { useStoredFlag } from '@/lib/useStoredFlag';
import { useReader } from '@/store/reader';
import { BiblePanel } from './BiblePanel';
import { BlockView, Grow } from './Blocks';
import { useScriptureTexts, useSermonEditor } from './hooks';
import { Outline } from './Outline';
import { SuggestPanel } from './Suggest';
import { sermonRepo } from './repo';

const uid = () => crypto.randomUUID();

const INSERTS: { type: BlockType; label: string; icon: typeof Quote }[] = [
  { type: 'text', label: 'Paragraph', icon: Plus },
  { type: 'scripture', label: 'Scripture', icon: BookOpen },
  { type: 'story', label: 'Story', icon: Quote },
  { type: 'application', label: 'Application', icon: Users },
  { type: 'cue', label: 'Pulpit cue', icon: Flag },
];

export function SermonEditor() {
  const { id = '' } = useParams();
  return <Editor key={id} id={id} />;
}

function Editor({ id }: { id: string }) {
  const navigate = useNavigate();
  const { doc, missing, update, saveState, savedAt, flush } = useSermonEditor(id);
  const installed = useApp((s) => s.installed);
  const pref = useReader((s) => s.translation);
  const setPref = useReader((s) => s.setTranslation);
  const translation = installed[pref] ? pref : (Object.keys(installed)[0] ?? 'kjv');

  const [activeId, setActiveId] = useState<string | null>(null);
  const [panel, setPanel] = useState<'bible' | 'suggest'>('bible');
  const [sheet, setSheet] = useState(false);
  const [outlineOpen, setOutlineOpen] = useStoredFlag('selah.editor.outline', true);
  const [panelOpen, setPanelOpen] = useStoredFlag('selah.editor.panel', true);
  const openSuggest = () => {
    setPanel('suggest');
    setSheet(true);
    setPanelOpen(true);
  };
  const [confirm, setConfirm] = useState<null | { kind: 'sermon' } | { kind: 'section'; id: string }>(null);
  const focusAfter = useRef<string | null>(null);

  const refs = useMemo(
    () => (doc?.sections ?? []).flatMap((s) => s.blocks.flatMap((b) => (b.type === 'scripture' ? [b.ref] : []))),
    [doc],
  );
  const { texts, keyOf } = useScriptureTexts(refs, translation);

  const active = doc?.sections.find((s) => s.id === activeId) ?? doc?.sections[0];

  // Move focus into a block that was just inserted.
  useEffect(() => {
    if (!focusAfter.current) return;
    const el = document.querySelector<HTMLElement>(`[data-block-id="${focusAfter.current}"] textarea, [data-block-id="${focusAfter.current}"] input`);
    el?.focus();
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    focusAfter.current = null;
  }, [doc]);

  const mapSection = useCallback(
    (sid: string, fn: (s: Section) => Section) =>
      update((d) => ({ ...d, sections: d.sections.map((s) => (s.id === sid ? fn(s) : s)) })),
    [update],
  );

  const insert = useCallback(
    (type: BlockType, ref?: PassageRef) => {
      if (!doc) return;
      const target = active ?? doc.sections[0];
      if (!target) return;
      const block = newBlock(type, uid(), ref ?? (type === 'scripture' ? doc.passage : undefined));
      focusAfter.current = block.id;
      mapSection(target.id, (s) => ({ ...s, blocks: [...s.blocks, block] }));
    },
    [doc, active, mapSection],
  );

  /** Blocks the preacher chose to add from a suggestion. They are ordinary blocks from here on. */
  const addBlocks = (blocks: Block[]) => {
    const target = active ?? doc?.sections[0];
    const first = blocks[0];
    if (!target || !first) return;
    focusAfter.current = first.id;
    mapSection(target.id, (s) => ({ ...s, blocks: [...s.blocks, ...blocks] }));
  };

  if (missing) return <Navigate to="/sermons" replace />;
  if (!doc) {
    return (
      <div className="page">
        <div className="skeleton" style={{ height: 300 }} aria-busy="true" />
      </div>
    );
  }

  const moveBlock = (sid: string, bid: string, dir: -1 | 1) =>
    mapSection(sid, (s) => {
      const i = s.blocks.findIndex((b) => b.id === bid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.blocks.length) return s;
      const blocks = [...s.blocks];
      [blocks[i], blocks[j]] = [blocks[j]!, blocks[i]!];
      return { ...s, blocks };
    });

  const moveSection = (sid: string, dir: -1 | 1) =>
    update((d) => {
      const i = d.sections.findIndex((s) => s.id === sid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= d.sections.length) return d;
      const sections = [...d.sections];
      [sections[i], sections[j]] = [sections[j]!, sections[i]!];
      return { ...d, sections };
    });

  const addSection = () => {
    const section: Section = { id: uid(), title: '', minutes: 5, blocks: [] };
    update((d) => ({ ...d, sections: [...d.sections, section] }));
    setActiveId(section.id);
    requestAnimationFrame(() => document.getElementById(`sec-${section.id}`)?.querySelector('input')?.focus());
  };

  const removeSection = (sid: string) => {
    update((d) => ({ ...d, sections: d.sections.filter((s) => s.id !== sid) }));
    setActiveId(null);
  };

  const askRemoveSection = (s: Section) => (s.blocks.length ? setConfirm({ kind: 'section', id: s.id }) : removeSection(s.id));

  const pickSection = (sid: string) => {
    setActiveId(sid);
    document.getElementById(`sec-${sid}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const setPassage = (text: string) => {
    const ref = text.trim() ? parseReference(text) : undefined;
    if (text.trim() && !ref) return;
    update((d) => ({ ...d, passage: ref ?? undefined }));
  };

  const deleteSermon = async () => {
    await flush();
    await sermonRepo.remove(id);
    navigate('/sermons', { replace: true });
  };

  const tabs = (
    <div className="panel-tabs" role="tablist">
      <button role="tab" aria-selected={panel === 'bible'} onClick={() => setPanel('bible')}>
        Bible
      </button>
      <button role="tab" aria-selected={panel === 'suggest'} onClick={() => setPanel('suggest')}>
        <Sparkles size={13} aria-hidden /> SELAH suggests
      </button>
      <button className="sheet-close" aria-label="Close panel" onClick={() => setSheet(false)}>
        <X size={16} aria-hidden />
      </button>
    </div>
  );

  return (
    <div className="editor">
      <header className="editor-bar">
        <Link to="/sermons" className="back-link">
          <ArrowLeft size={15} aria-hidden /> <span className="hide-sm">Sermon Studio</span>
        </Link>
        <button
          className="icon-btn bar-toggle"
          aria-label={outlineOpen ? 'Hide the outline' : 'Show the outline'}
          aria-pressed={outlineOpen}
          title={outlineOpen ? 'Hide the outline' : 'Show the outline'}
          onClick={() => setOutlineOpen(!outlineOpen)}
        >
          <PanelLeft size={17} aria-hidden />
        </button>
        <span className="editor-title">{doc.title || 'Untitled sermon'}</span>
        <label className={`status-select status-${doc.status}`}>
          <span className="sr-only">Status</span>
          <select value={doc.status} onChange={(e) => update((d) => ({ ...d, status: e.target.value as SermonStatus }))}>
            {SERMON_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <span className="spacer" />
        <SaveIndicator state={saveState} savedAt={savedAt} />
        <ThemeToggle />
        <button
          className="icon-btn bar-toggle bar-toggle-panel"
          aria-label={panelOpen ? 'Hide the Bible and suggestions panel' : 'Show the Bible and suggestions panel'}
          aria-pressed={panelOpen}
          title={panelOpen ? 'Hide the Bible and suggestions panel' : 'Show the Bible and suggestions panel'}
          onClick={() => setPanelOpen(!panelOpen)}
        >
          <PanelRight size={17} aria-hidden />
        </button>
        <Link className="icon-btn" aria-label="Export" title="Export or print" to={`/sermons/${id}/export`} onClick={() => void flush()}>
          <FileDown size={17} aria-hidden />
        </Link>
        <button className="icon-btn" aria-label="Delete sermon" title="Delete sermon" onClick={() => setConfirm({ kind: 'sermon' })}>
          <Trash2 size={17} aria-hidden />
        </button>
        <Link
          className="btn btn-gilt"
          to={`/pulpit/${id}`}
          onClick={() => void flush()}
        >
          <Lectern size={16} aria-hidden /> <span className="hide-sm">Prepare for pulpit</span>
        </Link>
      </header>

      <div className={`editor-body${outlineOpen ? '' : ' no-outline'}${panelOpen ? '' : ' no-panel'}`}>
        <Outline doc={doc} activeId={active?.id ?? null} onPick={pickSection} onAdd={addSection} onMove={moveSection} />

        <main className="manuscript-wrap">
          <article className="manuscript">
            <Grow className="ms-title" value={doc.title} label="Sermon title" placeholder="Untitled sermon" onChange={(title) => update((d) => ({ ...d, title }))} />
            <label className="meta-topic">
              <span className="sr-only">Topic or main idea</span>
              <input
                value={doc.topic ?? ''}
                maxLength={300}
                placeholder="Topic or main idea. SELAH uses this when you ask for suggestions."
                onChange={(e) => update((d) => ({ ...d, topic: e.target.value || undefined }))}
              />
            </label>
            <div className="ms-meta">
              <label className="meta-field">
                <span className="sr-only">Passage</span>
                <input
                  defaultValue={doc.passage ? formatReference(doc.passage) : ''}
                  placeholder="Passage"
                  onBlur={(e) => setPassage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur())}
                />
              </label>
              <label className="meta-field">
                <span className="sr-only">Preaching date</span>
                <input type="date" value={doc.preachDate ?? ''} onChange={(e) => update((d) => ({ ...d, preachDate: e.target.value || undefined }))} />
              </label>
              <label className="meta-field">
                <span className="sr-only">Series</span>
                <input value={doc.series ?? ''} placeholder="Series" onChange={(e) => update((d) => ({ ...d, series: e.target.value || undefined }))} />
              </label>
            </div>

            {doc.sections.map((s) => (
              <section key={s.id} id={`sec-${s.id}`} className="ms-section" onFocusCapture={() => setActiveId(s.id)} onClick={() => setActiveId(s.id)}>
                <div className="ms-section-head">
                  <input
                    className="ms-section-title"
                    value={s.title}
                    placeholder="Section title"
                    aria-label="Section title"
                    onChange={(e) => mapSection(s.id, (x) => ({ ...x, title: e.target.value }))}
                  />
                  <label className="minutes-field" title="Time budget for this section">
                    <input
                      type="number"
                      min={0}
                      max={240}
                      value={s.minutes}
                      aria-label={`Minutes for ${s.title || 'this section'}`}
                      onChange={(e) => mapSection(s.id, (x) => ({ ...x, minutes: Math.max(0, Number(e.target.value) || 0) }))}
                    />
                    <span>min</span>
                  </label>
                  <button className="icon-btn" aria-label={`Delete section ${s.title || ''}`} onClick={() => askRemoveSection(s)}>
                    <Trash2 size={15} aria-hidden />
                  </button>
                </div>

                {s.blocks.length === 0 && <p className="muted small ms-empty">Nothing here yet. Use the bar below to add a paragraph, Scripture, a story or a pulpit cue, or <button className="link-btn" onClick={openSuggest}>ask SELAH to suggest</button>.</p>}

                {s.blocks.map((b: Block, i) => (
                  <BlockView
                    key={b.id}
                    block={b}
                    index={i}
                    count={s.blocks.length}
                    translation={translation}
                    verses={b.type === 'scripture' ? texts[keyOf(b.ref)] : undefined}
                    onChange={(patch) => mapSection(s.id, (x) => ({ ...x, blocks: x.blocks.map((y) => (y.id === b.id ? ({ ...y, ...patch } as Block) : y)) }))}
                    onMove={(dir) => moveBlock(s.id, b.id, dir)}
                    onRemove={() => mapSection(s.id, (x) => ({ ...x, blocks: x.blocks.filter((y) => y.id !== b.id) }))}
                  />
                ))}
              </section>
            ))}
            <div className="ms-end" />
          </article>

          <div className="insertbar" role="toolbar" aria-label={`Add to ${active?.title || 'section'}`}>
            {INSERTS.map(({ type, label, icon: Icon }) => (
              <button key={type} onClick={() => insert(type)} aria-label={`Add ${label}`} title={`Add ${label}`}>
                <Icon size={16} aria-hidden /> <span className="lbl">{label}</span>
              </button>
            ))}
            <button className="insert-ai" onClick={openSuggest} aria-label="Suggest with SELAH" title="Suggest points, an introduction or a conclusion">
              <Sparkles size={16} aria-hidden /> <span className="lbl">Suggest</span>
            </button>
          </div>
        </main>

        <BiblePanel
          key={doc.passage ? formatReference(doc.passage) : 'none'}
          start={doc.passage}
          translation={translation}
          onTranslation={setPref}
          onInsert={(ref) => insert('scripture', ref)}
          header={tabs}
          hidden={panel !== 'bible'}
          sheet={sheet}
        />
        <SuggestPanel header={tabs} hidden={panel !== 'suggest'} sheet={sheet} doc={doc} active={active} translation={translation} onAdd={addBlocks} />
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.kind === 'sermon' ? 'Delete this sermon?' : 'Delete this section?'}
        body={
          confirm?.kind === 'sermon'
            ? 'The sermon and everything in it will be removed from this device.'
            : 'The section and what you wrote in it will be removed. You cannot undo this.'
        }
        confirmLabel="Delete"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm?.kind === 'sermon') void deleteSermon();
          if (confirm?.kind === 'section') removeSection(confirm.id);
          setConfirm(null);
        }}
      />
    </div>
  );
}

