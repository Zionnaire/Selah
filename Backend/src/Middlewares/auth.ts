import type { RequestHandler } from 'express';
import { refreshTokenRepository } from '../Repositories/refreshToken';
import { tokenService } from '../Services/token';
import { AppError } from '../Utils/errors';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      /** The sign in session of this request, so "this device" can be told from the others. */
      sessionId?: string;
    }
  }
}

/**
 * Verifies the access token AND that the sign in it belongs to is still live. A signature alone is
 * not enough: after a password reset, a device sign out or an account deletion, an old token must
 * stop working at once instead of lingering until it expires.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw AppError.unauthorized();
    const claims = tokenService.verifyAccess(header.slice(7));
    if (!claims.sid || !(await refreshTokenRepository.isFamilyLive(claims.sub, claims.sid))) {
      throw AppError.unauthorized('Your session has ended. Sign in again.');
    }
    req.userId = claims.sub;
    req.sessionId = claims.sid;
    next();
  } catch (err) {
    next(err);
  }
};
