import bcrypt from 'bcryptjs';
import type { LoginInput, PublicUser, RegisterInput } from '@selah/domain';
import { AppError } from '../Utils/errors';
import { userRepository } from '../Repositories/user';
import { refreshTokenRepository } from '../Repositories/refreshToken';
import type { AuthResult, UserRecord } from '../Types';
import { tokenService } from './token';

const BCRYPT_COST = 12;
// Compared against when the email is unknown, so timing does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

const toPublic = (u: UserRecord): PublicUser => ({
  id: u.id,
  name: u.name,
  email: u.email,
  church: u.church,
  avatar: u.avatar,
  createdAt: u.createdAt.toISOString(),
});

async function startSession(user: UserRecord, userAgent?: string, persistent = true): Promise<AuthResult> {
  const refresh = tokenService.newRefreshToken();
  await refreshTokenRepository.create({
    userId: user.id,
    tokenHash: refresh.hash,
    family: refresh.family,
    expiresAt: tokenService.refreshExpiry(persistent),
    userAgent,
    persistent,
  });
  return {
    user: toPublic(user),
    accessToken: tokenService.signAccess(user.id, refresh.family),
    refreshToken: refresh.token,
    persistent,
  };
}

export const authService = {
  async register(input: RegisterInput, userAgent?: string): Promise<AuthResult> {
    if (await userRepository.emailExists(input.email)) {
      throw AppError.conflict('An account with this email already exists');
    }
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      church: input.church,
      passwordHash,
    });
    return startSession(user, userAgent);
  },

  async login(input: LoginInput, userAgent?: string): Promise<AuthResult> {
    const found = await userRepository.findByEmailWithHash(input.email);
    const ok = await bcrypt.compare(input.password, found?.passwordHash ?? DUMMY_HASH);
    if (!found || !ok) throw AppError.unauthorized('Email or password is not correct');
    return startSession(found, userAgent, input.remember);
  },

  /** Rotates the refresh token. Presenting a used token revokes the whole family. */
  async refresh(rawToken: string | undefined, userAgent?: string): Promise<AuthResult> {
    if (!rawToken) throw AppError.unauthorized();
    const session = await refreshTokenRepository.findByHash(tokenService.hash(rawToken));
    if (!session) throw AppError.unauthorized();

    if (session.revokedAt || session.expiresAt < new Date()) {
      await refreshTokenRepository.revokeFamily(session.family);
      throw AppError.unauthorized('Your session has ended. Sign in again.');
    }
    if (!(await refreshTokenRepository.revoke(session.id))) {
      await refreshTokenRepository.revokeFamily(session.family);
      throw AppError.unauthorized();
    }

    const user = await userRepository.findById(session.userId);
    if (!user) throw AppError.unauthorized();

    const next = tokenService.newRefreshToken();
    await refreshTokenRepository.create({
      userId: user.id,
      tokenHash: next.hash,
      family: session.family,
      expiresAt: tokenService.refreshExpiry(session.persistent),
      userAgent,
      persistent: session.persistent,
      // A name the person gave this device survives token rotation.
      deviceName: session.deviceName,
    });
    return {
      user: toPublic(user),
      accessToken: tokenService.signAccess(user.id, session.family),
      refreshToken: next.token,
      persistent: session.persistent,
    };
  },

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const session = await refreshTokenRepository.findByHash(tokenService.hash(rawToken));
    if (session) await refreshTokenRepository.revokeFamily(session.family);
  },

  async me(userId: string): Promise<PublicUser> {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.unauthorized();
    return toPublic(user);
  },
};
