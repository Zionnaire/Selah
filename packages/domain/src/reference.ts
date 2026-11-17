import { BOOKS, getBook, type Book } from './books';

/** A contiguous range inside one chapter. verseEnd equals verseStart for a single verse. */
export interface PassageRef {
  book: string;
  chapter: number;
  verseStart: number;
  /** 0 means "to the end of the chapter"; the caller resolves it against real verse counts. */
  verseEnd: number;
}

/** Canonical id for one verse, for example ROM.12.2 */
export const verseId = (book: string, chapter: number, verse: number): string =>
  `${book}.${chapter}.${verse}`;

export const parseVerseId = (
  id: string,
): { book: string; chapter: number; verse: number } | null => {
  const m = /^([1-3]?[A-Z]{2,3})\.(\d+)\.(\d+)$/.exec(id);
  if (!m) return null;
  return { book: m[1]!, chapter: Number(m[2]), verse: Number(m[3]) };
};

const ROMAN: Record<string, string> = { i: '1', ii: '2', iii: '3' };

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(iii|ii|i) /, (_, r: string) => `${ROMAN[r]} `);

const lookup = new Map<string, Book>();
for (const book of BOOKS) {
  const keys = [book.name, book.abbr, book.id, ...(book.aliases ?? [])];
  for (const k of keys) {
    const n = norm(k);
    if (!lookup.has(n)) lookup.set(n, book);
    const squashed = n.replace(/ /g, '');
    if (!lookup.has(squashed)) lookup.set(squashed, book);
  }
}

export const findBook = (input: string): Book | undefined => {
  const key = norm(input);
  return lookup.get(key) ?? lookup.get(key.replace(/ /g, ''));
};

const REF_PATTERN =
  /^((?:[1-3]|i{1,3})?\s*[A-Za-z][A-Za-z .]*?)\s*(\d+)?(?:\s*[:.]\s*(\d+)(?:\s*[-–—]\s*(\d+))?)?$/;

/**
 * Parses "Rom 12:1-2", "1 Cor 13", "john 3:16", "Ps 23". A bare chapter selects the whole
 * chapter (verseStart 1, verseEnd 0). Returns null when the text is not a reference.
 */
export const parseReference = (input: string): PassageRef | null => {
  const m = REF_PATTERN.exec(input.trim());
  if (!m) return null;
  const book = findBook(m[1]!);
  if (!book) return null;
  const chapter = m[2] ? Number(m[2]) : 1;
  if (chapter < 1 || chapter > book.chapters) return null;
  if (!m[3]) return { book: book.id, chapter, verseStart: 1, verseEnd: 0 };
  const start = Number(m[3]);
  const end = m[4] ? Number(m[4]) : start;
  if (start < 1 || end < start) return null;
  return { book: book.id, chapter, verseStart: start, verseEnd: end };
};

/** "Romans 12:1–2" with an en dash for ranges. */
export const formatReference = (ref: PassageRef, style: 'long' | 'short' = 'long'): string => {
  const book = getBook(ref.book);
  const name = book ? (style === 'long' ? book.name : book.abbr) : ref.book;
  if (ref.verseEnd === 0) return `${name} ${ref.chapter}`;
  if (ref.verseStart === ref.verseEnd) return `${name} ${ref.chapter}:${ref.verseStart}`;
  return `${name} ${ref.chapter}:${ref.verseStart}–${ref.verseEnd}`;
};

/** Collapses a set of verse numbers into ranges: [1,2,3,5] becomes "1–3, 5". */
export const formatVerseRanges = (verses: number[]): string => {
  const sorted = [...new Set(verses)].sort((a, b) => a - b);
  const parts: string[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j]! + 1) j++;
    parts.push(j > i ? `${sorted[i]}–${sorted[j]}` : `${sorted[i]}`);
    i = j + 1;
  }
  return parts.join(', ');
};
