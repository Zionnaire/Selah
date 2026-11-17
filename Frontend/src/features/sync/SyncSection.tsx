import { CircleCheckBig, Clock, CloudOff, RefreshCw, TriangleAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDb } from '@/data/client';
import type { AttentionItem } from '@/data/types';
import { useAccount } from '@/store/account';
import { useSync, type SyncNotice } from '@/store/sync';
import { useSyncView, type SyncKey } from './status';

const ICON: Record<SyncKey, typeof Clock> = {
  signedOut: Clock,
  syncing: RefreshCw,
  synced: CircleCheckBig,
  waiting: Clock,
  offline: CloudOff,
  attention: TriangleAlert,
  problem: TriangleAlert,
};

const KIND_NAME = { sermon: 'Sermon', note: 'Note', study: 'Study', highlight: 'Highlight', bookmark: 'Bookmark' } as const;

/** Plain sentence for something sync decided on the person's behalf. Quiet merges are not listed. */
export function noticeText(n: SyncNotice): string {
  if (n.notice === 'kept-over-delete') {
    return `"${n.title}" was deleted on another device, but you had changed it here, so it was kept.`;
  }
  return `"${n.title}" was updated from another device.`;
}

function Attention({ items, onChange }: { items: AttentionItem[]; onChange: () => void }) {
  const { refresh, run } = useSync();
  if (!items.length) return null;
  return (
    <div className="sync-attention" role="region" aria-label="Needs your attention">
      <h3 className="card-title">Needs your attention</h3>
      <ul>
        {items.map((a) => (
          <li key={`${a.kind}:${a.id}`}>
            <div>
              <strong>{a.title}</strong>
              <span className="muted small">
                {a.type === 'conflict'
                  ? `${KIND_NAME[a.kind]} changed on this device and on another. Choose what to keep. Everything else keeps syncing.`
                  : `${a.reason ?? 'The server did not accept this change.'} It stays on this device.`}
              </span>
            </div>
            {a.type === 'conflict' ? (
              <Link className="btn btn-sm" to={`/sync/review/${a.kind}/${a.id}`}>
                Review
              </Link>
            ) : (
              <button
                className="btn btn-sm"
                onClick={async () => {
                  await getDb().syncRetry(a.kind, a.id);
                  onChange();
                  await refresh();
                  void run();
                }}
              >
                Try again
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SyncSection() {
  const status = useAccount((s) => s.status);
  const view = useSyncView();
  const { overview, running, problem, auto, notices, run, setAuto, clearNotice } = useSync();
  const [items, setItems] = useState<AttentionItem[]>([]);

  const attention = overview?.attention ?? 0;
  const load = () => void getDb().syncAttention().then(setItems).catch(() => undefined);
  useEffect(load, [attention]);

  if (status !== 'signedIn') return null;
  const Icon = ICON[view.key];
  const counts = overview?.counts;

  return (
    <section className="card" id="sync" aria-labelledby="sync-title">
      <h2 className="card-title" id="sync-title">Backup and sync</h2>

      <div className={`sync-status is-${view.key}`} role="status">
        <Icon size={20} aria-hidden className={view.key === 'syncing' ? 'spin' : undefined} />
        <div>
          <strong>{view.label}</strong>
          <span className="muted small">{view.detail}</span>
        </div>
        <button className="btn btn-sm" disabled={running || view.key === 'offline'} onClick={() => void run()}>
          <RefreshCw size={14} aria-hidden /> Sync now
        </button>
      </div>

      {problem?.kind === 'confirm' && (
        <div className="sync-confirm" role="alert">
          <p>
            This would remove {problem.count} items from your account. If that is not what you meant, do not continue. Items stay in Recently
            deleted for 30 days.
          </p>
          <button className="btn btn-danger btn-sm" onClick={() => void run({ confirmMassDelete: true })}>
            Remove {problem.count} items
          </button>
        </div>
      )}

      <Attention items={items} onChange={load} />

      {notices.length > 0 && (
        <div className="sync-notices">
          <h3 className="card-title">Earlier</h3>
          <ul>
            {notices.slice(0, 5).map((n) => (
              <li key={n.at}>
                <span>{noticeText(n)}</span>
                <button className="icon-btn" aria-label="Dismiss this message" onClick={() => clearNotice(n.at)}>
                  <X size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h3 className="card-title" style={{ marginTop: 18 }}>What syncs</h3>
      <ul className="sync-counts">
        <li><span>Sermons</span><strong>{counts?.sermon ?? 0}</strong></li>
        <li><span>Studies</span><strong>{counts?.study ?? 0}</strong></li>
        <li><span>Notes</span><strong>{counts?.note ?? 0}</strong></li>
        <li><span>Highlights</span><strong>{counts?.highlight ?? 0}</strong></li>
        <li><span>Bookmarks</span><strong>{counts?.bookmark ?? 0}</strong></li>
      </ul>
      <p className="muted small setting-note">
        Bibles, cross-references, Word Study and the dictionary are not synced. Each device downloads its own. Settings are not synced yet.
      </p>

      <label className="sync-pref">
        <div>
          <strong>Sync automatically</strong>
          <span className="muted small">Off means SELAH only syncs when you press Sync now.</span>
        </div>
        <span className="switch">
          <input type="checkbox" checked={auto} onChange={(e) => void setAuto(e.target.checked)} />
          <span aria-hidden />
        </span>
      </label>
    </section>
  );
}
