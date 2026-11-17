// Builds the interim Bible Dictionary from Smith's Bible Dictionary (William Smith, 1884).
//
//   node scripts/ingest-dictionary.mjs                 downloads and builds
//   node scripts/ingest-dictionary.mjs path/to/bibledict.xml   uses a file you already have
//
// Source: Christian Classics Ethereal Library, https://ccel.org/ccel/smith_w/bibledict
// Rights as stated by CCEL in the file itself: "Public Domain". Print basis 1884.
//
// This is historic reference, 140 years old, and the UI says so. It is NOT the present day
// labelled scholarship the Context Explorer design describes.
//
// Easton's 1897 Bible Dictionary is also public domain (CCEL states "Public Domain -- Copy Freely")
// but CCEL publishes it only as about 4,000 separate web pages, so it is not included.
//
// Output: Frontend/public/data/dictionary-smith.json   [[headword, body], ...]
//   body is plain text. Paragraphs are separated by a blank line. A cross-reference to another
//   entry is written [[Headword]] so the UI can link it.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'Frontend', 'public', 'data');
mkdirSync(OUT, { recursive: true });

const URL_XML = 'https://ccel.org/ccel/smith_w/bibledict.xml';

const xml =
  process.argv[2]
    ? readFileSync(process.argv[2], 'utf8')
    : await fetch(URL_XML).then(async (r) => {
        if (!r.ok) throw new Error(`Download failed: ${r.status}`);
        return r.text();
      });

// The file itself must still state its rights, or we stop.
if (!/<DC\.Rights>\s*Public Domain\s*<\/DC\.Rights>/i.test(xml)) {
  throw new Error('The source no longer states "Public Domain" in DC.Rights. Review the licence before using it.');
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: ',', ndash: '–' };
const decode = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

function toText(html) {
  return decode(
    html
      // links to other entries become [[Term]]; links to scripture and others lose their markup
      .replace(/<a\s[^>]*href="[^"]*bibledict[^"]*"[^>]*>([\s\S]*?)<\/a>/g, '[[$1]]')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<\/p>/g, '\n\n')
      .replace(/<[^>]+>/g, '')
      // the source uses a double hyphen as a dash. Our house style avoids it, so use a comma or a full dash
      .replace(/\s*--\s*/g, ', ')
      .replace(/\s*—\s*/g, ', ')
      .replace(/[ \t]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n'),
  ).trim();
}

const entries = [];
const seen = new Map();
for (const m of xml.matchAll(/<term id="[^"]*">([\s\S]*?)<\/term>\s*<def[^>]*>([\s\S]*?)<\/def>/g)) {
  const headword = toText(m[1]).replace(/\s+/g, ' ');
  const body = toText(m[2]);
  if (!headword || !body) continue;
  // a few headwords repeat (different people with one name): keep them as separate entries
  const n = (seen.get(headword) ?? 0) + 1;
  seen.set(headword, n);
  entries.push([n > 1 ? `${headword} (${n})` : headword, body]);
}

if (entries.length < 3000) throw new Error(`Only ${entries.length} entries parsed. The source format may have changed.`);

writeFileSync(join(OUT, 'dictionary-smith.json'), JSON.stringify(entries));
writeFileSync(
  join(OUT, 'dictionary-sources.json'),
  JSON.stringify(
    {
      built: new Date().toISOString().slice(0, 10),
      work: "Smith's Bible Dictionary, William Smith, 1884",
      source: 'Christian Classics Ethereal Library, https://ccel.org/ccel/smith_w/bibledict',
      rights: 'Public Domain, as stated in the source file (DC.Rights)',
      note: 'Plain text extracted. Markup removed, cross references kept as [[Entry]], double hyphens and em dashes replaced by commas for a consistent style.',
    },
    null,
    2,
  ),
);
const size = (JSON.stringify(entries).length / 1_048_576).toFixed(1);
console.log(`${entries.length} entries, ${size} MB`);
