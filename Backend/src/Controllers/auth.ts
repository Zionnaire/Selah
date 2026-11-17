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

const respond = (res: Response, status: number, result: AuthResult) => {
  res.cookie(COOKIE, result.refreshToken, cookieOptions(result.persistent));
  res.status(status).json({ user: result.user, accessToken: result.accessToken });
};

const agent = (req: Request) => req.get('user-agent') ?? undefined;

/** HTTP concerns only: read the request, call the service, shape the response. */
export const authController = {
  register: async (req: Request, res: Response) =>
    respond(res, 201, await authService.register(req.body, agent(req))),

  login: async (req: Request, res: Response) =>
    respond(res, 200, await authService.login(req.body, agent(req))),

  refresh: async (req: Request, res: Response) => {
    try {
      respond(res, 200, await authService.refresh(req.cookies?.[COOKIE], agent(req)));
    } catch (err) {
      res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: undefined });
      throw err;
    }
  },

  logout: async (req: Request, res: Response) => {
    await authService.logout(req.cookies?.[COOKIE]);
    res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: undefined });
    res.status(204).end();
  },

  me: async (req: Request, res: Response) => {
    res.json({ user: await authService.me(req.userId!) });
  },
};
