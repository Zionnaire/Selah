import { describe, expect, it } from 'vitest';
import type { NoteDoc } from '../note';
import type { Block, Section, SermonDoc } from '../sermon';
import type { StudyDoc } from '../study';
import { deepEqual, isEdit } from './equal';
import {
  mergeMark,
  mergeNote,
  mergeSermon,
  mergeStudy,
  resolveNoteConflict,
  resolveSectionConflict,
  resolveStudySectionConflict,
} from './merge';

const text = (id: string, t: string): Block => ({ id, type: 'text', text: t });
const sec = (id: string, title: string, blocks: Block[] = [], minutes = 5): Section => ({ id, title, minutes, blocks });
const sermon = (sections: Section[], over: Partial<SermonDoc> = {}): SermonDoc => ({
  title: 'Transformed',
  status: 'drafting',
  targetMinutes: 30,
  sections,
  ...over,
});
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const ids = (s: SermonDoc) => s.sections.map((x) => x.id);

let n = 0;
const newId = () => `new${++n}`;

describe('equality', () => {
  it('ignores key order and undefined properties', () => {
    expect(deepEqual({ a: 1, b: { c: 2 } }, { b: { c: 2 }, a: 1, z: undefined })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(deepEqual([1, 2], [2, 1])).toBe(false);
  });
  it('a save that changes nothing is not an edit', () => {
    const doc = sermon([sec('a', 'A', [text('b1', 'hello')])]);
    expect(isEdit(doc, clone(doc))).toBe(false);
    expect(isEdit(doc, sermon([sec('a', 'A', [text('b1', 'hello!')])]))).toBe(true);
  });
});

describe('mergeSermon: sections', () => {
  const base = sermon([sec('i', 'Intro', [text('i1', 'welcome')]), sec('p1', 'Point one', [text('p1a', 'mercy')])]);

  it('returns the same document when nothing changed', () => {
    const r = mergeSermon(base, clone(base), clone(base));
    expect(r.merged).toEqual(base);
    expect(r.conflicts).toEqual([]);
  });

  it('takes the only side that changed a section', () => {
    const remote = clone(base);
    remote.sections[1]!.blocks = [text('p1a', 'mercy first')];
    const r = mergeSermon(base, clone(base), remote);
    expect(r.merged.sections[1]!.blocks[0]).toMatchObject({ text: 'mercy first' });
    expect(r.conflicts).toEqual([]);
  });

  it('combines edits to different sections made on different devices', () => {
    const local = clone(base);
    local.sections[0]!.blocks = [text('i1', 'welcome all')];
    const remote = clone(base);
    remote.sections[1]!.blocks = [text('p1a', 'mercy first')];
    const r = mergeSermon(base, local, remote);
    expect(r.conflicts).toEqual([]);
    expect(r.merged.sections[0]!.blocks[0]).toMatchObject({ text: 'welcome all' });
    expect(r.merged.sections[1]!.blocks[0]).toMatchObject({ text: 'mercy first' });
  });

  it('combines edits to different blocks inside one section', () => {
    const two = sermon([sec('p', 'Point', [text('a', 'one'), text('b', 'two')])]);
    const local = clone(two);
    (local.sections[0]!.blocks[0] as { text: string }).text = 'one!';
    const remote = clone(two);
    (remote.sections[0]!.blocks[1] as { text: string }).text = 'two!';
    const r = mergeSermon(two, local, remote);
    expect(r.conflicts).toEqual([]);
    expect(r.merged.sections[0]!.blocks.map((b) => (b as { text: string }).text)).toEqual(['one!', 'two!']);
  });

  it('raises a conflict only when the same block was edited on both sides, and keeps the local one meanwhile', () => {
    const local = clone(base);
    (local.sections[1]!.blocks[0] as { text: string }).text = 'laptop version';
    const remote = clone(base);
    (remote.sections[1]!.blocks[0] as { text: string }).text = 'ipad version';
    const r = mergeSermon(base, local, remote);
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0]).toMatchObject({ sectionId: 'p1', title: 'Point one' });
    expect((r.merged.sections[1]!.blocks[0] as { text: string }).text).toBe('laptop version');
    expect(r.conflicts[0]!.remote.blocks[0]).toMatchObject({ text: 'ipad version' });
  });

  it('keeps sections added on either side', () => {
    const local = clone(base);
    local.sections.push(sec('conc', 'Conclusion'));
    const remote = clone(base);
    remote.sections.splice(1, 0, sec('story', 'Story'));
    const r = mergeSermon(base, local, remote);
    expect(ids(r.merged).sort()).toEqual(['conc', 'i', 'p1', 'story']);
    // the remote's order leads, and the local addition goes after the section it followed
    expect(ids(r.merged)).toEqual(['i', 'story', 'p1', 'conc']);
  });

  it('removes a section the other side deleted if this side did not touch it', () => {
    const remote = clone(base);
    remote.sections.pop();
    const r = mergeSermon(base, clone(base), remote);
    expect(ids(r.merged)).toEqual(['i']);
    expect(r.notices.keptSections).toEqual([]);
  });

  it('keeps an edit over a deletion and reports it, from either side', () => {
    const remoteDeleted = clone(base);
    remoteDeleted.sections.pop();
    const localEdited = clone(base);
    (localEdited.sections[1]!.blocks[0] as { text: string }).text = 'still working on this';
    const a = mergeSermon(base, localEdited, remoteDeleted);
    expect(ids(a.merged)).toEqual(['i', 'p1']);
    expect(a.notices.keptSections).toEqual(['p1']);

    const b = mergeSermon(base, remoteDeleted, localEdited);
    expect(ids(b.merged)).toEqual(['i', 'p1']);
    expect(b.notices.keptSections).toEqual(['p1']);
  });

  it('keeps a block edited on one side and deleted on the other', () => {
    const two = sermon([sec('p', 'Point', [text('a', 'one'), text('b', 'two')])]);
    const local = clone(two);
    local.sections[0]!.blocks = [text('a', 'one')];
    const remote = clone(two);
    (remote.sections[0]!.blocks[1] as { text: string }).text = 'two, revised';
    const r = mergeSermon(two, local, remote);
    expect(r.conflicts).toEqual([]);
    expect(r.notices.keptBlocks).toEqual(['b']);
    expect(r.merged.sections[0]!.blocks.map((b) => b.id)).toEqual(['a', 'b']);
  });
});

describe('mergeSermon: order', () => {
  const base = sermon([sec('a', 'A'), sec('b', 'B'), sec('c', 'C')]);
  const moved = (s: SermonDoc, order: string[]) => ({ ...s, sections: order.map((id) => s.sections.find((x) => x.id === id)!) });

  it('uses the order of the side that reordered', () => {
    const local = moved(base, ['c', 'a', 'b']);
    expect(ids(mergeSermon(base, local, clone(base)).merged)).toEqual(['c', 'a', 'b']);
    const remote = moved(base, ['b', 'c', 'a']);
    expect(ids(mergeSermon(base, clone(base), remote).merged)).toEqual(['b', 'c', 'a']);
  });

  it('uses the server order when both reordered differently', () => {
    const r = mergeSermon(base, moved(base, ['c', 'a', 'b']), moved(base, ['b', 'c', 'a']));
    expect(ids(r.merged)).toEqual(['b', 'c', 'a']);
  });
});

describe('mergeSermon: details', () => {
  const base = sermon([sec('a', 'A')], { title: 'Original', preachDate: '2026-11-22' });

  it('a side that changed a field wins over a side that did not', () => {
    const r = mergeSermon(base, { ...base, title: 'Local title' }, { ...base, preachDate: '2026-11-29' });
    expect(r.merged.title).toBe('Local title');
    expect(r.merged.preachDate).toBe('2026-11-29');
    expect(r.notices.overwritten).toEqual([]);
  });

  it('the server value wins when both changed the same field, and the local value is kept in history', () => {
    const r = mergeSermon(base, { ...base, title: 'Laptop' }, { ...base, title: 'iPad' });
    expect(r.merged.title).toBe('iPad');
    expect(r.notices.overwritten).toEqual([{ field: 'title', local: 'Laptop' }]);
  });

  it('with no base, differing details take the server value and nothing is lost', () => {
    const r = mergeSermon(null, { ...base, title: 'Laptop' }, { ...base, title: 'iPad' });
    expect(r.merged.title).toBe('iPad');
    expect(r.notices.overwritten).toHaveLength(1);
  });
});

describe('mergeSermon: no base', () => {
  it('unions sections and conflicts on the same section that differs', () => {
    const local = sermon([sec('a', 'A', [text('x', 'laptop')]), sec('l', 'Local only')]);
    const remote = sermon([sec('a', 'A', [text('x', 'ipad')]), sec('r', 'Remote only')]);
    const r = mergeSermon(null, local, remote);
    expect(ids(r.merged).sort()).toEqual(['a', 'l', 'r']);
    expect(r.conflicts.map((c) => c.sectionId)).toEqual(['a']);
  });
});

describe('invariants', () => {
  const base = sermon(
    [sec('i', 'Intro', [text('i1', 'welcome'), text('i2', 'pray')]), sec('p', 'Point', [text('p1', 'mercy')]), sec('c', 'Close')],
    { preachDate: '2026-11-22' },
  );
  const changed = clone(base);
  (changed.sections[0]!.blocks[0] as { text: string }).text = 'welcome all';
  changed.sections.push(sec('z', 'Response'));
  changed.title = 'New title';

  it('if only one side changed, the result is that side', () => {
    expect(mergeSermon(base, clone(base), changed).merged).toEqual(changed);
    expect(mergeSermon(base, changed, clone(base)).merged).toEqual(changed);
  });
  it('if both sides made the same change, the result is that change with no conflict', () => {
    const r = mergeSermon(base, clone(changed), clone(changed));
    expect(r.merged).toEqual(changed);
    expect(r.conflicts).toEqual([]);
    expect(r.notices.overwritten).toEqual([]);
  });
  it('merging never loses a section id that either side still has', () => {
    const a = clone(base);
    a.sections.push(sec('only-a', 'A'));
    const b = clone(base);
    b.sections.push(sec('only-b', 'B'));
    const out = ids(mergeSermon(base, a, b).merged);
    expect(out).toEqual(expect.arrayContaining(['only-a', 'only-b', 'i', 'p', 'c']));
    expect(new Set(out).size).toBe(out.length);
  });
});

describe('resolveSectionConflict', () => {
  const base = sermon([sec('p', 'Rejecting conformity', [text('b', 'start')])]);
  const local = clone(base);
  (local.sections[0]!.blocks[0] as { text: string }).text = 'laptop';
  const remote = clone(base);
  (remote.sections[0]!.blocks[0] as { text: string }).text = 'ipad';
  const { merged, conflicts } = mergeSermon(base, local, remote);
  const conflict = conflicts[0]!;

  it('keep this device leaves the document alone', () => {
    const r = resolveSectionConflict(merged, conflict, 'local', 'iPad', newId);
    expect(r.ok).toBe(true);
    expect((r.doc.sections[0]!.blocks[0] as { text: string }).text).toBe('laptop');
  });

  it('keep the other device replaces the section', () => {
    const r = resolveSectionConflict(merged, conflict, 'remote', 'iPad', newId);
    expect((r.doc.sections[0]!.blocks[0] as { text: string }).text).toBe('ipad');
  });

  it('keep both adds the other version as a named copy right after, with fresh ids', () => {
    const r = resolveSectionConflict(merged, conflict, 'both', 'iPad', newId);
    expect(r.ok).toBe(true);
    expect(r.doc.sections).toHaveLength(2);
    expect(r.doc.sections[1]!.title).toBe('Rejecting conformity (iPad)');
    expect(r.doc.sections[1]!.id).not.toBe(r.doc.sections[0]!.id);
    expect(r.doc.sections[1]!.blocks[0]!.id).not.toBe('b');
    expect((r.doc.sections[1]!.blocks[0] as { text: string }).text).toBe('ipad');
  });

  it('keep both is refused at the section limit so the document is never made invalid', () => {
    const full = { ...merged, sections: Array.from({ length: 60 }, (_, i) => (i === 0 ? merged.sections[0]! : sec(`s${i}`, `S${i}`))) };
    const r = resolveSectionConflict(full, conflict, 'both', 'iPad', newId);
    expect(r.ok).toBe(false);
    expect(r.doc).toBe(full);
  });
});

describe('mergeStudy', () => {
  const verse = (id: string, v: number, note = '', group = '') => ({
    id,
    ref: { book: 'ROM', chapter: 12, verseStart: v, verseEnd: v },
    note,
    group,
  });
  const study = (over: Partial<StudyDoc> = {}): StudyDoc => ({
    title: 'Understanding Romans 12',
    kind: 'passage',
    sections: [{ id: 's1', heading: 'What the text says', body: '' }],
    verses: [],
    ...over,
  });

  it('collects the same verse added on two devices only once', () => {
    const base = study();
    const local = study({ verses: [verse('l1', 2)] });
    const remote = study({ verses: [verse('r1', 2), verse('r2', 3)] });
    const r = mergeStudy(base, local, remote);
    expect(r.merged.verses.map((v) => v.ref.verseStart).sort()).toEqual([2, 3]);
  });

  it('a verse removed on one side and untouched on the other is removed', () => {
    const base = study({ verses: [verse('v1', 2), verse('v2', 3)] });
    const remote = study({ verses: [verse('v1', 2)] });
    expect(mergeStudy(base, structuredClone(base), remote).merged.verses.map((v) => v.ref.verseStart)).toEqual([2]);
  });

  it('a verse note both sides changed takes the server value without a conflict', () => {
    const base = study({ verses: [verse('v1', 2, 'old')] });
    const r = mergeStudy(base, study({ verses: [verse('v1', 2, 'laptop note')] }), study({ verses: [verse('v1', 2, 'ipad note')] }));
    expect(r.conflicts).toEqual([]);
    expect(r.merged.verses[0]!.note).toBe('ipad note');
    expect(r.notices.overwritten).toHaveLength(1);
  });

  it('writing in the same study section on two devices is a conflict and can be resolved', () => {
    const base = study();
    const local = study({ sections: [{ id: 's1', heading: 'What the text says', body: 'laptop words' }] });
    const remote = study({ sections: [{ id: 's1', heading: 'What the text says', body: 'ipad words' }] });
    const r = mergeStudy(base, local, remote);
    expect(r.conflicts).toHaveLength(1);
    expect(r.merged.sections[0]!.body).toBe('laptop words');
    const both = resolveStudySectionConflict(r.merged, r.conflicts[0]!, 'both', 'iPad', newId);
    expect(both.doc.sections).toHaveLength(2);
    expect(both.doc.sections[1]!.body).toBe('ipad words');
  });

  it('writing in different sections never conflicts', () => {
    const base = study({ sections: [{ id: 's1', heading: 'A', body: '' }, { id: 's2', heading: 'B', body: '' }] });
    const local = study({ sections: [{ id: 's1', heading: 'A', body: 'mine' }, { id: 's2', heading: 'B', body: '' }] });
    const remote = study({ sections: [{ id: 's1', heading: 'A', body: '' }, { id: 's2', heading: 'B', body: 'theirs' }] });
    const r = mergeStudy(base, local, remote);
    expect(r.conflicts).toEqual([]);
    expect(r.merged.sections.map((s) => s.body)).toEqual(['mine', 'theirs']);
  });
});

describe('mergeNote', () => {
  const note = (over: Partial<NoteDoc> = {}): NoteDoc => ({ title: 'Mercy', body: 'first thought', links: [], ...over });
  const passage = { type: 'passage' as const, ref: { book: 'ROM', chapter: 12, verseStart: 1, verseEnd: 1 } };

  it('takes the side that edited the body', () => {
    const base = note();
    expect(mergeNote(base, note(), note({ body: 'longer thought' })).merged.body).toBe('longer thought');
    expect(mergeNote(base, note({ body: 'longer thought' }), note()).merged.body).toBe('longer thought');
  });

  it('is a conflict when both sides edited the body, and keeps ours until chosen', () => {
    const base = note();
    const r = mergeNote(base, note({ body: 'laptop' }), note({ body: 'ipad' }));
    expect(r.conflicts).toEqual([{ local: 'laptop', remote: 'ipad' }]);
    expect(r.merged.body).toBe('laptop');
  });

  it('merges links from both sides', () => {
    const base = note();
    const r = mergeNote(base, note({ links: [passage] }), note({ links: [{ type: 'sermon', id: 's1', title: 'Transformed' }] }));
    expect(r.merged.links).toHaveLength(2);
  });

  it('keep both makes a separate note named for the device', () => {
    const r = mergeNote(note(), note({ body: 'laptop' }), note({ body: 'ipad' }));
    const out = resolveNoteConflict(r.merged, r.conflicts[0]!, 'both', 'iPad');
    expect(out.doc.body).toBe('laptop');
    expect(out.copy).toMatchObject({ title: 'Mercy (iPad)', body: 'ipad' });
  });

  it('keep the other device replaces the body', () => {
    const r = mergeNote(note(), note({ body: 'laptop' }), note({ body: 'ipad' }));
    expect(resolveNoteConflict(r.merged, r.conflicts[0]!, 'remote', 'iPad').doc.body).toBe('ipad');
  });
});

describe('mergeMark', () => {
  it('a side that changed it wins over a side that did not', () => {
    expect(mergeMark(true, false, true)).toBe(false); // removed here
    expect(mergeMark(true, true, false)).toBe(false); // removed there
    expect(mergeMark(false, true, false)).toBe(true); // added here
    expect(mergeMark(false, false, true)).toBe(true); // added there
  });
  it('agreeing sides agree', () => {
    expect(mergeMark(true, true, true)).toBe(true);
    expect(mergeMark(true, false, false)).toBe(false);
  });
  it('with no base the verse is kept, since keeping loses nothing', () => {
    expect(mergeMark(undefined, true, false)).toBe(true);
    expect(mergeMark(undefined, false, true)).toBe(true);
    expect(mergeMark(undefined, false, false)).toBe(false);
  });
});
