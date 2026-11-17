import { describe, expect, it } from 'vitest';
import { isRealReference, parseSuggestions, suggestRequestSchema } from './suggest';

const ref = (book: string, chapter: number, verseStart = 1, verseEnd = 0) => ({ book, chapter, verseStart, verseEnd });

describe('isRealReference', () => {
  it('accepts references inside the canon', () => {
    expect(isRealReference(ref('PSA', 1, 1, 3))).toBe(true);
    expect(isRealReference(ref('ROM', 12))).toBe(true);
  });
  it('rejects a missing book, a chapter the book does not have and a backwards range', () => {
    expect(isRealReference(ref('XXX', 1))).toBe(false);
    expect(isRealReference(ref('JUD', 2))).toBe(false);
    expect(isRealReference(ref('PSA', 151))).toBe(false);
    expect(isRealReference(ref('PSA', 1, 5, 2))).toBe(false);
  });
});

describe('parseSuggestions', () => {
  it('keeps well formed suggestions and drops references that are not real', () => {
    const out = parseSuggestions({
      suggestions: [{ heading: ' The blessed way ', body: 'Delight in the law.', refs: [ref('PSA', 1, 1, 3), ref('PSA', 999), ref('NOPE', 1), 'junk'] }],
    });
    expect(out).toEqual([{ heading: 'The blessed way', body: 'Delight in the law.', refs: [ref('PSA', 1, 1, 3)] }]);
  });
  it('removes duplicate references and caps the number kept', () => {
    const refs = Array.from({ length: 12 }, (_, i) => ref('PSA', 1, i + 1, i + 1));
    const out = parseSuggestions({ suggestions: [{ heading: 'H', body: 'B', refs: [...refs, ...refs] }] });
    expect(out[0]!.refs).toHaveLength(6);
  });
  it('limits the count and skips suggestions with no heading', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ heading: `P${i}`, body: '', refs: [] }));
    expect(parseSuggestions({ suggestions: [{ heading: '', body: 'x' }, ...many] }, 3)).toHaveLength(3);
  });
  it('trims and caps long text and returns nothing for the wrong shape', () => {
    const out = parseSuggestions({ suggestions: [{ heading: 'h'.repeat(500), body: 'b'.repeat(5000), refs: [] }] });
    expect(out[0]!.heading).toHaveLength(140);
    expect(out[0]!.body).toHaveLength(700);
    expect(parseSuggestions(null)).toEqual([]);
    expect(parseSuggestions({ suggestions: 'no' })).toEqual([]);
  });
});

describe('suggestRequestSchema', () => {
  it('needs a topic, a passage or Scripture to work from', () => {
    expect(suggestRequestSchema.safeParse({ kind: 'point' }).success).toBe(false);
    expect(suggestRequestSchema.safeParse({ kind: 'point', topic: 'Mercy' }).success).toBe(true);
    expect(suggestRequestSchema.safeParse({ kind: 'point', passage: ref('PSA', 1, 1, 3) }).success).toBe(true);
  });
  it('caps what is sent', () => {
    const big = { kind: 'point', topic: 'x', outline: Array.from({ length: 30 }, () => ({ title: 't', excerpt: 'e' })) };
    expect(suggestRequestSchema.safeParse(big).success).toBe(false);
  });
});
