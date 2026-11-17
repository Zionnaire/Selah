import { describe, expect, it } from 'vitest';
import { formatReference, formatVerseRanges, parseReference, verseId } from './index';

describe('parseReference', () => {
  it('parses a verse range', () => {
    expect(parseReference('Rom 12:1-2')).toEqual({
      book: 'ROM',
      chapter: 12,
      verseStart: 1,
      verseEnd: 2,
    });
  });
  it('parses numbered books and abbreviations', () => {
    expect(parseReference('1 cor 13:4')?.book).toBe('1CO');
    expect(parseReference('1Jn 1:9')?.book).toBe('1JN');
    expect(parseReference('II Timothy 3:16')?.book).toBe('2TI');
    expect(parseReference('Song of Solomon 2')?.book).toBe('SNG');
  });
  it('treats a bare chapter as the whole chapter', () => {
    expect(parseReference('Psalm 23')).toEqual({
      book: 'PSA',
      chapter: 23,
      verseStart: 1,
      verseEnd: 0,
    });
  });
  it('rejects chapters and books that do not exist', () => {
    expect(parseReference('Jude 2')).toBeNull();
    expect(parseReference('Hezekiah 3')).toBeNull();
  });
});

describe('formatting', () => {
  it('uses an en dash for ranges', () => {
    expect(formatReference({ book: 'ROM', chapter: 12, verseStart: 1, verseEnd: 2 })).toBe(
      'Romans 12:1–2',
    );
  });
  it('builds canonical verse ids', () => {
    expect(verseId('ROM', 12, 2)).toBe('ROM.12.2');
  });
  it('collapses verse lists into ranges', () => {
    expect(formatVerseRanges([5, 1, 2, 3])).toBe('1–3, 5');
  });
});
