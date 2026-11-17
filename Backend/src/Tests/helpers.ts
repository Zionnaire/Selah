import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../app';
import { setMailer, type Mail } from '../Services/email';

/** A real MongoDB replica set in memory, so transactions behave as in production. Never the real database. */
export async function startDb() {
  const rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(rs.getUri(), { dbName: 'selah-test' });
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  return rs;
}

export async function stopDb(rs: MongoMemoryReplSet) {
  await mongoose.disconnect();
  await rs.stop();
}

export async function clearDb() {
  await Promise.all(Object.values(mongoose.models).map((m) => m.deleteMany({})));
}

/** Email is recorded, never sent. */
export const outbox: Mail[] = [];
setMailer({
  async send(m) {
    outbox.push(m);
  },
});

export const app = createApp();

export interface Signed {
  token: string;
  cookie: string;
  userId: string;
  email: string;
}

export async function signUp(email = 'daniel@example.org', password = 'a-good-password-1'): Promise<Signed> {
  const res = await request(app).post('/api/v1/auth/register').send({ name: 'Daniel', email, password });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  const cookie = (res.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
  return { token: res.body.accessToken, cookie, userId: res.body.user.id, email };
}

export const auth = (s: Signed) => ({ Authorization: `Bearer ${s.token}` });

export const sermonDoc = (title = 'Transformed', extra: Record<string, unknown> = {}) => ({
  title,
  status: 'drafting',
  targetMinutes: 30,
  sections: [{ id: 's1', title: 'Intro', minutes: 5, blocks: [{ id: 'b1', type: 'text', text: 'hello' }] }],
  ...extra,
});

let seq = 0;
export const newKey = () => `test-key-${++seq}-${Date.now()}`;
