import { describe, expect, it } from 'vitest';
import { buildExport, modelToText, noteDisplayTitle, type ExportOptions, type SermonDoc } from './index';

const doc: SermonDoc = {
  title: 'Transformed',
  passage: { book: 'ROM', chapter: 12, verseStart: 1, verseEnd: 2 },
  status: 'drafting',
  targetMinutes: 30,
  sections: [
    {
      id: 's1',
      title: 'A living sacrifice',
      minutes: 10,
      blocks: [
        { id: 'a', type: 'text', text: 'Mercy first. Response second. Always in that order.' },
        { id: 'b', type: 'scripture', ref: { book: 'ROM', chapter: 12, verseStart: 1, verseEnd: 1 } },
        { id: 'c', type: 'cue', text: 'Pause here' },
        { id: 'd', type: 'story', title: 'The trader', text: 'She prayed over her first sale every day.' },
      ],
    },
  ],
};

const lookup = () => [{ verse: 1, text: 'I beseech you therefore' }];
const opts = (o: Partial<ExportOptions>): ExportOptions => ({
  format: 'pulpit',
  scripture: true,
  cues: true,
  stories: false,
  ...o,
});

describe('buildExport', () => {
  it('pulpit edition reduces paragraphs to their first sentence and keeps cues', () => {
    const m = buildExport(doc, opts({}), lookup);
    const kinds = m.sections[0]!.items.map((i) => i.kind);
    expect(kinds).toEqual(['bullet', 'scripture', 'cue', 'bullet']);
    expect(m.sections[0]!.items[0]).toEqual({ kind: 'bullet', text: 'Mercy first.' });
  });

  it('manuscript keeps full text and stories', () => {
    const m = buildExport(doc, opts({ format: 'manuscript' }), lookup);
    expect(m.sections[0]!.items[0]).toMatchObject({ kind: 'para', text: expect.stringContaining('Always in that order') });
    expect(m.sections[0]!.items[3]).toMatchObject({ kind: 'story', title: 'The trader' });
  });

  it('outline never prints scripture text or cues', () => {
    const m = buildExport(doc, opts({ format: 'outline' }), lookup);
    const scripture = m.sections[0]!.items.find((i) => i.kind === 'scripture');
    expect(scripture).toMatchObject({ verses: undefined });
    expect(m.sections[0]!.items.some((i) => i.kind === 'cue')).toBe(false);
  });

  it('respects the scripture and cue switches', () => {
    const m = buildExport(doc, opts({ scripture: false, cues: false }), lookup);
    expect(m.sections[0]!.items.some((i) => i.kind === 'cue')).toBe(false);
    expect(m.sections[0]!.items.find((i) => i.kind === 'scripture')).toMatchObject({ verses: undefined });
  });
});

describe('empty sections', () => {
  it('are left out of the export', () => {
    const withEmpty = { ...doc, sections: [...doc.sections, { id: 'e', title: 'Empty', minutes: 5, blocks: [] }] };
    const m = buildExport(withEmpty, opts({}), lookup);
    expect(m.sections.map((s) => s.title)).toEqual(['A living sacrifice']);
  });
});

describe('modelToText', () => {
  it('ends with the attribution line', () => {
    const text = modelToText(buildExport(doc, opts({ format: 'manuscript' }), lookup), 'King James Version. Public domain.');
    expect(text.trimEnd().endsWith('King James Version. Public domain.')).toBe(true);
    expect(text).toContain('Romans 12:1: 1 I beseech you therefore');
  });
});

describe('noteDisplayTitle', () => {
  it('falls back to the first line, then a default', () => {
    expect(noteDisplayTitle({ title: '', body: 'Mercy first\nmore' })).toBe('Mercy first');
    expect(noteDisplayTitle({ title: '', body: '  ' })).toBe('Untitled note');
    expect(noteDisplayTitle({ title: 'Own title', body: 'x' })).toBe('Own title');
  });
});
