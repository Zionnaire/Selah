import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { offerSnoozed } from '@/lib/offerSnooze';
import { useAccount } from '@/store/account';
import { loadSyncPrefs, useSync } from '@/store/sync';
import { GuestWorkDialog } from './GuestWorkDialog';

const TICK_MS = 5_000;
/** A pull for changes from other devices, even when nothing here changed. */
const PULL_EVERY_TICKS = 12;

/** Screens where an offer would interrupt the work. */
const QUIET = /^\/(sermons\/[^/]+|study\/[^/]+|pulpit\/[^/]+\/live|sign-in|create-account|forgot-password|reset-password)(\/|$)/;

/**
 * Starts and paces sync while someone is signed in: when the app opens, a few seconds after changes
 * settle, when the connection returns, when the tab comes back, and on a slow beat for changes from
 * other devices. Sync now in Settings always works, even with automatic sync off.
 */
export function SyncHost() {
  const status = useAccount((s) => s.status);
  const userId = useAccount((s) => s.user?.id);
  const location = useLocation();
  const overview = useSync((s) => s.overview);
  const dismissed = useSync((s) => s.offerDismissed);

  const last = useRef({ pending: -1, ticks: 0 });

  useEffect(() => {
    void loadSyncPrefs();
  }, []);

  useEffect(() => {
    if (status !== 'signedIn') return;
    // A new sign in asks about guest work again.
    useSync.setState({ offerDismissed: false });
    const sync = useSync.getState();
    void sync.refresh().then(() => {
      if (useSync.getState().auto) void useSync.getState().run();
    });

    const go = () => useSync.getState().auto && void useSync.getState().run();
    const onVisible = () => document.visibilityState === 'visible' && go();
    window.addEventListener('online', go);
    document.addEventListener('visibilitychange', onVisible);

    const timer = setInterval(() => {
      const s = useSync.getState();
      void s.refresh().then(() => {
        const now = useSync.getState();
        if (!now.auto || now.running || document.visibilityState !== 'visible' || !navigator.onLine) return;
        const pending = now.overview?.pending ?? 0;
        last.current.ticks++;
        // Changes have settled when the count stopped moving for one beat.
        const settled = pending > 0 && pending === last.current.pending;
        last.current.pending = pending;
        if (settled || last.current.ticks % PULL_EVERY_TICKS === 0) void now.run();
      });
    }, TICK_MS);

    return () => {
      clearInterval(timer);
      window.removeEventListener('online', go);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [status, userId]);

  const offer = status === 'signedIn' && !dismissed && !offerSnoozed(userId) && (overview?.guest.total ?? 0) > 0 && !QUIET.test(location.pathname);
  return offer && overview ? <GuestWorkDialog guest={overview.guest} /> : null;
}
