import type { PublicUser } from '@selah/domain';

/** Where the API lives. Set VITE_API_URL at build time for a deployment. */
const BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
  /** The server could not be reached, which is what offline looks like to the app. */
  get offline() {
    return this.status === 0;
  }
}

// The short lived access token stays in memory only. It is never written to storage, so a script
// that reads storage cannot steal it. The long lived refresh token is an httpOnly cookie.
let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => {
  accessToken = t;
};
export const hasAccessToken = () => accessToken !== null;

interface Options {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Send the access token and refresh it once if it has expired. */
  auth?: boolean;
}

async function send(path: string, { method = 'GET', body, auth = true }: Options): Promise<Response> {
  try {
    return await fetch(`${BASE}${path}`, {
      method,
      credentials: 'include',
      headers: {
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
  const data = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string; details?: unknown } } | null;
  return new ApiError(res.status, data?.error?.code ?? 'error', data?.error?.message ?? 'Something went wrong', data?.error?.details);
}

let refreshing: Promise<PublicUser | null> | null = null;

/** Asks for a new access token using the cookie. Concurrent callers share one request. */
export function refreshSession(): Promise<PublicUser | null> {
  refreshing ??= (async () => {
    try {
      const res = await send('/api/v1/auth/refresh', { method: 'POST', auth: false });
      if (res.status === 401) {
        setAccessToken(null);
        return null;
      }
      // A busy or failing server is not the same as a session that ended. Stay as we are and try later.
      if (!res.ok) throw await failure(res);
      const data = (await res.json()) as { user: PublicUser; accessToken: string };
      setAccessToken(data.accessToken);
      return data.user;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function api<T = void>(path: string, options: Options = {}): Promise<T> {
  let res = await send(path, options);
  if (res.status === 401 && options.auth !== false && (await refreshSession())) {
    res = await send(path, options);
  }
  if (!res.ok) throw await failure(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
