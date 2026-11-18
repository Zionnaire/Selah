import type { PublicUser } from '@selah/domain';
import * as SecureStore from 'expo-secure-store';

/**
 * Where the API lives, from EXPO_PUBLIC_API_URL (set per build profile in eas.json and EAS environment
 * variables, or in .env for local work). While developing, the Android emulator reaches the computer it
 * runs on at 10.0.2.2. A build with no address still works fully on the device, only accounts are off.
 */
const configured = process.env.EXPO_PUBLIC_API_URL ?? (__DEV__ ? 'http://10.0.2.2:4000' : '');
export const API_CONFIGURED = configured.length > 0;
const BASE = configured.replace(/\/$/, '');
const REFRESH_KEY = 'selah.refresh';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
  /** The server could not be reached, which is what offline looks like to the app. */
  get offline() {
    return this.status === 0;
  }
}

// The short lived access token stays in memory only. The long lived refresh token is kept in the device's
// secure storage (the Android Keystore, the iOS Keychain), never in the database or in plain files.
let accessToken: string | null = null;

export const setAccessToken = (t: string | null) => {
  accessToken = t;
};

interface Options {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

async function send(path: string, { method = 'GET', body, auth = true }: Options): Promise<Response> {
  if (!API_CONFIGURED) throw new ApiError(0, 'not_configured', 'Accounts are not set up in this version');
  try {
    return await fetch(`${BASE}${path}`, {
      method,
      headers: {
        // Tells the API to hand the refresh token over in the body, since an app has no dependable cookie jar.
        'X-SELAH-Client': 'native',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'offline', 'The server could not be reached');
  }
}

async function failure(res: Response): Promise<ApiError> {
  const data = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  return new ApiError(res.status, data?.error?.code ?? 'error', data?.error?.message ?? 'Something went wrong');
}

interface Session {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}

/** Keeps the tokens a sign in or a refresh returned. */
export async function keepSession(s: Session): Promise<void> {
  setAccessToken(s.accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, s.refreshToken);
}

export async function forgetSession(): Promise<void> {
  setAccessToken(null);
  await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => undefined);
}

export const hasStoredSession = async (): Promise<boolean> => !!(await SecureStore.getItemAsync(REFRESH_KEY));

let refreshing: Promise<PublicUser | null> | null = null;

/**
 * Trades the stored refresh token for a new access token. The server rotates it, so the new one is saved.
 * Only a 401 means the session ended. A busy server or no signal throws, and the person stays signed in.
 */
export function refreshSession(): Promise<PublicUser | null> {
  refreshing ??= (async () => {
    try {
      const token = await SecureStore.getItemAsync(REFRESH_KEY);
      if (!token) return null;
      const res = await send('/api/v1/auth/refresh', { method: 'POST', body: { refreshToken: token }, auth: false });
      if (res.status === 401) {
        await forgetSession();
        return null;
      }
      if (!res.ok) throw await failure(res);
      const s = (await res.json()) as Session;
      await keepSession(s);
      return s.user;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function api<T = void>(path: string, options: Options = {}): Promise<T> {
  let res = await send(path, options);
  if (res.status === 401 && options.auth !== false && (await refreshSession())) res = await send(path, options);
  if (!res.ok) throw await failure(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function signOutOnServer(): Promise<void> {
  const token = await SecureStore.getItemAsync(REFRESH_KEY);
  if (token) await send('/api/v1/auth/logout', { method: 'POST', body: { refreshToken: token }, auth: false }).catch(() => undefined);
}

/** A sentence a person can act on. */
export function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'not_configured') return 'Accounts are not switched on in this version of SELAH yet. Your work is saved on this device.';
    if (err.offline) return 'You are offline. This needs internet. Your work is still on this device.';
    if (err.status === 429) return 'Too many attempts. Try again in a few minutes.';
    if (err.status === 401) return 'Email or password is not correct.';
    if (err.status === 409) return 'An account with this email already exists.';
    if (err.status >= 500) return 'Something went wrong on our side. Try again in a moment.';
    return err.message;
  }
  return 'Something went wrong. Try again.';
}
