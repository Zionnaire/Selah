import { createHash, randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../Configs/env';
import type { AccessClaims } from '../Types';
import { AppError } from '../Utils/errors';

export const tokenService = {
  /** `sid` ties the access token to one sign in, so the server can tell which device is asking. */
  signAccess(userId: string, sid?: string): string {
    return jwt.sign(sid ? { sub: userId, sid } : { sub: userId }, env.JWT_ACCESS_SECRET, {
      expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions['expiresIn'],
      issuer: 'selah',
    });
  },

  verifyAccess(token: string): AccessClaims {
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'selah' });
      if (typeof payload === 'string' || !payload.sub) throw new Error('bad payload');
      return { sub: payload.sub, sid: typeof payload.sid === 'string' ? payload.sid : undefined };
    } catch {
      throw AppError.unauthorized('Your session has expired. Sign in again.');
    }
  },

  /** Opaque random token. Only its hash is persisted. */
  newRefreshToken(): { token: string; hash: string; family: string } {
    const token = randomBytes(48).toString('base64url');
    return { token, hash: tokenService.hash(token), family: randomUUID() };
  },

  /** A random single use token, for example in a password reset email. */
  newSecret(): { token: string; hash: string } {
    const token = randomBytes(32).toString('base64url');
    return { token, hash: tokenService.hash(token) };
  },

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  },

  /** 30 days when the person chose to stay signed in, one day on a shared computer. */
  refreshExpiry(persistent = true): Date {
    return new Date(Date.now() + (persistent ? env.REFRESH_TOKEN_DAYS : 1) * 86_400_000);
  },
};
