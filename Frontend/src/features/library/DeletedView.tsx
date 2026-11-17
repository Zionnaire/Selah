import { FileText, PenLine, RotateCcw, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { getDb } from '@/data/client';
import type { DeletedRow } from '@/data/types';
import { relativeTime } from '@/lib/format';

export const RETENTION_DAYS = 30;

const daysLeft = (deletedAt: number) =>
  Math.max(0, RETENTION_DAYS - Math.floor((Date.now() - deletedAt) / 86_400_000));

export function DeletedView() {
  const [rows, setRows] = useState<DeletedRow[] | null>(null);
  const [target, setTarget] = useState<DeletedRow | null>(null);

  const reload = useCallback(() => {
    void getDb().deletedItems().then(setRows);
  }, []);
  useEffect(reload, [reload]);

  const restore = async (r: DeletedRow) => {
    await getDb().restore(r.kind, r.id);
    reload();
  };

  return (
    <section className="lib-section">
      <div className="lib-head">
        <h2 className="page-title">Recently deleted</h2>
      </div>
      <p className="muted lead">
        Sermons, studies and notes stay here for {RETENTION_DAYS} days, then are removed for good. Restore anything you want back.
      </p>

      {rows === null ? (
        <div className="skeleton" style={{ height: 120 }} aria-busy="true" />
      ) : rows.length === 0 ? (
        <div className="card">
          <div className="empty">
            <div className="empty-icon"><Trash2 size={20} aria-hidden /></div>
            <h3>Nothing deleted</h3>
            <p>When you delete a sermon or a note, it waits here before it is gone.</p>
          </div>
        </div>
      ) : (
        <ul className="lib-list">
          {rows.map((r) => {
            const Icon = r.kind === 'sermon' ? PenLine : r.kind === 'study' ? Search : FileText;
            const label = r.kind === 'sermon' ? 'Sermon' : r.kind === 'study' ? 'Study' : 'Note';
            return (
              <li key={`${r.kind}:${r.id}`}>
                <Icon size={17} aria-hidden className="lib-icon" />
                <span className="lib-title">
                  <strong>{r.title.trim() || `Untitled ${label.toLowerCase()}`}</strong>
                  <small className="muted">
                    {label}, deleted {relativeTime(r.deletedAt).toLowerCase()}. Removed for good in {daysLeft(r.deletedAt)} days.
                  </small>
                </span>
                <button className="btn btn-sm" onClick={() => void restore(r)}>
                  <RotateCcw size={14} aria-hidden /> Restore
                </button>
                <button className="icon-btn" aria-label={`Delete ${r.title} forever`} onClick={() => setTarget(r)}>
                  <Trash2 size={16} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={target !== null}
        title="Delete forever?"
        body="This cannot be undone. The item is removed from this device."
        confirmLabel="Delete forever"
        onCancel={() => setTarget(null)}
        onConfirm={async () => {
          if (target) await getDb().purge(target.kind, target.id);
          setTarget(null);
          reload();
        }}
      />
    </section>
  );
}
