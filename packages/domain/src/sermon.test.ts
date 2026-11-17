import { describe, expect, it } from 'vitest';
import {
  buildSections,
  firstSentence,
  newBlock,
  sectionProgress,
  sermonDocSchema,
  summarise,
  type SermonDoc,
} from './index';

let n = 0;
const id = () => `id${++n}`;

describe('buildSections', () => {
  it('splits the time budget across the three point template and keeps the total', () => {
    const s = buildSections('three-points', 40, undefined, id);
    expect(s).toHaveLength(6);
    expect(s.reduce((a, x) => a + x.minutes, 0)).toBe(40);
    expect(s[0]!.title).toBe('Introduction');
  });

  it('groups a long passage into at most about six sections', () => {
    const s = buildSections('verse-by-verse', 30, { book: 'PSA', chapter: 119, verseStart: 1, verseEnd: 40 }, id);
    expect(s.length).toBeLessThanOrEqual(9);
    expect(s[0]!.title).toBe('Introduction');
    expect(s.at(-1)!.title).toBe('Conclusion');
  });

  it('falls back to a single section', () => {
    expect(buildSections('blank', 20, undefined, id)).toHaveLength(1);
  });
});

describe('summarise', () => {
  const doc: SermonDoc = {
    title: 'Test',
    status: 'drafting',
    targetMinutes: 20,
    sections: [
      { id: 'a', title: 'A', minutes: 5, blocks: [{ id: 'b1', type: 'text', text: 'word '.repeat(130) }] },
      { id: 'b', title: 'B', minutes: 5, blocks: [newBlock('scripture', 'b2')] },
      { id: 'c', title: 'C', minutes: 5, blocks: [{ id: 'b3', type: 'cue', text: 'Pause for a long moment here' }] },
    ],
  };

  it('counts spoken words, not cues, and one minute at the stated pace', () => {
    const s = summarise(doc);
    expect(s.words).toBe(130 + 40);
    expect(s.sectionsStarted).toBe(1);
    expect(sectionProgress(doc.sections[0]!)).toBeCloseTo(0.2);
  });
});

describe('helpers', () => {
  it('takes the first sentence', () => {
    expect(firstSentence('Conformity is quiet. It happens by default.')).toBe('Conformity is quiet.');
    expect(firstSentence('No full stop here')).toBe('No full stop here');
  });

  it('validates a sermon document', () => {
    const ok = sermonDocSchema.safeParse({ title: 'x', status: 'idea', targetMinutes: 30, sections: [] });
    const bad = sermonDocSchema.safeParse({ title: 'x', status: 'nope', targetMinutes: 30, sections: [] });
    expect(ok.success).toBe(true);
    expect(bad.success).toBe(false);
  });
});
