import { PanelLeft, PanelRight } from 'lucide-react';

interface Props {
  side: 'left' | 'right';
  open: boolean;
  onToggle: () => void;
  /** What the panel is, in a few words: "the library sections", "research tools". */
  label: string;
}

/** Shows or hides a side panel so the main work can use the whole width. The choice is the caller's to remember. */
export function SideToggle({ side, open, onToggle, label }: Props) {
  const Icon = side === 'left' ? PanelLeft : PanelRight;
  const text = `${open ? 'Hide' : 'Show'} ${label}`;
  return (
    <button className="icon-btn bar-toggle" aria-label={text} aria-pressed={open} title={text} onClick={onToggle}>
      <Icon size={17} aria-hidden />
    </button>
  );
}
