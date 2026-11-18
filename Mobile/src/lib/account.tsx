import type { LoginInput, PublicUser, RegisterInput } from '@selah/domain';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getSetting, setSetting } from '@/data/settings';
import { api, forgetSession, hasStoredSession, keepSession, refreshSession, signOutOnServer } from './api';

interface AccountValue {
  /** unknown only until the first check ends. guest is the default and fully supported. */
  status: 'unknown' | 'guest' | 'signedIn';
  user: PublicUser | null;
  signIn: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AccountValue | null>(null);

interface AuthResponse {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

/** Who is using SELAH. As with the web app, an account is offered, never required. */
export function AccountProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AccountValue['status']>('unknown');
  const [user, setUser] = useState<PublicUser | null>(null);

  const remember = useCallback(async (u: PublicUser | null) => {
    await setSetting('account', u ? JSON.stringify(u) : '');
    setUser(u);
    setStatus(u ? 'signedIn' : 'guest');
  }, []);

  useEffect(() => {
    void (async () => {
      if (!(await hasStoredSession())) return setStatus('guest');
      // Show who this is straight away, so the app is right with no signal, then confirm quietly.
      const hint = await getSetting('account');
      if (hint) {
        try {
          setUser(JSON.parse(hint) as PublicUser);
          setStatus('signedIn');
        } catch {
          /* a damaged hint is ignored */
        }
      }
      try {
        const fresh = await refreshSession();
        await remember(fresh);
      } catch {
        /* offline or a busy server: stay as we are */
        if (!hint) setStatus('guest');
      }
    })();
  }, [remember]);

  const value = useMemo<AccountValue>(
    () => ({
      status,
      user,
      async signIn(input) {
        const s = await api<AuthResponse>('/api/v1/auth/login', { method: 'POST', body: { ...input, remember: true }, auth: false });
        await keepSession(s);
        await remember(s.user);
      },
      async register(input) {
        const s = await api<AuthResponse>('/api/v1/auth/register', { method: 'POST', body: input, auth: false });
        await keepSession(s);
        await remember(s.user);
      },
      async signOut() {
        // Signing out never deletes work on this device.
        await signOutOnServer();
        await forgetSession();
        await remember(null);
      },
    }),
    [status, user, remember],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount(): AccountValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAccount needs an AccountProvider');
  return v;
}
