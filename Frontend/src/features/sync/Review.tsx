import {
  MAX_SECTIONS,
  MAX_STUDY_SECTIONS,
  formatReference,
  mergeNote,
  mergeSermon,
  mergeStudy,
  resolveNoteConflict,
  resolveSectionConflict,
  resolveStudySectionConflict,
  type Block,
  type Choice,
  type NoteDoc,
  type RecordKind,
  type SermonDoc,
  type StudyDoc,
} from '@selah/domain';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageBar } from '@/app/PageBar';
import { getDb } from '@/data/client';
import type { ConflictDetail } from '@/data/types';
import { emitRecordsChanged } from '@/lib/syncBus';
import { useSync } from '@/store/sync';
import { diffWords, type Piece } from './diff';

const KINDS = ['sermon', 'note', 'study'] as const;

const blockText = (b: Block): string => {
  if (b.type === 'scripture') return formatReference(b.ref);
  if (b.type === 'story') return [b.title, b.text].filter(Boolean).join('\n');
  return b.text;
};

/** One conflicting part: where it is, and the text on each side. */
interface Part {
  id: string;
  title: string;
  local: string;
  remote: string;
}

interface Plan {
  parts: Part[];
  /** The document with everything that merged on its own. Conflicting parts hold this device's version. */
  apply: (choices: Record<string, Choice>) => { doc: unknown; copy?: unknown; error?: string };
  /** True when "keep both" cannot be offered because the document is at its section limit. */
  full: boolean;
}

const newId = () => crypto.randomUUID();
const OTHER = 'Other device';

function plan(d: ConflictDetail): Plan | null {
  if (d.kind === 'sermon') {
    const res = mergeSermon(d.base as SermonDoc | null, d.local as SermonDoc, d.remote as SermonDoc);
    return {
      full: res.merged.sections.length >= MAX_SECTIONS,
      parts: res.conflicts.map((c) => ({
        id: c.sectionId,
        title: c.title || 'Untitled section',
        local: c.local.blocks.map(blockText).join('\n\n'),
        remote: c.remote.blocks.map(blockText).join('\n\n'),
      })),
      apply: (choices) => {
        let doc = res.merged;
        for (const c of res.conflicts) {
          const r = resolveSectionConflict(doc, c, choices[c.sectionId] ?? 'local', OTHER, newId);
          if (!r.ok) return { doc, error: 'There is no room to keep both versions of a section. Choose one of the other two.' };
          doc = r.doc;
        }
        return { doc };
      },
    };
  }
  if (d.kind === 'study') {
    const res = mergeStudy(d.base as StudyDoc | null, d.local as StudyDoc, d.remote as StudyDoc);
    return {
      full: res.merged.sections.length >= MAX_STUDY_SECTIONS,
      parts: res.conflicts.map((c) => ({ id: c.sectionId, title: c.heading || 'Untitled section', local: c.local.body, remote: c.remote.body })),
      apply: (choices) => {
        let doc = res.merged;
        for (const c of res.conflicts) {
          const r = resolveStudySectionConflict(doc, c, choices[c.sectionId] ?? 'local', OTHER, newId);
          if (!r.ok) return { doc, error: 'There is no room to keep both versions of a section. Choose one of the other two.' };
          doc = r.doc;
        }
        return { doc };
      },
    };
  }
  if (d.kind === 'note') {
    const res = mergeNote(d.base as NoteDoc | null, d.local as NoteDoc, d.remote as NoteDoc);
    const c = res.conflicts[0];
    if (!c) return null;
    return {
      full: false,
      parts: [{ id: 'body', title: 'Note text', local: c.local, remote: c.remote }],
      apply: (choices) => {
        const r = resolveNoteConflict(res.merged, c, choices.body ?? 'local', OTHER);
        return { doc: r.doc, copy: r.copy };
      },
    };
  }
  return null;
}

function Words({ pieces }: { pieces: Piece[] }) {
  return (
    <p className="review-text">
      {pieces.map((p, i) => (p.changed ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>))}
    </p>
  );
}

function Choose({ part, choice, full, onChange }: { part: Part; choice: Choice; full: boolean; onChange: (c: Choice) => void }) {
  const { left, right } = useMemo(() => diffWords(part.local, part.remote), [part.local, part.remote]);
  const options: { id: Choice; label: string }[] = [
    { id: 'local', label: 'Keep this device' },
    { id: 'remote', label: 'Keep the other device' },
    ...(full ? [] : [{ id: 'both' as Choice, label: 'Keep both' }]),
  ];
  return (
    <section className="card review-part">
      <h2 className="card-title">{part.title}</h2>
      <div className="review-sides">
        <div>
          <h3 className="review-label">This device</h3>
          <Words pieces={left} />
        </div>
        <div>
          <h3 className="review-label">Other device</h3>
          <Words pieces={right} />
        </div>
      </div>
      <fieldset className="review-choice">
        <legend className="sr-only">What to keep for {part.title}</legend>
        {options.map((o) => (
          <label key={o.id}>
            <input type="radio" name={`keep-${part.id}`} checked={choice === o.id} onChange={() => onChange(o.id)} />
            {o.label}
          </label>
        ))}
      </fieldset>
    </section>
  );
}

export function SyncReview() {
  const { kind, id } = useParams();
  const navigate = useNavigate();
  const { refresh, run } = useSync();
  const [detail, setDetail] = useState<ConflictDetail | null | undefined>(undefined);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!kind || !id) return;
    if (!(KINDS as readonly string[]).includes(kind)) return setDetail(null);
    void getDb().syncConflict(kind as RecordKind, id).then(setDetail).catch(() => setDetail(null));
  }, [kind, id]);

  const p = useMemo(() => (detail ? plan(detail) : null), [detail]);

  const back = (
    <Link className="btn btn-ghost btn-sm" to="/settings#sync">
      <ArrowLeft size={14} aria-hidden /> Back to Settings
    </Link>
  );

  if (detail === undefined) {
    return (
      <>
        <PageBar title="Review a change" />
        <div className="page settings-page"><div className="skeleton" style={{ height: 160 }} aria-busy="true" /></div>
      </>
    );
  }
  if (!detail || !p || p.parts.length === 0) {
    return (
      <>
        <PageBar title="Review a change" />
        <div className="page settings-page">
          <section className="card">
            <p>There is nothing to review here. It may already have been settled on another device.</p>
            {back}
          </section>
        </div>
      </>
    );
  }

  const finish = async () => {
    setBusy(true);
    setError('');
    const result = p.apply(choices);
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    try {
      const saved = await getDb().syncResolve(detail.kind, detail.id, result.doc, result.copy, detail.remoteRev);
      if (!saved) {
        // The other version changed while this was open. Show the current one.
        setError('The other device changed this again while you were deciding. The screen has been refreshed. Review it once more.');
        setDetail(await getDb().syncConflict(detail.kind, detail.id));
        setChoices({});
        setBusy(false);
        return;
      }
      emitRecordsChanged([`${detail.kind}:${detail.id}`]);
      await refresh();
      void run();
      navigate('/settings#sync');
    } catch {
      setError('This could not be saved. Try again.');
      setBusy(false);
    }
  };

  return (
    <>
      <PageBar title="Review a change" />
      <div className="page settings-page">
        <p className="muted">
          The same {detail.kind === 'sermon' ? 'sermon' : detail.kind} was changed on this device and on another. Parts that changed on only one
          device were combined for you. Choose what to keep for the parts below. Nothing is deleted: both versions are kept for 30 days.
        </p>
        {p.parts.map((part) => (
          <Choose key={part.id} part={part} choice={choices[part.id] ?? 'local'} full={p.full} onChange={(c) => setChoices({ ...choices, [part.id]: c })} />
        ))}
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="review-actions">
          <button className="btn btn-primary" disabled={busy} onClick={() => void finish()}>
            Save my choices
          </button>
          {back}
          <span className="muted small">Deciding later is fine. This device keeps its own version and this item waits to sync.</span>
        </div>
      </div>
    </>
  );
}
