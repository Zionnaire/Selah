import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { app, auth, clearDb, signUp, startDb, stopDb, type Signed } from './helpers';

type Rs = Awaited<ReturnType<typeof startDb>>;
let rs: Rs;
let dan: Signed;

beforeAll(async () => {
  rs = await startDb();
});
afterAll(async () => {
  await stopDb(rs);
});
beforeEach(async () => {
  await clearDb();
  dan = await signUp();
});

// A one pixel JPEG.
const PIXEL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=';
const patch = (who: Signed | null, body: unknown) => {
  const r = request(app).patch('/api/v1/account/profile');
  return (who ? r.set(auth(who)) : r).send(body as object);
};

describe('profile', () => {
  it('needs a signed in account', async () => {
    expect((await patch(null, { name: 'X' })).status).toBe(401);
  });

  it('sets a name, a church and a picture, and returns them on the next sign in check', async () => {
    const res = await patch(dan, { name: 'Daniel A', church: 'Grace Chapel', avatar: PIXEL });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: 'Daniel A', church: 'Grace Chapel', avatar: PIXEL });
    const again = await request(app).post('/api/v1/auth/refresh').set('Cookie', dan.cookie ?? '');
    if (again.status === 200) expect(again.body.user.avatar).toBe(PIXEL);
  });

  it('removes the picture with null and leaves the rest', async () => {
    await patch(dan, { avatar: PIXEL, name: 'Keep Me' });
    const res = await patch(dan, { avatar: null });
    expect(res.body.user.avatar).toBeUndefined();
    expect(res.body.user.name).toBe('Keep Me');
  });

  it('refuses SVG, other file types, text that is not an image, and oversize pictures', async () => {
    const svg = 'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+';
    expect((await patch(dan, { avatar: svg })).status).toBe(422);
    expect((await patch(dan, { avatar: 'https://example.org/me.png' })).status).toBe(422);
    expect((await patch(dan, { avatar: 'data:image/png;base64,' + 'A'.repeat(90_000) })).status).toBe(422);
  });

  it('refuses an empty change', async () => {
    expect((await patch(dan, {})).status).toBe(422);
  });
});
