import { useEffect, useState } from 'react';
import { relativeTime } from '@/lib/format';

/** Honest status text: saving, saved, or what went wrong. Never claims sync that is not there. */
export function useSaveLabel(state: 'saved' | 'saving' | 'error', savedAt: number | null, online: boolean): string {
  // Re-render each minute so "Saved just now" does not go stale.
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  if (state === 'saving') return 'Saving';
  if (state === 'error') return 'Could not save. Keep this tab open and try again.';
  const where = online ? 'Saved on this device' : 'Offline, saved on this device';
  if (!savedAt) return where;
  const age = Date.now() - savedAt;
  return age < 60_000 ? `${where}` : `${where}, ${relativeTime(savedAt).toLowerCase()}`;
}
