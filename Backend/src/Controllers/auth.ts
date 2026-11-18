import type { CookieOptions, Request, Response } from 'express';
import { env, isProd } from '../Configs/env';
import { authService } from '../Services/auth';
import type { AuthResult } from '../Types';

export const COOKIE = 'selah_rt';

export const cookieOptions = (persistent = true): CookieOptions => ({
  httpOnly: true,
  // SameSite=None is only accepted by browsers together with Secure.
  secure: isProd || env.COOKIE_SAME_SITE === 'none',
  sameSite: env.COOKIE_SAME_SITE,
  path: '/api/v1/auth',
  // No max age makes it a session cookie, which ends when the browser closes.
  ...(persistent ? { maxAge: env.REFRESH_TOKEN_DAYS * 86_400_000 } : {}),
});

/**
 * The native apps are not web pages, so they do not keep a cookie jar we can rely on. They say so with
 * this header and carry the refresh token themselves, in the device's secure storage. Everything else
 * about the token is the same: opaque, hashed here, rotated on every use, a reused token revokes the
 * family. A web page cannot use this path: the header forces a CORS preflight and only the web app's
 * own origin passes it.
 */
const isNative = (req: Request) => req.get('x-selah-client') === 'native';

const respond = (req: Request, res: Response, status: number, result: AuthResult) => {
  if (isNative(req)) {
    res.status(status).json({ user: result.user, accessToken: result.accessToken, refreshToken: result.refreshToken });
    return;
  }
  res.cookie(COOKIE, result.refreshToken, cookieOptions(result.persistent));
  res.status(status).json({ user: result.user, accessToken: result.accessToken });
};

/** Where this client keeps its refresh token: the request body for the apps, the cookie for the web. */
const presented = (req: Request): string | undefined => {
  if (!isNative(req)) return req.cookies?.[COOKIE];
  const t = (req.body as { refreshToken?: unknown } | undefined)?.refreshToken;
  return typeof t === 'string' && t.length <= 200 ? t : undefined;
};

const agent = (req: Request) => req.get('user-agent') ?? undefined;

/** HTTP concerns only: read the request, call the service, shape the response. */
export const authController = {
  register: async (req: Request, res: Response) =>
    respond(req, res, 201, await authService.register(req.body, agent(req))),

  login: async (req: Request, res: Response) =>
    respond(req, res, 200, await authService.login(req.body, agent(req))),

  refresh: async (req: Request, res: Response) => {
    try {
      respond(req, res, 200, await authService.refresh(presented(req), agent(req)));
    } catch (err) {
      if (!isNative(req)) res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: undefined });
      throw err;
    }
  },

  logout: async (req: Request, res: Response) => {
    await authService.logout(presented(req));
    if (!isNative(req)) res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: undefined });
    res.status(204).end();
  },

  me: async (req: Request, res: Response) => {
    res.json({ user: await authService.me(req.userId!) });
  },
};
