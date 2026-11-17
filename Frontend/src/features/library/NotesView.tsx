import { formatReference, noteDisplayTitle, parseReference, type NoteDoc, type NoteLink } from '@selah/domain';
import { ArrowLeft, BookOpen, PenLine, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { SaveIndicator } from '@/components/SaveIndicator';
import { relativeTime } from '@/lib/format';
import { useAutosave } from '@/lib/useAutosave';
import { Grow } from '../sermons/Blocks';
import { useSermonList } from '../sermons/hooks';
import { noteIo, notesRepo } from './notesRepo';
import { useLibrary } from './useLibrary';

export function NotesView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, reload } = useLibrary();
  const notes = data?.notes ?? [];

  const create = async () => {
    const newId = await notesRepo.create({ title: '', body: '', links: [] });
    navigate(`/library/notes/${newId}`);
  };

  return (
    <div className={`notes${id ? ' has-detail' : ''}`}>
      <section className="notes-list">
        <div className="lib-head">
          <h2 className="page-title">Notes</h2>
          <button className="btn btn-primary" onClick={() => void create()}>
            <Plus size={16} aria-hidden /> New note
          </button>
        </div>
        {data === null ? (
          <div className="skeleton" style={{ height: 160 }} aria-busy="true" />
        ) : notes.length === 0 ? (
          <div className="card">
            <div className="empty">
              <h3>No notes yet</h3>
              <p>Write a thought, or select verses in the Bible and choose Note to start one linked to the passage.</p>
            </div>
          </div>
        ) : (
          <ul className="lib-list">
            {notes.map((n) => {
              const first = n.links.find((l) => l.type === 'passage');
              return (
                <li key={n.id} className={n.id === id ? 'is-picked' : undefined}>
                  <Link to={`/library/notes/${n.id}`} className="lib-title">
                    <strong>{noteDisplayTitle(n)}</strong>
                    <small className="muted">{first && first.type === 'passage' ? formatReference(first.ref) : 'No link'}</small>
                  </Link>
                  <span className="muted small">{relativeTime(n.updatedAt)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {id && <NoteDetail key={id} id={id} onChanged={() => void reload()} />}
    </div>
  );
}

function NoteDetail({ id, onChanged }: { id: string; onChanged: () => void }) {
  const navigate = useNavigate();
  const { doc, missing, update, saveState, savedAt, flush } = useAutosave<NoteDoc>(id, noteIo);
  const { items: sermons } = useSermonList();
  const [passageText, setPassageText] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);

  // Keep the list titles fresh once a save lands.
  useEffect(() => {
    if (saveState === 'saved') onChanged();
    // only when a save completes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveState]);

  if (missing) return <Navigate to="/library/notes" replace />;
  if (!doc) return <aside className="note-detail"><div className="skeleton" style={{ height: 200 }} aria-busy="true" /></aside>;

  const addLink = (link: NoteLink) => update((d) => ({ ...d, links: [...d.links, link] }));
  const removeLink = (i: number) => update((d) => ({ ...d, links: d.links.filter((_, k) => k !== i) }));

  const addPassage = () => {
    const ref = parseReference(passageText);
    if (!ref) return setError('Not a valid reference. Try Romans 12:1.');
    addLink({ type: 'passage', ref });
    setPassageText('');
    setError('');
  };

  const linkedSermonIds = new Set(doc.links.flatMap((l) => (l.type === 'sermon' ? [l.id] : [])));

  return (
    <aside className="note-detail" aria-label="Note">
      <div className="note-top">
        <Link to="/library/notes" className="back-link note-back">
          <ArrowLeft size={15} aria-hidden /> Notes
        </Link>
        <SaveIndicator state={saveState} savedAt={savedAt} />
        <button className="icon-btn" aria-label="Delete note" onClick={() => setConfirm(true)}>
          <Trash2 size={16} aria-hidden />
        </button>
      </div>

      <input className="note-title" value={doc.title} placeholder="Title" aria-label="Note title" onChange={(e) => update((d) => ({ ...d, title: e.target.value }))} />
      <Grow className="note-body" value={doc.body} label="Note" placeholder="Write your thought" onChange={(body) => update((d) => ({ ...d, body }))} />

      <h3 className="note-links-head">Linked to</h3>
      {doc.links.length === 0 && <p className="muted small">Not linked to anything yet.</p>}
      <ul className="link-chips">
        {doc.links.map((l, i) => (
          <li key={i}>
            {l.type === 'passage' ? (
              <Link className="chip chip-ref" to={`/bible/${l.ref.book}/${l.ref.chapter}?v=${l.ref.verseStart}${l.ref.verseEnd > l.ref.verseStart ? `-${l.ref.verseEnd}` : ''}`}>
                <BookOpen size={13} aria-hidden /> {formatReference(l.ref)}
              </Link>
            ) : (
              <Link className="chip" to={`/sermons/${l.id}`}>
                <PenLine size={13} aria-hidden /> {l.title}
              </Link>
            )}
            <button className="chip-x" aria-label="Remove link" onClick={() => removeLink(i)}>
              <X size={13} aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <div className="link-add">
        <input
          value={passageText}
          onChange={(e) => setPassageText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addPassage()}
          placeholder="Link a passage, for example Romans 12:2"
          aria-label="Link a passage"
          aria-invalid={!!error}
        />
        <button className="btn btn-sm" onClick={addPassage} disabled={!passageText.trim()}>Link</button>
      </div>
      {error && <p className="field-error">{error}</p>}

      {sermons && sermons.filter((s) => !linkedSermonIds.has(s.id)).length > 0 && (
        <label className="select link-sermon">
          <span className="sr-only">Link a sermon</span>
          <select value="" onChange={(e) => {
            const s = sermons.find((x) => x.id === e.target.value);
            if (s) addLink({ type: 'sermon', id: s.id, title: s.title });
          }}>
            <option value="">Link a sermon</option>
            {sermons.filter((s) => !linkedSermonIds.has(s.id)).map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </label>
      )}

      <p className="muted small note-foot">This note stands on its own. Deleting a sermon it is linked to keeps the note.</p>

      <ConfirmDialog
        open={confirm}
        title="Delete this note?"
        body="It moves to Recently deleted for 30 days, where you can restore it."
        confirmLabel="Delete"
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          await flush();
          await notesRepo.remove(id);
          navigate('/library/notes', { replace: true });
        }}
      />
    </aside>
  );
}
