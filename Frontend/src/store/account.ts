import type { LoginInput, PublicUser, RegisterInput, UpdateProfileInput } from '@selah/domain';
import { create } from 'zustand';
import { getDb } from '@/data/client';
import { api, ApiError, refreshSession, setAccessToken } from '@/lib/api';
import { clearOfferSnooze } from '@/lib/offerSnooze';

const HINT = 'selah.account';

/** Only a hint that this device was signed in, and who. Never a token. */
const readHint = (): PublicUser | null => {
  try {
    const raw = localStorage.getItem(HINT);
    return raw ? (JSON.parse(raw) as PublicUser) : null;
  } catch {
    return null;
  }
};
/** Who this device last had signed in. Read at start so the data layer knows who may see what. */
export const readHintId = (): string | null => readHint()?.id ?? null;

const writeHint = (u: PublicUser | null) => {
  try {
    if (u) localStorage.setItem(HINT, JSON.stringify(u));
    else localStorage.removeItem(HINT);
  } catch {
    /* storage may be blocked, the app still works as a guest */
  }
};

interface AccountState {
  /** unknown only until the first check ends. guest is the default and fully supported. */
  status: 'unknown' | 'guest' | 'signedIn';
  user: PublicUser | null;
  init: () => Promise<void>;
  signIn: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  updateProfile: (patch: UpdateProfileInput) => Promise<void>;
  /** The server ended this session (for example from another device). Work on the device is untouched. */
  sessionEnded: () => Promise<void>;
}

let started = false;

export const useAccount = create<AccountState>((set) => ({
  status: 'unknown',
  user: null,

  async init() {
    if (started) return;
    started = true;
    const hint = readHint();
    if (!hint) return set({ status: 'guest' });

    // Show who this is straight away, so the app is right even offline, then confirm quietly.
    set({ status: 'signedIn', user: hint });
    try {
      const user = await refreshSession();
      if (user) {
        writeHint(user);
        set({ user });
      } else {
        // The server said this session ended. Work on the device is untouched.
        writeHint(null);
        await getDb().setAccount(null);
        set({ status: 'guest', user: null });
      }
    } catch {
      /* offline: stay as we are */
    }
  },

  async signIn(input) {
    const data = await api<{ user: PublicUser; accessToken: string }>('/api/v1/auth/login', { method: 'POST', body: input, auth: false });
    setAccessToken(data.accessToken);
    writeHint(data.user);
    await getDb().setAccount(data.user.id);
    clearOfferSnooze(data.user.id);
    set({ status: 'signedIn', user: data.user });
  },

  async register(input) {
    const data = await api<{ user: PublicUser; accessToken: string }>('/api/v1/auth/register', { method: 'POST', body: input, auth: false });
    setAccessToken(data.accessToken);
    writeHint(data.user);
    await getDb().setAccount(data.user.id);
    clearOfferSnooze(data.user.id);
    set({ status: 'signedIn', user: data.user });
  },

  async signOut() {
    // Signing out never deletes work on this device. If the server cannot be reached the session
    // there simply ends on its own, so we sign out here regardless.
    await api('/api/v1/auth/logout', { method: 'POST', auth: false }).catch(() => undefined);
    setAccessToken(null);
    writeHint(null);
    await getDb().setAccount(null);
    set({ status: 'guest', user: null });
  },

  async deleteAccount(password) {
    const id = useAccount.getState().user?.id;
    await api('/api/v1/account', { method: 'DELETE', body: { password } });
    setAccessToken(null);
    writeHint(null);
    // The account and its server copy are gone. What is on this device stays, as guest work.
    if (id) await getDb().syncDetach(id);
    await getDb().setAccount(null);
    set({ status: 'guest', user: null });
  },

  async updateProfile(patch) {
    const data = await api<{ user: PublicUser }>('/api/v1/account/profile', { method: 'PATCH', body: patch });
    writeHint(data.user);
    set({ user: data.user });
  },

  async sessionEnded() {
    setAccessToken(null);
    writeHint(null);
    await getDb().setAccount(null);
    set({ status: 'guest', user: null });
  },
}));

/** A sentence a person can act on for an error from the account endpoints. */
export function describeAuthError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.offline) return 'You are offline. This needs internet. Your work is still on this device.';
    if (err.status === 429) return 'Too many attempts. Try again in a few minutes.';
    if (err.status === 401) return 'Email or password is not correct.';
    if (err.status === 409) return 'An account with this email already exists.';
    if (err.status >= 500) return 'Something went wrong on our side. Try again in a moment.';
    return err.message;
  }
  return 'Something went wrong. Try again.';
}
