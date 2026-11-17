const DAY = 86_400_000;

/** "Today", "Yesterday", "3 days ago", then a short date. */
export function relativeTime(ts: number, now = Date.now()): string {
  const days = Math.floor((startOfDay(now) - startOfDay(ts)) / DAY);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const startOfDay = (ts: number) => new Date(new Date(ts).toDateString()).getTime();

/** "Sun 22 Nov" from yyyy-mm-dd, read as a local date so no timezone shift. */
export function shortDate(iso?: string): string {
  if (!iso) return 'Not set';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, m! - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export const todayIso = (): string => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** 125 seconds becomes "2:05". */
export function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

export const minutesLabel = (m: number): string => `${Math.round(m)} min`;
