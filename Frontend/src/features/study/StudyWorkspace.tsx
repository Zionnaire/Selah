import {
  STUDY_KIND_LABEL,
  TRANSLATIONS,
  BOOKS,
  formatReference,
  groupVerses,
  hasVerse,
  parseReference,
  type CollectedVerse,
  type PassageRef,
  type StudyDoc,
} from '@selah/domain';
import { ArrowLeft, PenLine, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SaveIndicator } from '@/components/SaveIndicator';
import { SideToggle } from '@/components/SideToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { getDb } from '@/data/client';
import type { SearchHit } from '@/data/types';
import { useAutosave } from '@/lib/useAutosave';
import { useStoredFlag } from '@/lib/useStoredFlag';
import { useApp } from '@/store/app';
import { useReader } from '@/store/reader';
import { Grow } from '../sermons/Blocks';
import { useScriptureTexts } from '../sermons/hooks';
import { studyIo, studyRepo } from './repo';
import { useXrefs } from './useXrefs';
import { XrefList } from './XrefList';

const uid = () => crypto.randomUUID();

export function StudyWorkspace() {
  const { id = '' } = useParams();
  return <Workspace key={id} id={id} />;
}

function Workspace({ id }: { id: string }) {
  const navigate = useNavigate();
  const { doc, missing, update, saveState, savedAt, flush } = useAutosave<StudyDoc>(id, studyIo);
  const installed = useApp((s) => s.installed);
  const pref = useReader((s) => s.translation);
  const setPref = useReader((s) => s.setTranslation);
  const translation = installed[pref] ? pref : (Object.keys(installed)[0] ?? 'kjv');
  const abbr = TRANSLATIONS.find((t) => t.id === translation)?.abbr ?? translation;

  const [tab, setTab] = useState<'xrefs' | 'find'>('xrefs');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toolsOpen, setToolsOpen] = useStoredFlag('selah.study.tools', true);

  const refs = useMemo(() => {
    const list: PassageRef[] = doc?.passage ? [doc.passage] : [];
    return [...list, ...(doc?.verses.map((v) => v.ref) ?? [])];
  }, [doc]);
  const { texts, keyOf } = useScriptureTexts(refs, translation);

  // Verses of the passage drive the cross-reference panel. A whole chapter is capped to keep it readable.
  const passageVerses = useMemo(() => {
    const p = doc?.passage;
    if (!p) return [];
    const end = p.verseEnd === 0 ? p.verseStart + 9 : Math.min(p.verseEnd, p.verseStart + 11);
    return Array.from({ length: end - p.verseStart + 1 }, (_, i) => p.verseStart + i);
  }, [doc?.passage]);
  const bookNo = doc?.passage ? BOOKS.find((b) => b.id === doc.passage!.book)!.order : 1;
  const xr = useXrefs(bookNo, doc?.passage?.chapter ?? 1, passageVerses, translation);

  useEffect(() => {
    if (doc && !doc.passage) setTab('find');
  }, [doc?.kind]); // eslint-disable-line react-hooks/exhaustive-deps

  if (missing) return <Navigate to="/study" replace />;
  if (!doc) return <div className="page"><div className="skeleton" style={{ height: 300 }} aria-busy="true" /></div>;

  const addVerse = (ref: PassageRef) => {
    if (hasVerse(doc.verses, ref)) return;
    update((d) => ({ ...d, verses: [...d.verses, { id: uid(), ref, note: '', group: '' }] }));
  };
  const patchVerse = (vid: string, patch: Partial<CollectedVerse>) =>
    update((d) => ({ ...d, verses: d.verses.map((v) => (v.id === vid ? { ...v, ...patch } : v)) }));

  const groups = groupVerses(doc.verses);
  const groupNames = [...new Set(doc.verses.map((v) => v.group.trim()).filter(Boolean))];

  const startSermon = async () => {
    setBusy(true);
    await flush();
    navigate(`/sermons/${await studyRepo.toSermon(doc)}`);
  };

  return (
    <div className="editor">
      <header className="editor-bar">
        <Link to="/study" className="back-link">
          <ArrowLeft size={15} aria-hidden /> <span className="hide-sm">Study</span>
        </Link>
        <span className="editor-title">{doc.title}</span>
        <span className="chip">{STUDY_KIND_LABEL[doc.kind]}</span>
        <span className="spacer" />
        <SaveIndicator state={saveState} savedAt={savedAt} />
        <ThemeToggle />
        <button className="icon-btn" aria-label="Delete study" onClick={() => setConfirm(true)}>
          <Trash2 size={17} aria-hidden />
        </button>
        <SideToggle side="right" open={toolsOpen} onToggle={() => setToolsOpen(!toolsOpen)} label="research tools" />
        <button className="btn btn-gilt" onClick={() => void startSermon()} disabled={busy}>
          <PenLine size={16} aria-hidden /> <span className="hide-sm">Start a sermon</span>
        </button>
      </header>

      <div className={`study-body${toolsOpen ? '' : ' tools-collapsed'}`}>
        <main className="manuscript-wrap">
          <article className="manuscript study-sheet">
            <Grow className="ms-title" value={doc.title} label="Study title" placeholder="Untitled study" onChange={(title) => update((d) => ({ ...d, title }))} />
            <div className="ms-meta">
              {doc.passage && <span className="chip chip-ref">{formatReference(doc.passage)}</span>}
              {doc.topic && <span className="chip">Topic: {doc.topic}</span>}
            </div>

            {doc.passage && (
              <section className="scripture study-passage" aria-label="The passage">
                <p className="ref">{formatReference(doc.passage)} <span className="tr-badge">{abbr}</span></p>
                <p>
                  {(texts[keyOf(doc.passage)] ?? []).map((v) => (
                    <span key={v.verse}>
                      <sup className="vnum">{v.verse}</sup>
                      {v.text}{' '}
                    </span>
                  ))}
                </p>
              </section>
            )}

            {doc.sections.map((s) => (
              <section key={s.id} className="ms-section">
                <div className="ms-section-head">
                  <input
                    className="ms-section-title"
                    value={s.heading}
                    aria-label="Section heading"
                    placeholder="Heading"
                    onChange={(e) => update((d) => ({ ...d, sections: d.sections.map((x) => (x.id === s.id ? { ...x, heading: e.target.value } : x)) }))}
                  />
                  <button className="icon-btn" aria-label={`Delete section ${s.heading}`} onClick={() => update((d) => ({ ...d, sections: d.sections.filter((x) => x.id !== s.id) }))}>
                    <Trash2 size={15} aria-hidden />
                  </button>
                </div>
                <Grow className="prose" value={s.body} label={s.heading || 'Section'} placeholder="Write in your own words" onChange={(body) => update((d) => ({ ...d, sections: d.sections.map((x) => (x.id === s.id ? { ...x, body } : x)) }))} />
              </section>
            ))}
            <button className="btn btn-ghost add-section" onClick={() => update((d) => ({ ...d, sections: [...d.sections, { id: uid(), heading: '', body: '' }] }))}>
              <Plus size={16} aria-hidden /> Add section
            </button>

            <section className="ms-section collected" aria-label="Collected verses">
              <h2 className="ms-section-title static">Collected verses</h2>
              {doc.verses.length === 0 ? (
                <p className="muted small">Add verses from the panel on the right. They stay with this study and can become Scripture in a sermon.</p>
              ) : (
                groups.map(({ group, verses }) => (
                  <div key={group} className="verse-group">
                    {group && <h3 className="group-title">{group}</h3>}
                    {verses.map((v) => (
                      <div key={v.id} className="collected-verse">
                        <div className="scripture">
                          <p className="ref">
                            <Link to={`/bible/${v.ref.book}/${v.ref.chapter}?v=${v.ref.verseStart}`}>{formatReference(v.ref)}</Link>{' '}
                            <span className="tr-badge">{abbr}</span>
                          </p>
                          <p>{(texts[keyOf(v.ref)] ?? []).map((x) => x.text).join(' ')}</p>
                        </div>
                        <div className="collected-meta">
                          <input value={v.note} placeholder="Why this verse matters" aria-label={`Note on ${formatReference(v.ref)}`} onChange={(e) => patchVerse(v.id, { note: e.target.value })} />
                          {/* Committed on blur or Enter: regrouping while typing would remount this field. */}
                          <input
                            key={v.group}
                            defaultValue={v.group}
                            placeholder="Stage or theme"
                            list={`groups-${id}`}
                            aria-label={`Group for ${formatReference(v.ref)}`}
                            onBlur={(e) => e.target.value !== v.group && patchVerse(v.id, { group: e.target.value.trim() })}
                            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                          />
                          <button className="icon-btn" aria-label={`Remove ${formatReference(v.ref)}`} onClick={() => update((d) => ({ ...d, verses: d.verses.filter((x) => x.id !== v.id) }))}>
                            <X size={15} aria-hidden />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}
              <datalist id={`groups-${id}`}>
                {groupNames.map((g) => <option key={g} value={g} />)}
              </datalist>
            </section>
          </article>
        </main>

        <aside className="editor-panel" aria-label="Research tools">
          <div className="panel-tabs" role="tablist">
            {doc.passage && (
              <button role="tab" aria-selected={tab === 'xrefs'} className="tab-btn" onClick={() => setTab('xrefs')}>Cross-references</button>
            )}
            <button role="tab" aria-selected={tab === 'find'} className="tab-btn" onClick={() => setTab('find')}>Find verses</button>
          </div>
          {tab === 'xrefs' && doc.passage ? (
            <XrefList
              items={xr.items}
              status={xr.status}
              action={(it) => {
                const have = hasVerse(doc.verses, it.ref);
                return (
                  <button className="btn btn-sm" disabled={have} onClick={() => addVerse(it.ref)}>
                    {have ? 'Added' : <><Plus size={13} aria-hidden /> Add</>}
                  </button>
                );
              }}
            />
          ) : (
            <FindVerses translation={translation} onTranslation={setPref} have={(r) => hasVerse(doc.verses, r)} onAdd={addVerse} />
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Delete this study?"
        body="It moves to Recently deleted for 30 days, where you can restore it."
        confirmLabel="Delete"
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          await flush();
          await studyRepo.remove(id);
          navigate('/study', { replace: true });
        }}
      />
    </div>
  );
}

function FindVerses({
  translation,
  onTranslation,
  have,
  onAdd,
}: {
  translation: string;
  onTranslation: (t: string) => void;
  have: (r: PassageRef) => boolean;
  onAdd: (r: PassageRef) => void;
}) {
  const installed = Object.keys(useApp((s) => s.installed));
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const direct = q.trim() ? parseReference(q) : null;

  useEffect(() => {
    const term = q.trim();
    if (!term || direct) return setHits(null);
    let live = true;
    const t = setTimeout(() => {
      void getDb().search(translation, term, 40).then((h) => live && setHits(h));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, translation, direct]);

  return (
    <div className="panel-pad">
      <label className="field">
        <span className="sr-only">Search Scripture or type a reference</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="A word, or a reference such as Eph 4:22" />
      </label>
      {installed.length > 1 && (
        <div className="segmented" role="group" aria-label="Translation">
          {installed.map((t) => (
            <button key={t} aria-pressed={translation === t} onClick={() => onTranslation(t)}>
              {TRANSLATIONS.find((x) => x.id === t)?.abbr ?? t}
            </button>
          ))}
        </div>
      )}

      {direct && (
        <div className="find-row">
          <span className="ref">{formatReference(direct)}</span>
          <button className="btn btn-sm" disabled={have(direct)} onClick={() => onAdd(direct)}>
            {have(direct) ? 'Added' : <><Plus size={13} aria-hidden /> Add</>}
          </button>
        </div>
      )}
      {hits && hits.length === 0 && <p className="muted small">No verse contains that in {TRANSLATIONS.find((t) => t.id === translation)?.abbr}.</p>}
      {hits && hits.length > 0 && (
        <ul className="find-hits">
          {hits.map((h) => {
            const b = BOOKS[h.book - 1]!;
            const ref: PassageRef = { book: b.id, chapter: h.chapter, verseStart: h.verse, verseEnd: h.verse };
            return (
              <li key={`${h.book}.${h.chapter}.${h.verse}`}>
                <div className="xref-head">
                  <span className="ref">{formatReference(ref)}</span>
                  <button className="btn btn-sm" disabled={have(ref)} onClick={() => onAdd(ref)}>
                    {have(ref) ? 'Added' : <><Plus size={13} aria-hidden /> Add</>}
                  </button>
                </div>
                <p className="xref-text">{h.snippet.replace(/\[\[|\]\]/g, '')}</p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
