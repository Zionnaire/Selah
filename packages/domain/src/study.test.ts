import { describe, expect, it } from 'vitest';
import { groupVerses, hasVerse, newStudy, studyDocSchema, type CollectedVerse } from './index';

let n = 0;
const id = () => `s${++n}`;
const ref = (v: number) => ({ book: 'ROM', chapter: 12, verseStart: v, verseEnd: v });

describe('newStudy', () => {
  it('titles and structures a passage study', () => {
    const s = newStudy({ kind: 'passage', passage: { book: 'ROM', chapter: 12, verseStart: 1, verseEnd: 2 } }, id);
    expect(s.title).toBe('Understanding Romans 12:1–2');
    expect(s.sections).toHaveLength(3);
    expect(s.sections.every((x) => x.body === '')).toBe(true);
  });

  it('titles a topic study from the topic', () => {
    const s = newStudy({ kind: 'topic', topic: 'renewal of the mind' }, id);
    expect(s.title).toBe('Renewal of the mind across Scripture');
    expect(s.passage).toBeUndefined();
  });

  it('produces a document the schema accepts', () => {
    const s = newStudy({ kind: 'topic', topic: 'mercy' }, id);
    expect(studyDocSchema.safeParse(s).success).toBe(true);
  });
});

describe('collected verses', () => {
  const mk = (v: number, group: string): CollectedVerse => ({ id: `c${v}`, ref: ref(v), note: '', group });

  it('groups by label with ungrouped first and keeps order inside a group', () => {
    const g = groupVerses([mk(1, 'Promise'), mk(2, ''), mk(3, 'Promise'), mk(4, 'Fulfilment')]);
    expect(g.map((x) => x.group)).toEqual(['', 'Promise', 'Fulfilment']);
    expect(g[1]!.verses.map((v) => v.ref.verseStart)).toEqual([1, 3]);
  });

  it('detects a verse already collected', () => {
    expect(hasVerse([mk(2, '')], ref(2))).toBe(true);
    expect(hasVerse([mk(2, '')], ref(3))).toBe(false);
  });
});
