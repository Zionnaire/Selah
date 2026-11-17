import type { Request, Response } from 'express';
import { accountService } from '../Services/account';
import { COOKIE, cookieOptions } from './auth';

/** HTTP only. The rules live in the account service. */
export const accountController = {
  updateProfile: async (req: Request, res: Response) => {
    res.json({ user: await accountService.updateProfile(req.userId!, req.body) });
  },

  forgot: async (req: Request, res: Response) => {
    await accountService.requestPasswordReset(req.body.email);
    // The same answer whether or not the address has an account.
    res.status(202).json({ ok: true });
  },

  reset: async (req: Request, res: Response) => {
    await accountService.resetPassword(req.body.token, req.body.password);
    res.status(204).end();
  },

  sessions: async (req: Request, res: Response) => {
    res.json({ sessions: await accountService.sessions(req.userId!, req.sessionId) });
  },

  signOutDevice: async (req: Request, res: Response) => {
    await accountService.signOutDevice(req.userId!, String(req.params.id));
    res.status(204).end();
  },

  renameDevice: async (req: Request, res: Response) => {
    await accountService.renameDevice(req.userId!, String(req.params.id), req.body.name);
    res.status(204).end();
  },

  deleteAccount: async (req: Request, res: Response) => {
    await accountService.deleteAccount(req.userId!, req.body.password);
    res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: undefined });
    res.status(204).end();
  },
};
