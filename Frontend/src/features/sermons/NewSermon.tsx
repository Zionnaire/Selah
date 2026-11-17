import {
  TEMPLATES,
  buildSections,
  formatReference,
  getBook,
  parseReference,
  type PassageRef,
  type SermonDoc,
  type TemplateId,
} from '@selah/domain';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageBar } from '@/app/PageBar';
import { getDb } from '@/data/client';
import { useApp } from '@/store/app';
import { useReader } from '@/store/reader';
import { sermonRepo } from './repo';

const LENGTHS = [15, 20, 30, 40, 45, 60];

/** Turns a bare chapter into a real verse range using the chapter text on this device. */
async function resolve(ref: PassageRef, translation: string): Promise<PassageRef> {
  if (ref.verseEnd !== 0) return ref;
  const book = getBook(ref.book)!;
  const rows = await getDb().chapter(translation, book.order, ref.chapter);
  const last = rows.at(-1)?.verse ?? 1;
  return { ...ref, verseStart: 1, verseEnd: last };
}

export function NewSermon() {
  const navigate = useNavigate();
  const installed = useApp((s) => s.installed);
  const pref = useReader((s) => s.translation);
  const translation = installed[pref] ? pref : (Object.keys(installed)[0] ?? 'kjv');

  const [title, setTitle] = useState('');
  const [passageText, setPassageText] = useState('');
  const [date, setDate] = useState('');
  const [minutes, setMinutes] = useState(30);
  const [template, setTemplate] = useState<TemplateId>('three-points');
  const [preview, setPreview] = useState<{ verse: number; text: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const ref = passageText.trim() ? parseReference(passageText) : null;
  const refError = passageText.trim() && !ref ? 'That reference is not in the Bible. Try Romans 12:1-2.' : '';

  useEffect(() => {
    if (!ref) return setPreview([]);
    let live = true;
    const book = getBook(ref.book)!;
    const end = ref.verseEnd === 0 ? ref.verseStart + 2 : Math.min(ref.verseEnd, ref.verseStart + 4);
    void getDb()
      .verses([translation], book.order, ref.chapter, ref.verseStart, end)
      .then((rows) => live && setPreview(rows.map(({ verse, text }) => ({ verse, text }))));
    return () => {
      live = false;
    };
    // ref is recomputed from passageText, so depend on the text
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passageText, translation]);

  const canCreate = !busy && !refError && (title.trim() !== '' || ref !== null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;
    setBusy(true);
    const id = crypto.randomUUID();
    const passage = ref ? await resolve(ref, translation) : undefined;
    const doc: SermonDoc = {
      title: title.trim() || `Sermon on ${formatReference(passage!)}`,
      passage,
      status: 'idea',
      preachDate: date || undefined,
      targetMinutes: minutes,
      sections: buildSections(template, minutes, passage, () => crypto.randomUUID()),
    };
    // Starting a scripture block for the passage saves the first copy and paste.
    const first = doc.sections[1] ?? doc.sections[0];
    if (passage && first) {
      first.blocks.push({ id: crypto.randomUUID(), type: 'scripture', ref: passage });
    }
    await sermonRepo.save(id, doc);
    navigate(`/sermons/${id}`, { replace: true });
  };

  return (
    <>
      <PageBar title="Sermon Studio" />
      <form className="page new-sermon" onSubmit={submit}>
        <Link to="/sermons" className="back-link">
          <ArrowLeft size={15} aria-hidden /> Sermon Studio
        </Link>
        <h2 className="page-title">New sermon</h2>
        <p className="muted lead">Only a title or a passage is needed. Everything else can change later.</p>

        <div className="form-grid">
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="The Power of a Transformed Mind" autoFocus />
          </label>

          <label className="field">
            <span>Passage</span>
            <input
              value={passageText}
              onChange={(e) => setPassageText(e.target.value)}
              placeholder="Romans 12:1-2"
              aria-invalid={!!refError}
              aria-describedby="passage-note"
            />
            <small id="passage-note" className={refError ? 'field-error' : 'muted'}>
              {refError || 'Type a reference. The text appears below from your device.'}
            </small>
          </label>

          {ref && preview.length > 0 && (
            <div className="scripture passage-preview" aria-live="polite">
              <p className="ref">{formatReference(ref)}</p>
              <p>
                {preview.map((v) => (
                  <span key={v.verse}>
                    <sup className="vnum">{v.verse}</sup>
                    {v.text}{' '}
                  </span>
                ))}
              </p>
            </div>
          )}

          <div className="field-row">
            <label className="field">
              <span>Preaching date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="field">
              <span>Length</span>
              <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
                {LENGTHS.map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset className="field">
            <legend>Structure</legend>
            <div className="template-grid" role="radiogroup">
              {TEMPLATES.map((t) => (
                <label key={t.id} className={`template${template === t.id ? ' is-on' : ''}`}>
                  <input
                    type="radio"
                    name="template"
                    checked={template === t.id}
                    onChange={() => setTemplate(t.id)}
                    disabled={t.id === 'verse-by-verse' && !ref}
                  />
                  <strong>{t.name}</strong>
                  <span>{t.id === 'verse-by-verse' && !ref ? 'Add a passage to use this.' : t.description}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="form-actions">
          <Link className="btn" to="/sermons">
            Cancel
          </Link>
          <button className="btn btn-primary" type="submit" disabled={!canCreate}>
            Create sermon
          </button>
        </div>
      </form>
    </>
  );
}
