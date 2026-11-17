import { LIMITS, type PullResponse, type PushResponse, type RecordKind } from '@selah/domain';
import { create } from 'zustand';
import { getDb } from '@/data/client';
import type { ApplyReport, GuestWork, PushOutcome, SyncOverview } from '@/data/types';
import { api, ApiError } from '@/lib/api';
import { snoozeOffer } from '@/lib/offerSnooze';
import { busyKeys, emitRecordsChanged, flushEditors } from '@/lib/syncBus';
import { useAccount } from './account';

export type SyncNotice = ApplyReport['notices'][number] & { at: number };

export type SyncProblem =
  | { kind: 'offline' }
  | { kind: 'busy' }
  | { kind: 'server' }
  /** A push would remove many items. It waits for the person to confirm. */
  | { kind: 'confirm'; count: number };

interface SyncState {
  overview: SyncOverview | null;
  running: boolean;
  problem: SyncProblem | null;
  notices: SyncNotice[];
  /** Automatic sync. Off means sync only runs on Sync now. Kept on this device. */
  auto: boolean;
  /** Guest work the person has not decided about yet, offered when they are signed in. */
  offerDismissed: boolean;

  refresh: () => Promise<void>;
  run: (opts?: { confirmMassDelete?: boolean }) => Promise<void>;
  setAuto: (on: boolean) => Promise<void>;
  dismissOffer: () => void;
  adopt: (mode: 'add' | 'keep') => Promise<GuestWork>;
  clearNotice: (at: number) => void;
}

const AUTO_KEY = 'sync.auto';
const emptyOverview = (): SyncOverview => ({
  pending: 0,
  attention: 0,
  cursor: 0,
  lastOkAt: null,
  counts: { sermon: 0, note: 0, study: 0, highlight: 0, bookmark: 0 },
  guest: { sermons: 0, notes: 0, studies: 0, highlights: 0, bookmarks: 0, total: 0 },
});

let running = false;
let rerun: { confirmMassDelete?: boolean } | null = null;
let retryTimer: ReturnType<typeof setTimeout> | undefined;

const key = (k: RecordKind, id: string) => `${k}:${id}`;

export const useSync = create<SyncState>((set, get) => ({
  overview: null,
  running: false,
  problem: null,
  notices: [],
  auto: true,
  offerDismissed: false,

  async refresh() {
    try {
      set({ overview: await getDb().syncOverview() });
    } catch {
      /* the data layer is not ready yet */
    }
  },

  async run(opts = {}) {
    if (useAccount.getState().status !== 'signedIn') return;
    if (running) {
      rerun = { ...rerun, ...opts };
      return;
    }
    running = true;
    set({ running: true });
    try {
      // The lock keeps two tabs from syncing at once. A tab that does not get it simply waits for the next round.
      if (navigator.locks) {
        await navigator.locks.request('selah-sync', { ifAvailable: true }, async (lock) => {
          if (lock) await round(set, get, opts.confirmMassDelete);
        });
      } else {
        await round(set, get, opts.confirmMassDelete);
      }
    } finally {
      running = false;
      set({ running: false });
      await get().refresh();
      if (rerun) {
        const next = rerun;
        rerun = null;
        void get().run(next);
      }
    }
  },

  async setAuto(on) {
    set({ auto: on });
    await getDb().setSetting(AUTO_KEY, on ? '1' : '0').catch(() => undefined);
  },

  dismissOffer() {
    const id = useAccount.getState().user?.id;
    if (id) snoozeOffer(id);
    set({ offerDismissed: true });
  },

  async adopt(mode) {
    const user = useAccount.getState().user;
    if (!user) return emptyOverview().guest;
    const done = await getDb().syncAdopt(user.id, mode);
    await get().refresh();
    if (mode === 'add') void get().run();
    return done;
  },

  clearNotice: (at) => set({ notices: get().notices.filter((n) => n.at !== at) }),
}));

type Set = (p: Partial<SyncState>) => void;
type Get = () => SyncState;

/** One full round: send what changed, bring in what others changed, and repeat while there is more to do. */
/** The person the round runs for. If they sign out or another account signs in, the round stops quietly. */
class AccountChanged extends Error {}
const guard = (account: string) => {
  if (useAccount.getState().user?.id !== account) throw new AccountChanged();
};

async function round(set: Set, get: Get, confirmMassDelete?: boolean) {
  const db = getDb();
  const account = useAccount.getState().user?.id;
  if (!account) return;
  if (!navigator.onLine) return set({ problem: { kind: 'offline' } });
  try {
    await flushEditors();
    let deferred = false;
    // A conflict is settled by the pull, which may leave a merged record to send. A few passes cover that.
    for (let pass = 0; pass < 4; pass++) {
      await pushAll(account, confirmMassDelete);
      deferred = (await pullAll(set, get, account)).deferred;
      if (deferred || (await db.syncOverview()).pending === 0) break;
    }
    const final = await db.syncOverview();
    if (!deferred && final.pending === 0) await db.syncMarkOk();
    set({ problem: null });
    if (deferred) {
      // A record is being typed into. Try again in a moment, after it is saved.
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => void get().run(), 3000);
    }
  } catch (err) {
    if (err instanceof AccountChanged || (err instanceof Error && err.message === 'account changed')) return;
    if (err instanceof ApiError) {
      if (err.offline) return set({ problem: { kind: 'offline' } });
      if (err.status === 401) {
        await useAccount.getState().sessionEnded();
        return;
      }
      if (err.code === 'confirm_required') {
        const count = Number((err.details as { count?: number } | undefined)?.count ?? 0);
        return set({ problem: { kind: 'confirm', count } });
      }
      if (err.status === 429) return set({ problem: { kind: 'busy' } });
    }
    set({ problem: { kind: 'server' } });
  }
}

async function pushAll(account: string, confirmMassDelete?: boolean) {
  const db = getDb();
  // Within one pass, a record is sent once whatever the answer. A conflict is settled by the pull.
  const tried: string[] = [];
  for (;;) {
    guard(account);
    const batch = await db.syncPrepare(3_000_000, LIMITS.maxChangesPerPush, tried, account);
    if (batch.length === 0) return;
    const res = await api<PushResponse>('/api/v1/sync/push', {
      method: 'POST',
      body: {
        key: crypto.randomUUID(),
        changes: batch.map(({ seq: _seq, ...change }) => change),
        ...(confirmMassDelete ? { confirmMassDelete: true } : {}),
      },
    });
    const outcomes: PushOutcome[] = [];
    for (const sent of batch) {
      const r = res.results.find((x) => x.kind === sent.kind && x.id === sent.id);
      if (!r) continue;
      outcomes.push({
        ...sent,
        status: r.status,
        ...(r.status === 'rejected' ? { reason: r.reason } : { rev: r.rev }),
      });
      tried.push(key(sent.kind, sent.id));
    }
    guard(account);
    await db.syncAfterPush(outcomes, account);
  }
}

async function pullAll(set: Set, get: Get, account: string): Promise<{ deferred: boolean; changed: boolean }> {
  const db = getDb();
  let since = (await db.syncOverview()).cursor;
  let changed = false;
  let full = false;
  const seen = new Set<string>();

  for (;;) {
    const page = await api<PullResponse>(`/api/v1/sync/pull?since=${since}${full ? '&full=1' : ''}`);
    if (page.resync) {
      // This device was away longer than the server keeps deletions. Read everything and reconcile.
      full = true;
      since = 0;
      continue;
    }
    if (full) page.records.forEach((r) => seen.add(key(r.kind, r.id)));
    guard(account);
    const report = await db.syncApplyPull(page.records, page.cursor, busyKeys(), account, !full);
    if (report.changed.length || report.conflicts) changed = true;
    announce(set, get, report);
    emitRecordsChanged(report.changed);
    if (report.deferredAt !== undefined) return { deferred: true, changed };
    since = page.cursor;
    if (!page.hasMore) break;
  }
  if (full) {
    // Only a complete read may drop what the server no longer has, and only then does the cursor move.
    guard(account);
    await db.syncDropMissing([...seen]);
    await db.syncSetCursor(since);
  }
  return { deferred: false, changed };
}

function announce(set: Set, get: Get, report: ApplyReport) {
  if (!report.notices.length) return;
  const at = Date.now();
  set({ notices: [...report.notices.map((n, i) => ({ ...n, at: at + i })), ...get().notices].slice(0, 30) });
}

/** The saved preference for automatic sync. Read once when the app starts. */
export async function loadSyncPrefs() {
  const v = await getDb().getSetting(AUTO_KEY).catch(() => null);
  useSync.setState({ auto: v !== '0' });
}
