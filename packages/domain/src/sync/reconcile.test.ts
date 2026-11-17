import { describe, expect, it } from 'vitest';
import type { NoteDoc } from '../note';
import type { Section, SermonDoc } from '../sermon';
import { droppedByServer, reconcile, type LocalRecord, type Remote } from './reconcile';

const sec = (id: string, text: string): Section => ({ id, title: id, minutes: 5, blocks: [{ id: `${id}b`, type: 'text', text }] });
const sermon = (sections: Section[], title = 'Transformed'): SermonDoc => ({ title, status: 'drafting', targetMinutes: 30, sections });
const local = (over: Partial<LocalRecord> = {}): LocalRecord => ({
  doc: sermon([sec('a', 'one')]),
  deleted: false,
  stub: false,
  dirty: false,
  rev: 5,
  base: null,
  ...over,
});
const remote = (over: Partial<Remote> = {}): Remote => ({
  kind: 'sermon',
  rev: 9,
  deleted: false,
  stub: false,
  doc: sermon([sec('a', 'one')]),
  ...over,
});

describe('reconcile: nothing to do', () => {
  it('ignores a record this device already has, including an echo of its own push', () => {
    expect(reconcile('sermon', local({ rev: 9 }), remote()).action).toBe('none');
    expect(reconcile('sermon', local({ rev: 12, dirty: true }), remote()).action).toBe('none');
  });
  it('ignores a purged record it never had', () => {
    expect(reconcile('sermon', null, remote({ stub: true, doc: undefined })).action).toBe('none');
  });
});

describe('reconcile: a record this device does not have, or has not changed', () => {
  it('takes a new record, including a deleted one so it can be restored', () => {
    expect(reconcile('sermon', null, remote())).toMatchObject({ action: 'take', deleted: false, rev: 9 });
    expect(reconcile('sermon', null, remote({ deleted: true }))).toMatchObject({ action: 'take', deleted: true });
  });
  it('replaces an unchanged local copy', () => {
    const r = reconcile('sermon', local(), remote({ doc: sermon([sec('a', 'changed elsewhere')]) }));
    expect(r).toMatchObject({ action: 'take', rev: 9 });
  });
  it('removes an unchanged local copy that was purged elsewhere', () => {
    expect(reconcile('sermon', local(), remote({ stub: true, doc: undefined })).action).toBe('remove');
  });
});

describe('reconcile: changed on this device too', () => {
  const base = { doc: sermon([sec('a', 'one')]), deleted: false };

  it('merges changes to different sections and pushes the result', () => {
    const l = local({ dirty: true, base, doc: sermon([sec('a', 'one'), sec('b', 'mine')]) });
    const r = remote({ doc: sermon([sec('a', 'one'), sec('c', 'theirs')]) });
    const out = reconcile('sermon', l, r);
    expect(out.action).toBe('merged');
    if (out.action === 'merged') {
      expect((out.doc as SermonDoc).sections.map((s) => s.id).sort()).toEqual(['a', 'b', 'c']);
      expect(out.rev).toBe(9);
      expect(out.before).toBe(l.doc);
    }
  });

  it('takes the server copy when the local edit is the same as the server edit', () => {
    const same = sermon([sec('a', 'same')]);
    expect(reconcile('sermon', local({ dirty: true, base, doc: same }), remote({ doc: same })).action).toBe('take');
  });

  it('reports a conflict when the same text changed on both, and leaves the local copy alone', () => {
    const l = local({ dirty: true, base, doc: sermon([sec('a', 'mine')]) });
    const out = reconcile('sermon', l, remote({ doc: sermon([sec('a', 'theirs')]) }));
    expect(out.action).toBe('conflict');
    if (out.action === 'conflict') expect(out.rev).toBe(9);
  });

  it('keeps a local edit over a delete on the server', () => {
    const out = reconcile('sermon', local({ dirty: true, base, doc: sermon([sec('a', 'edited')]) }), remote({ deleted: true }));
    expect(out).toMatchObject({ action: 'keep', rev: 9, notice: 'kept-over-delete' });
  });

  it('keeps a local edit over a purge on the server', () => {
    const out = reconcile('sermon', local({ dirty: true, base, doc: sermon([sec('a', 'edited')]) }), remote({ stub: true, doc: undefined }));
    expect(out).toMatchObject({ action: 'keep', notice: 'kept-over-delete' });
  });

  it('lets a local delete stand when the other device did not touch the record', () => {
    const out = reconcile('sermon', local({ dirty: true, deleted: true, base }), remote({ doc: base.doc }));
    expect(out).toMatchObject({ action: 'keep', rev: 9 });
  });

  it('restores a locally deleted record when the other device edited it', () => {
    const out = reconcile('sermon', local({ dirty: true, deleted: true, base }), remote({ doc: sermon([sec('a', 'edited elsewhere')]) }));
    expect(out).toMatchObject({ action: 'take', deleted: false });
  });

  it('agrees when both devices deleted it', () => {
    expect(reconcile('sermon', local({ dirty: true, deleted: true, base }), remote({ deleted: true })).action).toBe('take');
    expect(reconcile('sermon', local({ dirty: true, deleted: true, base }), remote({ stub: true, doc: undefined })).action).toBe('remove');
  });

  it('keeps a pending delete forever and finishes it', () => {
    expect(reconcile('sermon', local({ dirty: true, stub: true, deleted: true }), remote()).action).toBe('keep');
    expect(reconcile('sermon', local({ dirty: true, stub: true, deleted: true }), remote({ stub: true, doc: undefined })).action).toBe('remove');
  });

  it('with no base, merges what it can and never drops a local section', () => {
    const l = local({ dirty: true, base: null, doc: sermon([sec('a', 'one'), sec('b', 'mine')]) });
    const out = reconcile('sermon', l, remote({ doc: sermon([sec('a', 'one')]) }));
    expect(out.action).toBe('merged');
    if (out.action === 'merged') expect((out.doc as SermonDoc).sections.map((s) => s.id)).toContain('b');
  });
});

describe('reconcile: notes', () => {
  const note = (body: string, title = 'T'): NoteDoc => ({ title, body, links: [] });
  it('conflicts when the body changed on both devices', () => {
    const out = reconcile(
      'note',
      local({ dirty: true, doc: note('mine'), base: { doc: note('start'), deleted: false } }),
      remote({ kind: 'note', doc: note('theirs') }),
    );
    expect(out.action).toBe('conflict');
  });
  it('merges a title change with a body change', () => {
    const out = reconcile(
      'note',
      local({ dirty: true, doc: note('start', 'New title'), base: { doc: note('start'), deleted: false } }),
      remote({ kind: 'note', doc: note('theirs') }),
    );
    expect(out.action).toBe('merged');
    if (out.action === 'merged') expect(out.doc).toMatchObject({ title: 'New title', body: 'theirs' });
  });
});

describe('reconcile: highlights and bookmarks', () => {
  const mark = { verseId: 'ROM.12.2' };
  const m = (over: Partial<LocalRecord> = {}) => local({ doc: mark, ...over });
  const r = (over: Partial<Remote> = {}) => remote({ kind: 'highlight', doc: mark, ...over });
  const present = { doc: mark, deleted: false };
  const absent = { doc: mark, deleted: true };

  it('keeps a removal made here when the other device did not change the mark', () => {
    expect(reconcile('highlight', m({ dirty: true, deleted: true, base: present }), r())).toMatchObject({ action: 'keep' });
  });
  it('a re-add here beats a removal there, since nothing is lost that way', () => {
    expect(reconcile('highlight', m({ dirty: true, base: absent }), r({ deleted: true }))).toMatchObject({ action: 'keep' });
  });
  it('a removal there is taken when this device did not change the mark', () => {
    expect(reconcile('highlight', m(), r({ deleted: true }))).toMatchObject({ action: 'take', deleted: true });
  });
  it('both marked it: settled', () => {
    expect(reconcile('highlight', m({ dirty: true, base: absent }), r()).action).toBe('take');
  });
  it('removing here and removing there is settled', () => {
    expect(reconcile('highlight', m({ dirty: true, deleted: true, base: present }), r({ deleted: true })).action).toBe('take');
  });
});

describe('droppedByServer', () => {
  it('removes only what was backed up and not changed since', () => {
    expect(droppedByServer({ rev: 4, dirty: false })).toBe('remove');
    expect(droppedByServer({ rev: 4, dirty: true })).toBe('keep');
    expect(droppedByServer({ rev: 0, dirty: false })).toBe('keep');
  });
});
