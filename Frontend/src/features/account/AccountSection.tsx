import { Camera, LogOut, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { getDb } from '@/data/client';
import { api, ApiError } from '@/lib/api';
import { relativeTime } from '@/lib/format';
import { fileToAvatar } from '@/lib/image';
import { useSync } from '@/store/sync';
import { describeAuthError, useAccount } from '@/store/account';

interface Device {
  id: string;
  deviceName: string;
  lastActive: string;
  current: boolean;
}

function Devices() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [error, setError] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [signingOut, setSigningOut] = useState<Device | null>(null);

  const load = useCallback(() => {
    api<{ sessions: Device[] }>('/api/v1/account/sessions')
      .then((r) => (setDevices(r.sessions), setError('')))
      .catch((e) => setError(e instanceof ApiError && e.offline ? 'You are offline. Devices need internet.' : 'Could not load your devices.'));
  }, []);
  useEffect(load, [load]);

  const saveName = async (d: Device) => {
    const next = name.trim();
    setRenaming(null);
    if (!next || next === d.deviceName) return;
    await api(`/api/v1/account/sessions/${d.id}`, { method: 'PATCH', body: { name: next } }).catch(() => undefined);
    load();
  };

  return (
    <>
      <h3 className="card-title" style={{ marginTop: 18 }}>Your devices</h3>
      {error && <p className="field-error">{error}</p>}
      {devices === null && !error ? (
        <div className="skeleton" style={{ height: 70 }} aria-busy="true" />
      ) : (
        <ul className="device-list">
          {devices?.map((d) => (
            <li key={d.id}>
              <div className="device-name">
                {renaming === d.id ? (
                  <form
                    className="device-rename"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void saveName(d);
                    }}
                  >
                    <input autoFocus value={name} maxLength={60} aria-label="Device name" onChange={(e) => setName(e.target.value)} onBlur={() => void saveName(d)} />
                  </form>
                ) : (
                  <strong>
                    {d.deviceName} {d.current && <span className="chip chip-ok">This device</span>}
                  </strong>
                )}
                <span className="muted small">{d.current ? 'Active now' : `Last active ${relativeTime(Date.parse(d.lastActive)).toLowerCase()}`}</span>
              </div>
              <div className="device-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => (setRenaming(d.id), setName(d.deviceName))}>
                  Rename
                </button>
                {!d.current && (
                  <button className="btn btn-sm" onClick={() => setSigningOut(d)}>
                    Sign out
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={signingOut !== null}
        title={`Sign out ${signingOut?.deviceName ?? 'this device'}?`}
        body="That device is signed out straight away. Work saved on it stays there."
        confirmLabel="Sign out"
        onCancel={() => setSigningOut(null)}
        onConfirm={async () => {
          if (signingOut) await api(`/api/v1/account/sessions/${signingOut.id}`, { method: 'DELETE' }).catch(() => undefined);
          setSigningOut(null);
          load();
        }}
      />
    </>
  );
}

/** Deleting the account needs the password again, so it is a dialog with a field, not a plain confirm. */
function DeleteAccount() {
  const deleteAccount = useAccount((s) => s.deleteAccount);
  const ref = useRef<HTMLDialogElement>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    ref.current?.close();
    setPassword('');
    setError('');
  };

  return (
    <>
      <button className="btn btn-danger" onClick={() => ref.current?.showModal()}>
        <Trash2 size={16} aria-hidden /> Delete my account
      </button>
      <dialog ref={ref} className="dialog" onCancel={close}>
        <h2>Delete your account?</h2>
        <p className="muted">
          This removes your account and everything backed up to it. Work saved on your devices stays on them as guest work. This cannot be undone.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError('');
            try {
              await deleteAccount(password);
              close();
            } catch (err) {
              setError(err instanceof ApiError && err.status === 401 ? 'That password is not correct.' : describeAuthError(err));
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="afield" style={{ marginTop: 14 }}>
            <label htmlFor="del-pw">Enter your password to confirm</label>
            <input id="del-pw" type="password" className="ainput" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <p className="aerr" role="alert">{error}</p>}
          </div>
          <div className="dialog-actions">
            <button type="button" className="btn" onClick={close}>Cancel</button>
            <button type="submit" className="btn btn-danger" disabled={busy || !password}>
              {busy ? 'Deleting' : 'Delete account'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

/** Name, church and picture. The picture is shrunk on this device before it is sent. */
function Profile() {
  const { user, updateProfile } = useAccount();
  const file = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name ?? '');
  const [church, setChurch] = useState(user?.church ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  if (!user) return null;

  const run = async (fn: () => Promise<void>, done: string) => {
    setBusy(true);
    setError('');
    setNote('');
    try {
      await fn();
      setNote(done);
    } catch (err) {
      setError(err instanceof ApiError ? (err.offline ? 'You are offline. This needs internet.' : err.message) : err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const choose = (f: File | undefined) => {
    if (!f) return;
    void run(async () => updateProfile({ avatar: await fileToAvatar(f) }), 'Photo saved.');
    if (file.current) file.current.value = '';
  };

  const dirty = name.trim() !== user.name || church.trim() !== (user.church ?? '');

  return (
    <div className="profile">
      <div className="profile-photo">
        <Avatar name={user.name} src={user.avatar} size={72} />
        <div className="profile-photo-actions">
          <input ref={file} type="file" hidden accept="image/jpeg,image/png,image/webp" aria-label="Choose a profile picture" onChange={(e) => choose(e.target.files?.[0])} />
          <button className="btn btn-sm" disabled={busy} onClick={() => file.current?.click()}>
            <Camera size={14} aria-hidden /> {user.avatar ? 'Change photo' : 'Add a photo'}
          </button>
          {user.avatar && (
            <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void run(() => updateProfile({ avatar: null }), 'Photo removed.')}>
              Remove photo
            </button>
          )}
        </div>
      </div>
      <form
        className="profile-form"
        onSubmit={(e) => {
          e.preventDefault();
          void run(() => updateProfile({ name: name.trim(), church: church.trim() || null }), 'Saved.');
        }}
      >
        <div className="afield">
          <label htmlFor="pf-name">Name</label>
          <input id="pf-name" className="ainput" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="afield">
          <label htmlFor="pf-church">Church or ministry</label>
          <input id="pf-church" className="ainput" value={church} maxLength={120} onChange={(e) => setChurch(e.target.value)} />
        </div>
        <p className="muted small">{user.email}</p>
        <button className="btn btn-sm" type="submit" disabled={busy || !dirty || !name.trim()}>
          Save
        </button>
      </form>
      {error && <p className="field-error" role="alert">{error}</p>}
      {note && <p className="muted small" role="status">{note}</p>}
    </div>
  );
}

/** Signing out keeps the work on this device, hidden. On a shared computer the person can remove it instead. */
function SignOut() {
  const signOut = useAccount((s) => s.signOut);
  const user = useAccount((s) => s.user);
  const pending = useSync((s) => s.overview?.pending ?? 0);
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);

  const out = async (removeWork: boolean) => {
    setBusy(true);
    try {
      if (removeWork && user) {
        // Try to back up first, so little is left unsent. What cannot be sent stays, hidden.
        await useSync.getState().run().catch(() => undefined);
        await getDb().syncRemoveCopy(user.id);
      }
      ref.current?.close();
      await signOut();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button className="btn" onClick={() => ref.current?.showModal()}>
        <LogOut size={16} aria-hidden /> Sign out of this device
      </button>
      <dialog ref={ref} className="dialog" onCancel={() => ref.current?.close()}>
        <h2>Sign out of this device?</h2>
        <p className="muted">
          Your work stays on this device, hidden until you sign in again. Nobody who opens SELAH here will see it.
          {pending > 0 ? ` ${pending} ${pending === 1 ? 'change has' : 'changes have'} not been backed up yet and will be sent when you sign in.` : ''}
        </p>
        <div className="offer-choices">
          <button className="btn btn-primary" disabled={busy} onClick={() => void out(false)} autoFocus>
            Sign out
          </button>
          <button className="btn" disabled={busy} onClick={() => void out(true)}>
            Sign out and remove my work from this device
          </button>
          <button className="btn btn-ghost" disabled={busy} onClick={() => ref.current?.close()}>
            Cancel
          </button>
        </div>
        <p className="muted small">Removing only takes what is already backed up. It is still in your account.</p>
      </dialog>
    </>
  );
}

export function AccountSection() {
  const { status, user } = useAccount();
  const location = useLocation();

  if (status !== 'signedIn' || !user) {
    return (
      <section className="card" id="account">
        <h2 className="card-title">Account</h2>
        <p className="muted small setting-note">
          You are using SELAH as a guest. Your work is saved on this device only. An account adds a backup and the same work on every device.
        </p>
        <div className="actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="btn btn-primary" to="/create-account" state={{ from: location.pathname }}>Create account</Link>
          <Link className="btn" to="/sign-in" state={{ from: location.pathname }}>Sign in</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="card" id="account">
      <h2 className="card-title">Account</h2>
      <Profile />
      <Devices />
      <div className="danger-zone">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <SignOut />
          <DeleteAccount />
        </div>
        <p className="muted small" style={{ marginTop: 8 }}>Signing out never deletes work on this device.</p>
      </div>
    </section>
  );
}
