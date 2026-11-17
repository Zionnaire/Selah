import { TRANSLATIONS, formatReference, parseReference, type Block, type PassageRef } from '@selah/domain';
import { ArrowDown, ArrowUp, Flag, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { VerseRow } from '@/data/types';

/** A textarea that grows with its content, so the manuscript reads like a page, not a form. */
export function Grow({
  value,
  onChange,
  placeholder,
  className,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  label: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      className={className}
      value={value}
      placeholder={placeholder}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

const LABEL: Record<Block['type'], string> = {
  text: '',
  scripture: 'Scripture',
  story: 'Story',
  application: 'Application',
  cue: 'Pulpit cue',
};

interface Props {
  block: Block;
  index: number;
  count: number;
  verses?: VerseRow[];
  translation: string;
  onChange: (patch: Partial<Block>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}

function ScriptureEditor({ block, verses, translation, onChange }: Pick<Props, 'verses' | 'translation' | 'onChange'> & { block: Extract<Block, { type: 'scripture' }> }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(formatReference(block.ref));
  const [error, setError] = useState('');
  const abbr = TRANSLATIONS.find((t) => t.id === translation)?.abbr ?? translation;

  const commit = () => {
    const ref = parseReference(text);
    if (!ref) return setError('Not a valid reference');
    const next: PassageRef = ref.verseEnd === 0 ? { ...ref, verseEnd: 0 } : ref;
    onChange({ ref: next });
    setEditing(false);
    setError('');
  };

  return (
    <div className="scripture block-scripture">
      <div className="who">
        {editing ? (
          <span className="ref-edit">
            <input
              value={text}
              autoFocus
              aria-label="Scripture reference"
              aria-invalid={!!error}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') setEditing(false);
              }}
              onBlur={commit}
            />
            {error && <small className="field-error">{error}</small>}
          </span>
        ) : (
          <button className="ref-btn ref" onClick={() => (setText(formatReference(block.ref)), setEditing(true))} title="Change reference">
            {formatReference(block.ref)}
          </button>
        )}
        <span className="tr-badge">{abbr}</span>
        <span className="muted small push">Full text in pulpit</span>
      </div>
      {verses === undefined ? (
        <div className="skeleton" style={{ height: 40 }} />
      ) : verses.length === 0 ? (
        <p className="muted">No text for this reference in {abbr} on this device.</p>
      ) : (
        <p>
          {verses.map((v) => (
            <span key={v.verse}>
              <sup className="vnum">{v.verse}</sup>
              {v.text}{' '}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

export function BlockView({ block, index, count, verses, translation, onChange, onMove, onRemove }: Props) {
  const label = LABEL[block.type];
  return (
    <div className={`block block-${block.type}`} data-block-id={block.id}>
      {label && <span className="block-label">{label}</span>}
      <div className="block-body">
        {block.type === 'text' && (
          <Grow className="prose" value={block.text} label="Paragraph" placeholder="Write here" onChange={(text) => onChange({ text })} />
        )}
        {block.type === 'scripture' && (
          <ScriptureEditor block={block} verses={verses} translation={translation} onChange={onChange} />
        )}
        {block.type === 'cue' && (
          <div className="cue">
            <Flag size={15} aria-hidden />
            <Grow className="cue-input" value={block.text} label="Pulpit cue" placeholder="Pause. Slow down. Ask the question." onChange={(text) => onChange({ text })} />
          </div>
        )}
        {block.type === 'story' && (
          <div className="story">
            <input className="story-title" value={block.title} placeholder="Title of the story" aria-label="Story title" onChange={(e) => onChange({ title: e.target.value })} />
            <Grow className="prose" value={block.text} label="Story" placeholder="Tell it as you will say it" onChange={(text) => onChange({ text })} />
          </div>
        )}
        {block.type === 'application' && (
          <div className="application">
            <Grow className="prose" value={block.text} label="Application" placeholder="What should someone do on Monday?" onChange={(text) => onChange({ text })} />
          </div>
        )}
      </div>
      <div className="block-tools" role="group" aria-label="Block actions">
        <button className="icon-btn" aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
          <ArrowUp size={15} aria-hidden />
        </button>
        <button className="icon-btn" aria-label="Move down" disabled={index === count - 1} onClick={() => onMove(1)}>
          <ArrowDown size={15} aria-hidden />
        </button>
        <button className="icon-btn" aria-label="Delete block" onClick={onRemove}>
          <Trash2 size={15} aria-hidden />
        </button>
      </div>
    </div>
  );
}
