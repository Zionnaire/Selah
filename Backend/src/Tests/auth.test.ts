import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PasswordResetModel } from '../Models/passwordReset';
import { tokenService } from '../Services/token';
import { describeUserAgent } from '../Utils/userAgent';
import { app, auth, clearDb, outbox, signUp, startDb, stopDb } from './helpers';

type Rs = Awaited<ReturnType<typeof startDb>>;
let rs: Rs;

beforeAll(async () => {
  rs = await startDb();
});
afterAll(async () => {
  await stopDb(rs);
});
beforeEach(async () => {
  await clearDb();
  outbox.length = 0;
});

const tokenFrom = (text: string) => /token=([\w-]+)/.exec(text)![1]!;
const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms));

describe('sign in and tokens', () => {
  it('registers, signs in and reads the profile', async () => {
    const s = await signUp();
    const me = await request(app).get('/api/v1/auth/me').set(auth(s));
    expect(me.body.user.email).toBe('daniel@example.org');
    const login = await request(app).post('/api/v1/auth/login').send({ email: 'daniel@example.org', password: 'a-good-password-1' });
    expect(login.status).toBe(200);
  });

  it('says the same thing for a wrong password and an unknown email', async () => {
    await signUp();
    const a = await request(app).post('/api/v1/auth/login').send({ email: 'daniel@example.org', password: 'wrong-password-1' });
    const b = await request(app).post('/api/v1/auth/login').send({ email: 'nobody@example.org', password: 'wrong-password-1' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error.message).toBe(b.body.error.message);
  });

  it('rotates the refresh token and revokes the whole family if an old one is replayed', async () => {
    const s = await signUp();
    const first = await request(app).post('/api/v1/auth/refresh').set('Cookie', s.cookie);
    expect(first.status).toBe(200);
    const newCookie = (first.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;

    const replay = await request(app).post('/api/v1/auth/refresh').set('Cookie', s.cookie); // the old token
    expect(replay.status).toBe(401);
    const afterTheft = await request(app).post('/api/v1/auth/refresh').set('Cookie', newCookie); // family is dead
    expect(afterTheft.status).toBe(401);
  });
});

describe('password reset', () => {
  it('gives the same answer for an unknown email and sends nothing', async () => {
    await signUp();
    const unknown = await request(app).post('/api/v1/auth/forgot').send({ email: 'nobody@example.org' });
    expect(unknown.status).toBe(202);
    expect(unknown.body).toEqual({ ok: true });
    await wait();
    expect(outbox).toHaveLength(0);
  });

  it('emails a link to a real account, and the link works once', async () => {
    await signUp();
    const known = await request(app).post('/api/v1/auth/forgot').send({ email: 'daniel@example.org' });
    expect(known.status).toBe(202);
    await wait();
    expect(outbox).toHaveLength(1);
    expect(outbox[0]!.to).toBe('daniel@example.org');
    expect(outbox[0]!.text).toContain('30 minutes');
    expect(outbox[0]!.text).not.toMatch(/—| -- /); // house style

    const token = tokenFrom(outbox[0]!.text);
    const reset = await request(app).post('/api/v1/auth/reset').send({ token, password: 'a-new-password-9' });
    expect(reset.status).toBe(204);
    const again = await request(app).post('/api/v1/auth/reset').send({ token, password: 'another-password-9' });
    expect(again.status).toBe(400);

    const oldLogin = await request(app).post('/api/v1/auth/login').send({ email: 'daniel@example.org', password: 'a-good-password-1' });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app).post('/api/v1/auth/login').send({ email: 'daniel@example.org', password: 'a-new-password-9' });
    expect(newLogin.status).toBe(200);
  });

  it('signs the account out of every device', async () => {
    const s = await signUp();
    await request(app).post('/api/v1/auth/forgot').send({ email: s.email });
    await wait();
    await request(app).post('/api/v1/auth/reset').send({ token: tokenFrom(outbox[0]!.text), password: 'a-new-password-9' });
    const refresh = await request(app).post('/api/v1/auth/refresh').set('Cookie', s.cookie);
    expect(refresh.status).toBe(401);
  });

  it('refuses an expired link and a weak new password', async () => {
    const s = await signUp();
    await request(app).post('/api/v1/auth/forgot').send({ email: s.email });
    await wait();
    const token = tokenFrom(outbox[0]!.text);

    const weak = await request(app).post('/api/v1/auth/reset').send({ token, password: 'short' });
    expect(weak.status).toBe(422);

    await PasswordResetModel.updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    const expired = await request(app).post('/api/v1/auth/reset').send({ token, password: 'a-new-password-9' });
    expect(expired.status).toBe(400);
  });

  it('sends at most one email a minute per account, however often the form is used', async () => {
    const s = await signUp();
    for (let i = 0; i < 3; i++) {
      expect((await request(app).post('/api/v1/auth/forgot').send({ email: s.email })).status).toBe(202);
      await wait(120);
    }
    expect(outbox).toHaveLength(1);
  });

  it('asking again after the cooldown replaces the earlier link', async () => {
    const s = await signUp();
    await request(app).post('/api/v1/auth/forgot').send({ email: s.email });
    await wait(120);
    await PasswordResetModel.updateMany({}, { $set: { createdAt: new Date(Date.now() - 120_000) } });
    await request(app).post('/api/v1/auth/forgot').send({ email: s.email });
    await wait(120);
    expect(await PasswordResetModel.countDocuments()).toBe(1);
    const first = await request(app).post('/api/v1/auth/reset').send({ token: tokenFrom(outbox[0]!.text), password: 'a-new-password-9' });
    expect(first.status).toBe(400); // the first link was replaced
    const second = await request(app).post('/api/v1/auth/reset').send({ token: tokenFrom(outbox[1]!.text), password: 'a-new-password-9' });
    expect(second.status).toBe(204);
  });

  it('never stores the token itself', async () => {
    const s = await signUp();
    await request(app).post('/api/v1/auth/forgot').send({ email: s.email });
    await wait();
    const token = tokenFrom(outbox[0]!.text);
    const rows = await mongoose.connection.collection('passwordresets').find().toArray();
    expect(JSON.stringify(rows)).not.toContain(token);
  });
});

describe('devices', () => {
  it('lists signed in devices and marks this one', async () => {
    const a = await signUp();
    const second = await request(app)
      .post('/api/v1/auth/login')
      .set('User-Agent', 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Safari/604.1')
      .send({ email: a.email, password: 'a-good-password-1' });
    const list = await request(app).get('/api/v1/account/sessions').set(auth(a));
    expect(list.body.sessions).toHaveLength(2);
    expect(list.body.sessions.filter((s: { current: boolean }) => s.current)).toHaveLength(1);
    expect(list.body.sessions.map((s: { deviceName: string }) => s.deviceName)).toContain('Safari on iPad');
    expect(second.status).toBe(200);
  });

  it('renames a device and keeps the name after the token rotates', async () => {
    const a = await signUp();
    const id = (await request(app).get('/api/v1/account/sessions').set(auth(a))).body.sessions[0].id;
    const named = await request(app).patch(`/api/v1/account/sessions/${id}`).set(auth(a)).send({ name: 'Church tablet' });
    expect(named.status).toBe(204);
    await request(app).post('/api/v1/auth/refresh').set('Cookie', a.cookie);
    const list = await request(app).get('/api/v1/account/sessions').set(auth(a));
    expect(list.body.sessions[0].deviceName).toBe('Church tablet');
  });

  it('signs another device out, and that device cannot refresh', async () => {
    const a = await signUp();
    const other = await request(app).post('/api/v1/auth/login').send({ email: a.email, password: 'a-good-password-1' });
    const otherCookie = (other.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
    const sessions = (await request(app).get('/api/v1/account/sessions').set(auth(a))).body.sessions as { id: string; current: boolean }[];
    const target = sessions.find((s) => !s.current)!;
    expect((await request(app).delete(`/api/v1/account/sessions/${target.id}`).set(auth(a))).status).toBe(204);
    expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', otherCookie)).status).toBe(401);
    expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', a.cookie)).status).toBe(200); // this device unaffected
  });

  it('cannot sign out or rename a device that belongs to someone else', async () => {
    const a = await signUp();
    const b = await signUp('bob@example.org');
    const aId = (await request(app).get('/api/v1/account/sessions').set(auth(a))).body.sessions[0].id;
    expect((await request(app).delete(`/api/v1/account/sessions/${aId}`).set(auth(b))).status).toBe(404);
    expect((await request(app).patch(`/api/v1/account/sessions/${aId}`).set(auth(b)).send({ name: 'Mine now' })).status).toBe(404);
    expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', a.cookie)).status).toBe(200);
  });
});

describe('old access tokens stop working at once', () => {
  const pull = (token: string) => request(app).get('/api/v1/sync/pull').set({ Authorization: `Bearer ${token}` });

  it('after a password reset', async () => {
    const s = await signUp();
    expect((await pull(s.token)).status).toBe(200);
    await request(app).post('/api/v1/auth/forgot').send({ email: s.email });
    await wait();
    await request(app).post('/api/v1/auth/reset').send({ token: tokenFrom(outbox[0]!.text), password: 'a-new-password-9' });
    expect((await pull(s.token)).status).toBe(401); // the token was still within its 15 minutes
  });

  it('after that device is signed out', async () => {
    const a = await signUp();
    const other = await request(app).post('/api/v1/auth/login').send({ email: a.email, password: 'a-good-password-1' });
    const sessions = (await request(app).get('/api/v1/account/sessions').set(auth(a))).body.sessions as { id: string; current: boolean }[];
    const target = sessions.find((x) => !x.current)!;
    await request(app).delete(`/api/v1/account/sessions/${target.id}`).set(auth(a));
    expect((await pull(other.body.accessToken)).status).toBe(401);
    expect((await pull(a.token)).status).toBe(200);
  });

  it('after the account is deleted, and nothing is recreated for it', async () => {
    const s = await signUp();
    await request(app).delete('/api/v1/account').set(auth(s)).send({ password: 'a-good-password-1' });
    const push = await request(app).post('/api/v1/sync/push').set(auth(s)).send({
      key: 'late-push-1',
      changes: [{ kind: 'note', id: 'n', baseRev: 0, op: 'put', doc: { title: 'x', body: 'y', links: [] } }],
    });
    expect(push.status).toBe(401);
    expect(await mongoose.connection.collection('records').countDocuments()).toBe(0);
    expect(await mongoose.connection.collection('syncstates').countDocuments()).toBe(0);
  });

  it('a token with no session in it is refused', async () => {
    const s = await signUp();
    // Correctly signed, but not tied to any sign in session, so there is nothing to check it against.
    const bare = tokenService.signAccess(s.userId);
    expect((await pull(bare)).status).toBe(401);
  });
});

describe('describeUserAgent', () => {
  it('names the browser and system and never a place', () => {
    expect(describeUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36')).toBe('Chrome on Windows');
    expect(describeUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120.0')).toBe('Edge on Windows');
    expect(describeUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36')).toBe('Chrome on Android');
    expect(describeUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15')).toBe('Safari on Mac');
    expect(describeUserAgent(undefined)).toBe('Unknown device');
  });
});

describe('stay signed in', () => {
  const setCookie = (res: request.Response) => (res.headers['set-cookie'] as unknown as string[])[0]!;

  it('keeps a long lived cookie by default', async () => {
    await signUp();
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'daniel@example.org', password: 'a-good-password-1' });
    expect(setCookie(res)).toMatch(/Max-Age=/i);
  });

  it('on a shared computer the cookie ends with the browser and the session lasts at most a day, even after rotation', async () => {
    await signUp();
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'daniel@example.org', password: 'a-good-password-1', remember: false });
    expect(setCookie(res)).not.toMatch(/Max-Age=|Expires=/i);

    const cookie = setCookie(res).split(';')[0]!;
    const rotated = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(rotated.status).toBe(200);
    expect(setCookie(rotated)).not.toMatch(/Max-Age=|Expires=/i);

    const rows = await mongoose.connection.collection('refreshtokens').find({ persistent: false }).toArray();
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) expect(r.expiresAt.getTime() - Date.now()).toBeLessThan(25 * 3600 * 1000);
  });
});
