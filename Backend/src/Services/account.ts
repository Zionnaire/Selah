import type { PublicUser, UpdateProfileInput } from '@selah/domain';
import bcrypt from 'bcryptjs';
import { env } from '../Configs/env';
import { aiUsageRepository } from '../Repositories/aiUsage';
import { passwordResetRepository } from '../Repositories/passwordReset';
import { refreshTokenRepository } from '../Repositories/refreshToken';
import { syncRepository } from '../Repositories/sync';
import { userRepository } from '../Repositories/user';
import type { SessionInfo } from '../Types';
import { AppError } from '../Utils/errors';
import { logger } from '../Utils/logger';
import { describeUserAgent } from '../Utils/userAgent';
import { mailer, passwordResetEmail } from './email';
import { tokenService } from './token';

const BCRYPT_COST = 12;
const RESET_MINUTES = 30;
const RESEND_COOLDOWN_MS = 60_000;

export const accountService = {
  async updateProfile(userId: string, patch: UpdateProfileInput): Promise<PublicUser> {
    const user = await userRepository.updateProfile(userId, patch);
    if (!user) throw AppError.unauthorized();
    return { id: user.id, name: user.name, email: user.email, church: user.church, avatar: user.avatar, createdAt: user.createdAt.toISOString() };
  },

  /**
   * Always succeeds from the caller's point of view, so the answer never reveals whether an email
   * has an account. The email is sent in the background, so response time does not reveal it either.
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);
    if (!user) return;
    // Everything else runs in the background, so a known address does not answer measurably slower.
    void (async () => {
      try {
        // One email a minute per account, so the form cannot be used to flood someone's inbox.
        if (await passwordResetRepository.recentlyRequested(user.id, RESEND_COOLDOWN_MS)) return;
        const secret = tokenService.newSecret();
        await passwordResetRepository.create({
          userId: user.id,
          tokenHash: secret.hash,
          expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000),
        });
        const link = `${env.CLIENT_ORIGIN}/reset-password?token=${secret.token}`;
        await mailer.send(passwordResetEmail(user.email, link));
      } catch (err) {
        logger.error({ err }, 'Could not send the reset email');
      }
    })();
  },

  /** A link works once. Finishing signs the account out of every device. */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const userId = await passwordResetRepository.consume(tokenService.hash(token));
    if (!userId) throw AppError.badRequest('This link has expired or was already used. Ask for a new one.');
    await userRepository.updatePassword(userId, await bcrypt.hash(newPassword, BCRYPT_COST));
    await refreshTokenRepository.revokeAllForUser(userId);
  },

  async sessions(userId: string, currentSid?: string): Promise<SessionInfo[]> {
    const live = await refreshTokenRepository.liveSessions(userId);
    return live.map((s) => ({
      id: s.family,
      deviceName: s.deviceName ?? describeUserAgent(s.userAgent),
      lastActive: s.lastActive.toISOString(),
      current: s.family === currentSid,
    }));
  },

  /** Signs one device out. Only the account's own devices can be named. */
  async signOutDevice(userId: string, family: string): Promise<void> {
    if (!(await refreshTokenRepository.revokeUserFamily(userId, family))) throw AppError.notFound('That device is not signed in');
  },

  async renameDevice(userId: string, family: string, name: string): Promise<void> {
    if (!(await refreshTokenRepository.renameFamily(userId, family, name.trim().slice(0, 60)))) {
      throw AppError.notFound('That device was not found');
    }
  },

  /**
   * Removes the account and everything on the server: records, their history, tokens and sync state.
   * Devices keep their local work as guest work, they are never wiped.
   */
  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await userRepository.findByIdWithHash(userId);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw AppError.unauthorized('That password is not correct');
    await Promise.all([
      syncRepository.deleteEverythingFor(userId),
      aiUsageRepository.deleteFor(userId),
      refreshTokenRepository.deleteAllForUser(userId),
      passwordResetRepository.deleteAllForUser(userId),
    ]);
    await userRepository.deleteById(userId);
  },
};
