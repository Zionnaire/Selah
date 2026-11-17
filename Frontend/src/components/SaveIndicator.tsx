import { Check, CloudOff, TriangleAlert } from 'lucide-react';
import { useSaveLabel } from '@/features/sermons/saveLabel';
import type { SaveState } from '@/lib/useAutosave';
import { useOnline } from '@/lib/useOnline';

/** Honest save status for any autosaved document. */
export function SaveIndicator({ state, savedAt }: { state: SaveState; savedAt: number | null }) {
  const online = useOnline();
  const label = useSaveLabel(state, savedAt, online);
  const Icon = state === 'error' ? TriangleAlert : state === 'saving' ? null : online ? Check : CloudOff;
  return (
    <span className={`save-indicator is-${state}`} role="status" aria-live="polite">
      {Icon ? <Icon size={14} aria-hidden /> : <span className="save-dot" aria-hidden />}
      <span className="hide-sm">{label}</span>
    </span>
  );
}
