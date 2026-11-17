// Builds compact public-domain Bible files for the web app.
//
//   node scripts/ingest-bibles.mjs            builds every translation
//   node scripts/ingest-bibles.mjs kjv web    builds the named ones
//
// Output: Frontend/public/bibles/<id>.json
//   { "id": "kjv", "books": [ [ ["verse 1", "verse 2"], ...chapters ], ...66 books ] }
// Books are in canonical order, so a book is addressed by its index, no names are stored.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'Frontend', 'public', 'bibles');

const BOOK_NAMES = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel',
  '2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job',
  'Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah','Jeremiah','Lamentations',
  'Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk',
  'Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans',
  '1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians',
  '1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews',
  'James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation',
];

const clean = (s) => s.replace(/\s+/g, ' ').trim();

const getJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
};

const SOURCES = {
  // thiagobodruk/bible: array of books, each with chapters as arrays of verse strings
  async kjv() {
    const data = await getJson(
      'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json',
    );
    return data.map((book) => book.chapters.map((ch) => ch.map(clean)));
  },
  asv: () => scrollmapper('ASV'),
  bsb: () => scrollmapper('BSB'),
  // TehShrike/world-english-bible: one file per book, verses split across typed chunks
  async web() {
    const books = [];
    for (const name of BOOK_NAMES) {
      const file = name.toLowerCase().replace(/ /g, '');
      const chunks = await getJson(
        `https://raw.githubusercontent.com/TehShrike/world-english-bible/master/json/${file}.json`,
      );
      const chapters = [];
      for (const c of chunks) {
        if (c.chapterNumber === undefined || c.verseNumber === undefined) continue;
        if (!/text$/.test(c.type)) continue;
        const ch = (chapters[c.chapterNumber - 1] ??= []);
        ch[c.verseNumber - 1] = clean(`${ch[c.verseNumber - 1] ?? ''} ${c.value}`);
      }
      books.push(chapters.map((ch) => Array.from(ch ?? [], (v) => v ?? '')));
    }
    return books;
  },
};

async function scrollmapper(code) {
  const data = await getJson(
    `https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/${code}.json`,
  );
  return data.books.map((book) => {
    const chapters = [];
    for (const ch of book.chapters) {
      const verses = [];
      for (const v of ch.verses) verses[v.verse - 1] = clean(v.text);
      chapters[ch.chapter - 1] = Array.from(verses, (v) => v ?? '');
    }
    return chapters.map((c) => c ?? []);
  });
}

const wanted = process.argv.slice(2);
const ids = wanted.length ? wanted : Object.keys(SOURCES);
await mkdir(outDir, { recursive: true });

for (const id of ids) {
  const load = SOURCES[id];
  if (!load) throw new Error(`Unknown translation: ${id}`);
  const books = await load();
  if (books.length !== 66) throw new Error(`${id}: expected 66 books, got ${books.length}`);
  const verses = books.flat(2).filter(Boolean).length;
  await writeFile(join(outDir, `${id}.json`), JSON.stringify({ id, books }));
  console.log(`${id}: ${verses} verses`);
}
