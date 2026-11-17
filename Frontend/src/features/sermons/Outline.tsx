import { sectionProgress, sectionStarted, sectionWords, wordsToMinutes, WORDS_PER_MINUTE, type SermonDoc } from '@selah/domain';
import { ArrowDown, ArrowUp, Plus } from 'lucide-react';

interface Props {
  doc: SermonDoc;
  activeId: string | null;
  onPick: (id: string) => void;
  onAdd: () => void;
  onMove: (id: string, dir: -1 | 1) => void;
}

export function Outline({ doc, activeId, onPick, onAdd, onMove }: Props) {
  const written = doc.sections.reduce((n, s) => n + wordsToMinutes(sectionWords(s)), 0);
  const budget = doc.sections.reduce((n, s) => n + s.minutes, 0);
  const pct = doc.targetMinutes ? Math.min(100, (written / doc.targetMinutes) * 100) : 0;

  return (
    <nav className="outline" aria-label="Sermon outline">
      <h2 className="outline-head">Outline</h2>
      <ol>
        {doc.sections.map((s, i) => {
          const mins = wordsToMinutes(sectionWords(s));
          return (
            <li key={s.id} className={s.id === activeId ? 'is-active' : undefined}>
              <button className="outline-item" onClick={() => onPick(s.id)} aria-current={s.id === activeId ? 'true' : undefined}>
                <strong>{s.title || 'Untitled section'}</strong>
                <div className="progress sm" aria-hidden>
                  <span style={{ width: `${sectionProgress(s) * 100}%` }} />
                </div>
                <small className="muted">
                  {sectionStarted(s) || mins > 0 ? `${mins.toFixed(mins < 10 ? 1 : 0)} of ${s.minutes} min` : 'Not started'}
                </small>
              </button>
              <span className="outline-move">
                <button className="icon-btn" aria-label={`Move ${s.title || 'section'} up`} disabled={i === 0} onClick={() => onMove(s.id, -1)}>
                  <ArrowUp size={14} aria-hidden />
                </button>
                <button className="icon-btn" aria-label={`Move ${s.title || 'section'} down`} disabled={i === doc.sections.length - 1} onClick={() => onMove(s.id, 1)}>
                  <ArrowDown size={14} aria-hidden />
                </button>
              </span>
            </li>
          );
        })}
      </ol>
      <button className="btn btn-ghost add-section" onClick={onAdd}>
        <Plus size={16} aria-hidden /> Add section
      </button>

      <div className="outline-foot">
        <p>
          <strong>{Math.round(written)}</strong> of {doc.targetMinutes} minutes written
        </p>
        <div className="progress" aria-hidden>
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="muted small">
          At about {WORDS_PER_MINUTE} words a minute.
          {budget !== doc.targetMinutes && ` Section budgets add up to ${budget} min.`}
        </p>
      </div>
    </nav>
  );
}
