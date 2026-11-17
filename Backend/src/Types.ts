import type { PublicUser, RecordKind } from '@selah/domain';

/** Plain user data handed out by the repository. Never a Mongoose document. */
export interface UserRecord {
  id: string;
  name: string;
  email: string;
  church?: string;
  avatar?: string;
  createdAt: Date;
}

export interface UserWithHash extends UserRecord {
  passwordHash: string;
}

/** One refresh token. Tokens from one sign in share a family. */
export interface SessionRecord {
  id: string;
  userId: string;
  family: string;
  expiresAt: Date;
  revokedAt?: Date;
  deviceName?: string;
  persistent: boolean;
}

export interface AccessClaims {
  sub: string;
  /** The sign in session (refresh token family) this access token belongs to. */
  sid?: string;
}

/** A synced record as the server holds it. */
export interface StoredRecord {
  kind: RecordKind;
  id: string;
  rev: number;
  doc?: unknown;
  deleted: boolean;
  /** The content was purged. Only the id and the fact it is gone remain. */
  stub: boolean;
}

/** One signed in device, for the Sync settings screen. */
export interface SessionInfo {
  id: string;
  deviceName: string;
  lastActive: string;
  current: boolean;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  /** Whether the cookie should outlast the browser session. */
  persistent: boolean;
}
