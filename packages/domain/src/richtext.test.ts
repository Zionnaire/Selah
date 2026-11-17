import { describe, expect, it } from 'vitest';
import { parseDictionaryText } from './index';

const refs = (s: ReturnType<typeof parseDictionaryText>) =>
  s.flatMap((x) => (x.kind === 'ref' ? [`${x.ref.book} ${x.ref.chapter}:${x.ref.verseStart}`] : []));

describe('parseDictionaryText', () => {
  it('links entry cross references', () => {
    const s = parseDictionaryText('See [[Alpha]] and [[Omega]].');
    expect(s.filter((x) => x.kind === 'entry').map((x) => (x as { term: string }).term)).toEqual(['Alpha', 'Omega']);
  });

  it('links a single reference', () => {
    expect(refs(parseDictionaryText('He was a Levite (Exodus 4:14) and more.'))).toEqual(['EXO 4:14']);
  });

  it('lets later references in a list inherit the book', () => {
    expect(refs(parseDictionaryText('son of Amram. (Numbers 26:59; 33:39)'))).toEqual(['NUM 26:59', 'NUM 33:39']);
  });

  it('switches book inside a list', () => {
    expect(refs(parseDictionaryText('(2 Kings 19:37; Isaiah 37:38)'))).toEqual(['2KI 19:37', 'ISA 37:38']);
  });

  it('leaves a group alone if any part is not a reference', () => {
    const s = parseDictionaryText('(see ver. 4:5 and comp. Rome)');
    expect(refs(s)).toEqual([]);
    expect(s.map((x) => (x.kind === 'text' ? x.text : '')).join('')).toBe('(see ver. 4:5 and comp. Rome)');
  });

  it('keeps the original text exactly when reassembled', () => {
    const original = 'Aaron (a teacher) went (Exodus 4:30; 7:2) with [[Moses]] (B.C. 1573.) to Pharaoh.';
    const rebuilt = parseDictionaryText(original)
      .map((x) => (x.kind === 'text' ? x.text : x.kind === 'entry' ? `[[${x.term}]]` : x.text))
      .join('');
    expect(rebuilt).toBe(original);
  });
});
