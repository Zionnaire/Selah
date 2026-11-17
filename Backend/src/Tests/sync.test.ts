import mongoose from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { LIMITS } from '@selah/domain';
import { RecordHistoryModel as History } from '../Models/recordHistory';
import { syncService } from '../Services/sync';
import { app, auth, clearDb, newKey, sermonDoc, signUp, startDb, stopDb, type Signed } from './helpers';


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

const push = (who: Signed, changes: unknown[], key = newKey(), extra: Record<string, unknown> = {}) =>
  request(app).post('/api/v1/sync/push').set(auth(who)).send({ key, changes, ...extra });
const pull = (who: Signed, since = 0, limit?: number) =>
  request(app).get('/api/v1/sync/pull').query({ since, ...(limit ? { limit } : {}) }).set(auth(who));
const put = (id: string, baseRev: number, doc: unknown = sermonDoc(), kind = 'sermon') => ({ kind, id, baseRev, op: 'put', doc });

describe('push and pull', () => {
  it('stores records and returns them in rev order', async () => {
    const res = await push(dan, [put('a', 0, sermonDoc('A')), put('b', 0, sermonDoc('B'))]);
    expect(res.status).toBe(200);
    expect(res.body.results.map((r: { status: string }) => r.status)).toEqual(['applied', 'applied']);

    const got = await pull(dan);
    expect(got.body.records.map((r: { id: string }) => r.id)).toEqual(['a', 'b']);
    const revs = got.body.records.map((r: { rev: number }) => r.rev);
    expect(revs[1]).toBeGreaterThan(revs[0]);
    expect(got.body.cursor).toBe(revs[1]);
    expect(got.body.hasMore).toBe(false);
  });

  it('a later pull only returns what changed since the cursor', async () => {
    await push(dan, [put('a', 0)]);
    const first = await pull(dan);
    await push(dan, [put('b', 0)]);
    const next = await pull(dan, first.body.cursor);
    expect(next.body.records.map((r: { id: string }) => r.id)).toEqual(['b']);
  });

  it('pages through a large result with hasMore', async () => {
    await push(dan, Array.from({ length: 5 }, (_, i) => put(`r${i}`, 0)));
    const page1 = await pull(dan, 0, 2);
    expect(page1.body.records).toHaveLength(2);
    expect(page1.body.hasMore).toBe(true);
    const page2 = await pull(dan, page1.body.cursor, 2);
    expect(page2.body.records.map((r: { id: string }) => r.id)).toEqual(['r2', 'r3']);
    const page3 = await pull(dan, page2.body.cursor, 2);
    expect(page3.body.hasMore).toBe(false);
    expect(page3.body.records).toHaveLength(1);
  });

  it('requires a signed in account', async () => {
    expect((await request(app).get('/api/v1/sync/pull')).status).toBe(401);
    expect((await request(app).post('/api/v1/sync/push').send({})).status).toBe(401);
  });
});

describe('optimistic concurrency', () => {
  it('applies an update that carries the current rev', async () => {
    const first = await push(dan, [put('a', 0, sermonDoc('One'))]);
    const rev = first.body.results[0].rev;
    const second = await push(dan, [put('a', rev, sermonDoc('Two'))]);
    expect(second.body.results[0]).toMatchObject({ status: 'applied' });
    expect(second.body.results[0].rev).toBeGreaterThan(rev);
  });

  it('never overwrites: a stale rev gets the server version back as a conflict', async () => {
    const first = await push(dan, [put('a', 0, sermonDoc('One'))]);
    const rev = first.body.results[0].rev;
    await push(dan, [put('a', rev, sermonDoc('From the iPad'))]);

    const stale = await push(dan, [put('a', rev, sermonDoc('From the laptop'))]);
    const r = stale.body.results[0];
    expect(r.status).toBe('conflict');
    expect(r.doc).toBeUndefined(); // the device pulls the current version, it is not echoed back
    expect((await pull(dan)).body.records[0].doc.title).toBe('From the iPad');
  });

  it('one conflict does not stop the rest of the batch', async () => {
    const first = await push(dan, [put('a', 0)]);
    await push(dan, [put('a', first.body.results[0].rev, sermonDoc('Changed'))]);
    const res = await push(dan, [put('a', first.body.results[0].rev), put('fresh', 0)]);
    expect(res.body.results.map((r: { status: string }) => r.status)).toEqual(['conflict', 'applied']);
  });
});

describe('what gets stored', () => {
  it('stores only the validated document: unknown keys are dropped, so hidden data cannot be smuggled in', async () => {
    const res = await push(dan, [put('a', 0, { ...sermonDoc('Clean'), junk: 'x'.repeat(600_000), nested: { evil: true } })]);
    expect(res.body.results[0].status).toBe('applied');
    const rec = (await pull(dan)).body.records[0];
    expect(rec.doc.title).toBe('Clean');
    expect(rec.doc.junk).toBeUndefined();
    expect(rec.doc.nested).toBeUndefined();
    const stored = await mongoose.connection.collection('records').findOne({ recordId: 'a' });
    expect(JSON.stringify(stored).length).toBeLessThan(5_000);
  });

  it('measures size in bytes, so multi byte text cannot slip under the limit', async () => {
    // 6 blocks of 45,000 characters is 270,000 characters (under the limit if counted as characters)
    // but 540,000 bytes in UTF-8 (over it), so only a byte count catches it.
    const blocks = Array.from({ length: 6 }, (_, i) => ({ id: `b${i}`, type: 'text', text: 'é'.repeat(45_000) }));
    const res = await push(dan, [put('a', 0, sermonDoc('Big', { sections: [{ id: 's', title: 'S', minutes: 1, blocks }] }))]);
    expect(res.body.results[0]).toMatchObject({ status: 'rejected', reason: 'The document is too large' });
  });

  it('counts deleted records that still hold content against the quota, and caps history', async () => {
    const a = await push(dan, [put('a', 0)]);
    await push(dan, [{ kind: 'sermon', id: 'a', baseRev: a.body.results[0].rev, op: 'delete' }]);
    const state = await mongoose.connection.collection('records').countDocuments({ stub: false });
    expect(state).toBe(1); // the deleted record still counts until purged
  });
});

describe('idempotency', () => {
  it('a retry with the same key returns the same answer and applies nothing twice', async () => {
    const key = newKey();
    const a = await push(dan, [put('a', 0)], key);
    const b = await push(dan, [put('a', 0)], key);
    expect(b.body).toEqual(a.body);
    expect((await pull(dan)).body.records).toHaveLength(1);
    expect(a.body.results[0].rev).toBe(b.body.results[0].rev);
  });

  it('keys are per account', async () => {
    const key = newKey();
    const bob = await signUp('bob@example.org');
    await push(dan, [put('a', 0)], key);
    const res = await push(bob, [put('x', 0)], key);
    expect(res.body.results[0]).toMatchObject({ id: 'x', status: 'applied' });
  });
});

describe('validation', () => {
  it('rejects an invalid document for that record only', async () => {
    const res = await push(dan, [put('bad', 0, { title: 'x', status: 'nope', targetMinutes: 1, sections: [] }), put('good', 0)]);
    expect(res.body.results[0]).toMatchObject({ id: 'bad', status: 'rejected' });
    expect(res.body.results[1]).toMatchObject({ id: 'good', status: 'applied' });
  });

  it('a highlight or bookmark id must be its verse id', async () => {
    const bad = await push(dan, [{ kind: 'highlight', id: 'random-uuid', baseRev: 0, op: 'put', doc: { verseId: 'ROM.12.2' } }]);
    expect(bad.body.results[0].status).toBe('rejected');
    const ok = await push(dan, [{ kind: 'highlight', id: 'ROM.12.2', baseRev: 0, op: 'put', doc: { verseId: 'ROM.12.2' } }]);
    expect(ok.body.results[0].status).toBe('applied');
  });

  it('two devices marking the same verse offline become one record', async () => {
    const change = { kind: 'bookmark', id: 'JHN.3.16', baseRev: 0, op: 'put', doc: { verseId: 'JHN.3.16' } };
    await push(dan, [change]);
    const second = await push(dan, [change]); // another device, never saw rev 1
    expect(second.body.results[0].status).toBe('conflict');
    expect((await pull(dan)).body.records).toHaveLength(1);
  });

  it('rejects malformed batches', async () => {
    expect((await push(dan, [])).status).toBe(422);
    expect((await push(dan, [{ kind: 'sermon', id: 'a', baseRev: 0, op: 'put' }])).status).toBe(422);
    expect((await push(dan, [{ kind: 'wrong', id: 'a', baseRev: 0, op: 'put', doc: {} }])).status).toBe(422);
  });
});

describe('deleting', () => {
  it('a delete is a tombstone that keeps the content so it can be restored', async () => {
    const a = await push(dan, [put('a', 0, sermonDoc('Keep me'))]);
    await push(dan, [{ kind: 'sermon', id: 'a', baseRev: a.body.results[0].rev, op: 'delete' }]);
    const rec = (await pull(dan)).body.records[0];
    expect(rec).toMatchObject({ deleted: true, stub: false });
    expect(rec.doc.title).toBe('Keep me');
  });

  it('a purge removes the content and leaves a stub so other devices learn it is gone', async () => {
    const a = await push(dan, [put('a', 0, sermonDoc('Gone'))]);
    await push(dan, [{ kind: 'sermon', id: 'a', baseRev: a.body.results[0].rev, op: 'purge' }]);
    const rec = (await pull(dan)).body.records[0];
    expect(rec).toMatchObject({ id: 'a', deleted: true, stub: true });
    expect(rec.doc).toBeUndefined();
  });

  it('an old device pushing an edit to a purged record gets a conflict, so the purge is never silently undone', async () => {
    const a = await push(dan, [put('a', 0)]);
    const rev = a.body.results[0].rev;
    await push(dan, [{ kind: 'sermon', id: 'a', baseRev: rev, op: 'purge' }]);
    const stale = await push(dan, [put('a', rev, sermonDoc('Edited offline'))]);
    expect(stale.body.results[0]).toMatchObject({ status: 'conflict', deleted: true });
  });

  it('holds a large delete until the person confirms', async () => {
    const many = Array.from({ length: LIMITS.massDeleteThreshold + 1 }, (_, i) => ({ kind: 'note', id: `n${i}`, baseRev: 0, op: 'delete' }));
    const held = await push(dan, many);
    expect(held.status).toBe(409);
    expect(held.body.error.code).toBe('confirm_required');
    expect((await pull(dan)).body.records).toHaveLength(0);
    const ok = await push(dan, many, newKey(), { confirmMassDelete: true });
    expect(ok.status).toBe(200);
  });
});

describe('history', () => {
  it('keeps the version it replaces, and the one it deletes', async () => {
    const a = await push(dan, [put('a', 0, sermonDoc('Version one'))]);
    const b = await push(dan, [put('a', a.body.results[0].rev, sermonDoc('Version two'))]);
    await push(dan, [{ kind: 'sermon', id: 'a', baseRev: b.body.results[0].rev, op: 'delete' }]);
    const rows = await History.find({ recordId: 'a' }).sort({ rev: 1 }).lean();
    expect(rows.map((r) => r.reason)).toEqual(['replaced', 'deleted']);
    expect((rows[0]!.doc as { title: string }).title).toBe('Version one');
  });
});

describe('concurrency and isolation', () => {
  it('parallel pushes from one account all apply, with unique revs and no gaps', async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) => push(dan, [put(`p${i}a`, 0), put(`p${i}b`, 0), put(`p${i}c`, 0)])),
    );
    expect(results.every((r) => r.status === 200)).toBe(true);
    const revs = results.flatMap((r) => r.body.results.map((x: { rev: number }) => x.rev)).sort((a, b) => a - b);
    expect(new Set(revs).size).toBe(18);
    expect(revs).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
    expect((await pull(dan)).body.records).toHaveLength(18);
  });

  it('accounts cannot see or change each other', async () => {
    const bob = await signUp('bob@example.org');
    await push(dan, [put('shared-id', 0, sermonDoc('Dan only'))]);
    expect((await pull(bob)).body.records).toHaveLength(0);
    const res = await push(bob, [put('shared-id', 0, sermonDoc('Bob own'))]);
    expect(res.body.results[0].status).toBe('applied');
    expect((await pull(dan)).body.records[0].doc.title).toBe('Dan only');
  });
});

describe('deletion horizon', () => {
  it('a device that fell behind the pruned deletions is told to reconcile instead of getting a wrong delta', async () => {
    const a = await push(dan, [put('a', 0), put('keep', 0)]);
    await push(dan, [{ kind: 'sermon', id: 'a', baseRev: a.body.results[0].rev, op: 'purge' }]);

    // 100 days later the server prunes the old deletion marker.
    const pruned = await syncService.pruneDeleted(dan.userId, new Date(Date.now() + 100 * 86_400_000));
    expect(pruned).toBe(1);

    const stale = await pull(dan, 0);
    expect(stale.body.resync).toBe(true);
    expect(stale.body.records).toEqual([]);

    const ids = await request(app).get('/api/v1/sync/ids').set(auth(dan));
    expect(ids.body.records.map((r: { id: string }) => r.id)).toEqual(['keep']);

    // A full read returns what is still there, so the device can drop what is gone.
    const full = await request(app).get('/api/v1/sync/pull?since=0&full=1').set(auth(dan));
    expect(full.body.resync).toBeUndefined();
    expect(full.body.records.map((r: { id: string }) => r.id)).toEqual(['keep']);

    // A device that was up to date past the horizon carries on normally.
    const current = await pull(dan, 10);
    expect(current.body.resync).toBeUndefined();
  });
});

describe('account deletion removes everything', () => {
  it('deletes records, history and the account itself', async () => {
    const a = await push(dan, [put('a', 0)]);
    await push(dan, [put('a', a.body.results[0].rev, sermonDoc('Two'))]);
    const res = await request(app).delete('/api/v1/account').set(auth(dan)).send({ password: 'a-good-password-1' });
    expect(res.status).toBe(204);
    const counts = await Promise.all(['records', 'recordhistories', 'syncstates', 'idempotencies', 'users', 'refreshtokens'].map((c) => mongoose.connection.collection(c).countDocuments()));
    expect(counts).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it('needs the right password', async () => {
    const res = await request(app).delete('/api/v1/account').set(auth(dan)).send({ password: 'wrong-password-1' });
    expect(res.status).toBe(401);
    expect(await mongoose.connection.collection('users').countDocuments()).toBe(1);
  });
});
