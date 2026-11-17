import { UserModel } from '../Models/user';
import type { UserRecord, UserWithHash } from '../Types';

type Raw = {
  _id: { toString(): string };
  name: string;
  email: string;
  church?: string | null;
  avatar?: string | null;
  createdAt: Date;
  passwordHash?: string;
};

const toRecord = (u: Raw): UserRecord => ({
  id: u._id.toString(),
  name: u.name,
  email: u.email,
  church: u.church ?? undefined,
  avatar: u.avatar ?? undefined,
  createdAt: u.createdAt,
});

/** Data access only. No business rules live here. */
export const userRepository = {
  async create(input: { name: string; email: string; passwordHash: string; church?: string }) {
    const doc = await UserModel.create(input);
    return toRecord(doc as unknown as Raw);
  },

  /** Sets the given fields. A null removes the value. */
  async updateProfile(id: string, patch: { name?: string; church?: string | null; avatar?: string | null }): Promise<UserRecord | null> {
    const set: Record<string, string> = {};
    const unset: Record<string, 1> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) continue;
      if (v === null || v === '') unset[k] = 1;
      else set[k] = v;
    }
    const doc = await UserModel.findByIdAndUpdate(
      id,
      { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { new: true },
    ).lean<Raw>();
    return doc ? toRecord(doc) : null;
  },

  async findById(id: string): Promise<UserRecord | null> {
    const doc = await UserModel.findById(id).lean<Raw>();
    return doc ? toRecord(doc) : null;
  },

  async findByEmail(email: string): Promise<UserRecord | null> {
    const doc = await UserModel.findOne({ email }).lean<Raw>();
    return doc ? toRecord(doc) : null;
  },

  async findByEmailWithHash(email: string): Promise<UserWithHash | null> {
    const doc = await UserModel.findOne({ email }).select('+passwordHash').lean<Raw>();
    return doc ? { ...toRecord(doc), passwordHash: doc.passwordHash! } : null;
  },

  async findByIdWithHash(id: string): Promise<UserWithHash | null> {
    const doc = await UserModel.findById(id).select('+passwordHash').lean<Raw>();
    return doc ? { ...toRecord(doc), passwordHash: doc.passwordHash! } : null;
  },

  async emailExists(email: string): Promise<boolean> {
    return (await UserModel.exists({ email })) !== null;
  },

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await UserModel.updateOne({ _id: id }, { $set: { passwordHash } });
  },

  async deleteById(id: string): Promise<void> {
    await UserModel.deleteOne({ _id: id });
  },
};
