import rateLimit from 'express-rate-limit';
import { env } from '../Configs/env';

// Tests make far more requests than a person would. The limits themselves are unchanged in every other mode.
const skip = () => env.NODE_ENV === 'test';

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
});

/** Tight limit for credential endpoints to blunt password guessing. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  message: { error: { code: 'rate_limited', message: 'Too many attempts. Try again in a few minutes.' } },
});

/** Refresh runs about every 15 minutes per open tab, so it must not share the sign in counter. */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  message: { error: { code: 'rate_limited', message: 'Too many requests. Try again in a few minutes.' } },
});

/** A burst limit on top of the daily allowance, so one account cannot hammer the provider. */
export const aiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  // Per account, not per address: authenticate has already run, so many accounts behind one address do not share a burst.
  keyGenerator: (req) => `u:${(req as { userId?: string }).userId ?? 'anonymous'}`,
  validate: { ip: false },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip,
  message: { error: { code: 'rate_limited', message: 'Too many requests. Wait a moment and try again.' } },
});
