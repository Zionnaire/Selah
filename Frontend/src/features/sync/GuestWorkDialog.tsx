import { CloudUpload, HardDrive } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { GuestWork } from '@/data/types';
import { useSync } from '@/store/sync';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The lines that say what is on the device, for the offer. Empty kinds are left out. */
export function guestLines(g: GuestWork): string[] {
  return [
    g.sermons && plural(g.sermons, 'sermon', 'sermons'),
    g.studies && plural(g.studies, 'study', 'studies'),
    g.notes && plural(g.notes, 'note', 'notes'),
    g.highlights && plural(g.highlights, 'highlighted verse', 'highlighted verses'),
    g.bookmarks && plural(g.bookmarks, 'bookmark', 'bookmarks'),
  ].filter((x): x is string => !!x);
}

/**
 * Work done as a guest, offered to the account. Adding is the default and removes nothing.
 * Keeping it on this device only leaves it unsynced. Not now changes nothing and asks again next time.
 */
export function GuestWorkDialog({ guest }: { guest: GuestWork }) {
  const ref = useRef<HTMLDialogElement>(null);
  const adopt = useSync((s) => s.adopt);
  const dismiss = useSync((s) => s.dismissOffer);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  const choose = async (mode: 'add' | 'keep') => {
    setBusy(true);
    try {
      await adopt(mode);
      dismiss();
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog ref={ref} className="dialog sync-offer" aria-labelledby="offer-title" onCancel={(e) => (e.preventDefault(), dismiss())}>
      <h2 id="offer-title">Add your work to this account?</h2>
      <p className="muted">This device has work from before you signed in.</p>
      <ul className="offer-list">
        {guestLines(guest).map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <p className="muted small">
        Downloaded Bibles and other offline data are not uploaded. Neither choice deletes anything on this device or on your account.
      </p>
      <div className="offer-choices">
        <button className="btn btn-primary" disabled={busy} onClick={() => void choose('add')} autoFocus>
          <CloudUpload size={16} aria-hidden /> Add it to my account
        </button>
        <button className="btn" disabled={busy} onClick={() => void choose('keep')}>
          <HardDrive size={16} aria-hidden /> Keep it on this device only
        </button>
        <button className="btn btn-ghost" disabled={busy} onClick={dismiss}>
          Not now
        </button>
      </div>
    </dialog>
  );
}
