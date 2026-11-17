import { useOnline } from '@/lib/useOnline';
import { useAccount } from '@/store/account';
import { useSync } from '@/store/sync';

export type SyncKey = 'signedOut' | 'syncing' | 'synced' | 'waiting' | 'offline' | 'attention' | 'problem';

export interface SyncView {
  key: SyncKey;
  /** Short line for the rail. Never says synced for work that is only on this device. */
  label: string;
  /** One sentence for Settings. */
  detail: string;
}

const changes = (n: number) => `${n} ${n === 1 ? 'change' : 'changes'}`;

/** "Just now", "12 minutes ago", "Today at 14:05", "Yesterday at 09:30". */
export function lastSynced(ts: number, now = Date.now()): string {
  const secs = Math.max(0, Math.round((now - ts) / 1000));
  if (secs < 60) return 'just now';
  if (secs < 3600) {
    const m = Math.round(secs / 60);
    return `${m} ${m === 1 ? 'minute' : 'minutes'} ago`;
  }
  const time = new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const day = new Date(ts).toDateString();
  if (day === new Date(now).toDateString()) return `today at ${time}`;
  if (day === new Date(now - 86_400_000).toDateString()) return `yesterday at ${time}`;
  return `${new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} at ${time}`;
}

/** The one place that decides what the sync state is called, so the rail and Settings always agree. */
export function useSyncView(): SyncView {
  const status = useAccount((s) => s.status);
  const online = useOnline();
  const { overview, running, problem } = useSync();

  if (status !== 'signedIn') {
    return { key: 'signedOut', label: online ? 'Saved on this device' : 'Offline, saved on this device', detail: 'Your work is saved on this device only.' };
  }
  const pending = overview?.pending ?? 0;
  const attention = overview?.attention ?? 0;

  if (attention > 0 || problem?.kind === 'confirm') {
    return { key: 'attention', label: 'Needs attention', detail: 'Something needs a decision before it can be backed up.' };
  }
  if (!online || problem?.kind === 'offline') {
    return {
      key: 'offline',
      label: pending > 0 ? `Offline, ${changes(pending)} waiting` : 'Offline, saved on this device',
      detail: pending > 0 ? 'Your changes are saved on this device and will be sent when you are online.' : 'Everything is saved on this device.',
    };
  }
  if (running) return { key: 'syncing', label: 'Syncing', detail: 'Sending and receiving changes.' };
  if (problem) {
    return {
      key: 'problem',
      label: 'Could not sync, will retry',
      detail:
        problem.kind === 'busy'
          ? 'Too many requests. SELAH will try again shortly. Your work is saved on this device.'
          : 'The server had a problem. SELAH will try again. Your work is saved on this device.',
    };
  }
  if (pending > 0) return { key: 'waiting', label: `Waiting to sync (${changes(pending)})`, detail: 'These changes are saved on this device and have not been backed up yet.' };
  if ((overview?.guest.total ?? 0) > 0) {
    return { key: 'waiting', label: 'Some work is not backed up', detail: 'Work from before you signed in is only on this device. Add it to your account to back it up.' };
  }
  if (overview?.lastOkAt) return { key: 'synced', label: 'Synced', detail: `Everything is backed up. Last synced ${lastSynced(overview.lastOkAt)}.` };
  return { key: 'waiting', label: 'Not synced yet', detail: 'The first sync has not finished.' };
}
