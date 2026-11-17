export type Testament = 'OT' | 'NT';

export interface Book {
  /** Canonical three character id (USFM). The key used everywhere in SELAH data. */
  id: string;
  /** 1 to 66, canonical Protestant order. */
  order: number;
  name: string;
  /** Short form used in compact references. */
  abbr: string;
  testament: Testament;
  chapters: number;
  /** Extra spellings accepted by the reference parser. */
  aliases?: string[];
}

const b = (
  order: number,
  id: string,
  name: string,
  abbr: string,
  testament: Testament,
  chapters: number,
  aliases: string[] = [],
): Book => ({ id, order, name, abbr, testament, chapters, aliases });

export const BOOKS: readonly Book[] = [
  b(1, 'GEN', 'Genesis', 'Gen', 'OT', 50, ['ge', 'gn']),
  b(2, 'EXO', 'Exodus', 'Exod', 'OT', 40, ['ex']),
  b(3, 'LEV', 'Leviticus', 'Lev', 'OT', 27, ['le', 'lv']),
  b(4, 'NUM', 'Numbers', 'Num', 'OT', 36, ['nu', 'nm', 'nb']),
  b(5, 'DEU', 'Deuteronomy', 'Deut', 'OT', 34, ['dt', 'de']),
  b(6, 'JOS', 'Joshua', 'Josh', 'OT', 24, ['jsh']),
  b(7, 'JDG', 'Judges', 'Judg', 'OT', 21, ['jg', 'jdgs']),
  b(8, 'RUT', 'Ruth', 'Ruth', 'OT', 4, ['ru', 'rth']),
  b(9, '1SA', '1 Samuel', '1 Sam', 'OT', 31, ['1sm', '1s']),
  b(10, '2SA', '2 Samuel', '2 Sam', 'OT', 24, ['2sm', '2s']),
  b(11, '1KI', '1 Kings', '1 Kgs', 'OT', 22, ['1k', '1kgs']),
  b(12, '2KI', '2 Kings', '2 Kgs', 'OT', 25, ['2k', '2kgs']),
  b(13, '1CH', '1 Chronicles', '1 Chr', 'OT', 29, ['1chron']),
  b(14, '2CH', '2 Chronicles', '2 Chr', 'OT', 36, ['2chron']),
  b(15, 'EZR', 'Ezra', 'Ezra', 'OT', 10),
  b(16, 'NEH', 'Nehemiah', 'Neh', 'OT', 13, ['ne']),
  b(17, 'EST', 'Esther', 'Esth', 'OT', 10, ['es']),
  b(18, 'JOB', 'Job', 'Job', 'OT', 42, ['jb']),
  b(19, 'PSA', 'Psalms', 'Ps', 'OT', 150, ['psalm', 'pss', 'psm']),
  b(20, 'PRO', 'Proverbs', 'Prov', 'OT', 31, ['pr', 'prv']),
  b(21, 'ECC', 'Ecclesiastes', 'Eccl', 'OT', 12, ['ec', 'qoh']),
  b(22, 'SNG', 'Song of Solomon', 'Song', 'OT', 8, ['sos', 'song of songs', 'ss', 'canticles']),
  b(23, 'ISA', 'Isaiah', 'Isa', 'OT', 66, ['is']),
  b(24, 'JER', 'Jeremiah', 'Jer', 'OT', 52, ['je']),
  b(25, 'LAM', 'Lamentations', 'Lam', 'OT', 5, ['la']),
  b(26, 'EZK', 'Ezekiel', 'Ezek', 'OT', 48, ['eze']),
  b(27, 'DAN', 'Daniel', 'Dan', 'OT', 12, ['da', 'dn']),
  b(28, 'HOS', 'Hosea', 'Hos', 'OT', 14, ['ho']),
  b(29, 'JOL', 'Joel', 'Joel', 'OT', 3, ['joe', 'jl']),
  b(30, 'AMO', 'Amos', 'Amos', 'OT', 9, ['am']),
  b(31, 'OBA', 'Obadiah', 'Obad', 'OT', 1, ['ob', 'obd']),
  b(32, 'JON', 'Jonah', 'Jonah', 'OT', 4, ['jnh']),
  b(33, 'MIC', 'Micah', 'Mic', 'OT', 7, ['mc']),
  b(34, 'NAM', 'Nahum', 'Nah', 'OT', 3, ['na']),
  b(35, 'HAB', 'Habakkuk', 'Hab', 'OT', 3, ['hb']),
  b(36, 'ZEP', 'Zephaniah', 'Zeph', 'OT', 3, ['zp']),
  b(37, 'HAG', 'Haggai', 'Hag', 'OT', 2, ['hg']),
  b(38, 'ZEC', 'Zechariah', 'Zech', 'OT', 14, ['zc']),
  b(39, 'MAL', 'Malachi', 'Mal', 'OT', 4, ['ml']),
  b(40, 'MAT', 'Matthew', 'Matt', 'NT', 28, ['mt']),
  b(41, 'MRK', 'Mark', 'Mark', 'NT', 16, ['mk', 'mr']),
  b(42, 'LUK', 'Luke', 'Luke', 'NT', 24, ['lk']),
  b(43, 'JHN', 'John', 'John', 'NT', 21, ['jn', 'joh']),
  b(44, 'ACT', 'Acts', 'Acts', 'NT', 28, ['ac']),
  b(45, 'ROM', 'Romans', 'Rom', 'NT', 16, ['ro', 'rm']),
  b(46, '1CO', '1 Corinthians', '1 Cor', 'NT', 16),
  b(47, '2CO', '2 Corinthians', '2 Cor', 'NT', 13),
  b(48, 'GAL', 'Galatians', 'Gal', 'NT', 6, ['ga']),
  b(49, 'EPH', 'Ephesians', 'Eph', 'NT', 6, ['ep']),
  b(50, 'PHP', 'Philippians', 'Phil', 'NT', 4, ['pp']),
  b(51, 'COL', 'Colossians', 'Col', 'NT', 4, ['co']),
  b(52, '1TH', '1 Thessalonians', '1 Thess', 'NT', 5),
  b(53, '2TH', '2 Thessalonians', '2 Thess', 'NT', 3),
  b(54, '1TI', '1 Timothy', '1 Tim', 'NT', 6),
  b(55, '2TI', '2 Timothy', '2 Tim', 'NT', 4),
  b(56, 'TIT', 'Titus', 'Titus', 'NT', 3, ['tt']),
  b(57, 'PHM', 'Philemon', 'Phlm', 'NT', 1, ['philem']),
  b(58, 'HEB', 'Hebrews', 'Heb', 'NT', 13, ['he']),
  b(59, 'JAS', 'James', 'Jas', 'NT', 5, ['jm', 'jam']),
  b(60, '1PE', '1 Peter', '1 Pet', 'NT', 5, ['1pt', '1p']),
  b(61, '2PE', '2 Peter', '2 Pet', 'NT', 3, ['2pt', '2p']),
  b(62, '1JN', '1 John', '1 John', 'NT', 5, ['1jn', '1j']),
  b(63, '2JN', '2 John', '2 John', 'NT', 1, ['2jn', '2j']),
  b(64, '3JN', '3 John', '3 John', 'NT', 1, ['3jn', '3j']),
  b(65, 'JUD', 'Jude', 'Jude', 'NT', 1, ['jd']),
  b(66, 'REV', 'Revelation', 'Rev', 'NT', 22, ['re', 'rv', 'revelations']),
];

const byId = new Map(BOOKS.map((x) => [x.id, x]));

export const getBook = (id: string): Book | undefined => byId.get(id);

export const requireBook = (id: string): Book => {
  const book = byId.get(id);
  if (!book) throw new Error(`Unknown book id: ${id}`);
  return book;
};

export const booksByTestament = (t: Testament): Book[] => BOOKS.filter((x) => x.testament === t);
