// Builds the cross-reference file used by the Bible reader and Study tools.
//
//   node scripts/ingest-crossrefs.mjs                 downloads the data and builds it
//   node scripts/ingest-crossrefs.mjs path/to/cross_references.txt   uses a file you already have
//
// Source: OpenBible.info Cross References, licensed CC BY 4.0.
//   https://www.openbible.info/labs/cross-references/
// The UI must show the attribution line (see CROSSREF_ATTRIBUTION in packages/domain).
//
// Output: Frontend/public/data/crossrefs.json, an array of rows
//   [srcBook, srcChapter, srcVerse, dstBook, dstChapter, dstVerse, dstEndVerse, votes]
// Books are 1 to 66 in canonical order. Only well supported links are kept.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'Frontend', 'public', 'data', 'crossrefs.json');
const URL_ZIP = 'https://a.openbible.info/data/cross-references.zip';

const MIN_VOTES = 5; // links with fewer votes are mostly noise
const PER_VERSE = 10; // keep the best few so the panel stays readable

// OpenBible codes in canonical order. The index plus one is our book number.
const CODES = [
  'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs',
  '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Eccl', 'Song', 'Isa', 'Jer',
  'Lam', 'Ezek', 'Dan', 'Hos', 'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph',
  'Hag', 'Zech', 'Mal', 'Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1Cor', '2Cor', 'Gal',
  'Eph', 'Phil', 'Col', '1Thess', '2Thess', '1Tim', '2Tim', 'Titus', 'Phlm', 'Heb', 'Jas',
  '1Pet', '2Pet', '1John', '2John', '3John', 'Jude', 'Rev',
];
const BOOK = new Map(CODES.map((c, i) => [c, i + 1]));

async function readSource() {
  const given = process.argv[2];
  if (given) return readFileSync(given, 'utf8');
  const dir = mkdtempSync(join(tmpdir(), 'selah-xref-'));
  const zip = join(dir, 'x.zip');
  const res = await fetch(URL_ZIP);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  // bsdtar (Windows 10+, macOS) reads zip; fall back to unzip on Linux.
  try {
    execFileSync('tar', ['-xf', zip, '-C', dir], { stdio: 'ignore' });
  } catch {
    execFileSync('unzip', ['-o', '-q', zip, '-d', dir]);
  }
  return readFileSync(join(dir, 'cross_references.txt'), 'utf8');
}

const parse = (s) => {
  const m = /^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)$/.exec(s);
  if (!m || !BOOK.has(m[1])) return null;
  return { book: BOOK.get(m[1]), chapter: +m[2], verse: +m[3] };
};

const text = await readSource();
const bySource = new Map();
let kept = 0;

for (const line of text.split('\n')) {
  if (!line || line.startsWith('From Verse')) continue;
  const [from, to, votesRaw] = line.split('\t');
  const votes = Number(votesRaw);
  if (!(votes >= MIN_VOTES)) continue;
  const src = parse(from);
  const [a, b] = to.split('-');
  const dst = parse(a);
  const end = b ? parse(b) : null;
  if (!src || !dst) continue;
  // A range that crosses a chapter keeps only its first verse, which is still a valid pointer.
  const dstEnd = end && end.book === dst.book && end.chapter === dst.chapter && end.verse > dst.verse ? end.verse : dst.verse;
  const key = `${src.book}.${src.chapter}.${src.verse}`;
  const row = [src.book, src.chapter, src.verse, dst.book, dst.chapter, dst.verse, dstEnd, votes];
  (bySource.get(key) ?? bySource.set(key, []).get(key)).push(row);
}

const rows = [];
for (const list of bySource.values()) {
  list.sort((x, y) => y[7] - x[7]);
  rows.push(...list.slice(0, PER_VERSE));
  kept += Math.min(list.length, PER_VERSE);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(rows));
console.log(`${bySource.size} verses with links, ${kept} links kept (votes >= ${MIN_VOTES}, top ${PER_VERSE} each)`);
