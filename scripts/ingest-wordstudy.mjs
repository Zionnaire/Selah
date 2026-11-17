// Builds the Word Study dataset: original language words for every verse plus a lexicon.
//
//   node scripts/ingest-wordstudy.mjs                    downloads sources and builds
//   node scripts/ingest-wordstudy.mjs --cache <dir>      reuses files already downloaded to <dir>
//
// Sources and licences (reviewed in docs/lexicon-licence-review.md):
//   STEPBible-Data, Tyndale House Cambridge, CC BY 4.0   https://github.com/STEPBible/STEPBible-Data
//     TAHOT  Hebrew OT, word by word      TAGNT  Greek NT, word by word
//     TBESH  Hebrew lexicon (lemma, transliteration, part of speech, gloss ONLY)
//     TBESG  Greek lexicon (the same fields ONLY)
//   OpenScriptures Hebrew Lexicon, CC BY 4.0 (Strong's and BDB text are public domain)
//     HebrewStrong.xml  Hebrew definitions
//
// Deliberately NOT used:
//   * TBESH "Meaning" column. It derives from the Online Bible abridgement and its header says
//     permission must be obtained from Online Bible before use.
//   * TBESG definitions (Abbott-Smith). The edition's copyright status is unverified.
//   * Greek words that exist only in modern critical editions. The Greek base text is the Textus
//     Receptus (Scrivener 1894, the text behind the KJV), which is public domain.
//
// Output (Frontend/public/data):
//   original-ot.json, original-nt.json   { first, strongs[], grammar[], books[book][chapter][verse] = [[word, translit, gloss, strongIdx, grammarIdx], ...] }
//   lexicon.json                         { "H7225G": { l, x, p, g, d?, u? } }
//   wordstudy-sources.json               where the data came from, exact commits, licences
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'Frontend', 'public', 'data');
const cacheArg = process.argv.indexOf('--cache');
const CACHE = cacheArg > -1 ? process.argv[cacheArg + 1] : join(tmpdir(), 'selah-step');
mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT, { recursive: true });

const STEP = 'https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master';
const FILES = {
  'tahot1.txt': `${STEP}/Translators Amalgamated OT+NT/TAHOT Gen-Deu - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt`,
  'tahot2.txt': `${STEP}/Translators Amalgamated OT+NT/TAHOT Jos-Est - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt`,
  'tahot3.txt': `${STEP}/Translators Amalgamated OT+NT/TAHOT Job-Sng - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt`,
  'tahot4.txt': `${STEP}/Translators Amalgamated OT+NT/TAHOT Isa-Mal - Translators Amalgamated Hebrew OT - STEPBible.org CC BY.txt`,
  'tagnt1.txt': `${STEP}/Translators Amalgamated OT+NT/TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt`,
  'tagnt2.txt': `${STEP}/Translators Amalgamated OT+NT/TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt`,
  'tbesh.txt': `${STEP}/Lexicons/TBESH - Translators Brief lexicon of Extended Strongs for Hebrew - STEPBible.org CC BY.txt`,
  'tbesg.txt': `${STEP}/Lexicons/TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt`,
  'hebstrong.xml': 'https://raw.githubusercontent.com/openscriptures/HebrewLexicon/master/HebrewStrong.xml',
};

const enc = (u) => u.replace(/ /g, '%20').replace(/\+/g, '%2B');

async function load(name) {
  const path = join(CACHE, name);
  if (!existsSync(path)) {
    process.stdout.write(`downloading ${name} ... `);
    const res = await fetch(enc(FILES[name]));
    if (!res.ok) throw new Error(`${res.status} ${name}`);
    writeFileSync(path, Buffer.from(await res.arrayBuffer()));
    console.log('ok');
  }
  return readFileSync(path, 'utf8').replace(/^﻿/, '');
}

async function commitOf(repo) {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/commits/master`, { headers: { 'User-Agent': 'selah-ingest' } });
    return res.ok ? (await res.json()).sha : 'unknown';
  } catch {
    return 'unknown';
  }
}

// STEPBible uses the same three letter codes as our canonical ids, in title case.
const BOOK_ORDER = [
  'Gen','Exo','Lev','Num','Deu','Jos','Jdg','Rut','1Sa','2Sa','1Ki','2Ki','1Ch','2Ch','Ezr','Neh','Est','Job','Psa','Pro',
  'Ecc','Sng','Isa','Jer','Lam','Ezk','Dan','Hos','Jol','Amo','Oba','Jon','Mic','Nam','Hab','Zep','Hag','Zec','Mal',
  'Mat','Mrk','Luk','Jhn','Act','Rom','1Co','2Co','Gal','Eph','Php','Col','1Th','2Th','1Ti','2Ti','Tit','Phm','Heb','Jas',
  '1Pe','2Pe','1Jn','2Jn','3Jn','Jud','Rev',
];
const BOOK_NO = new Map(BOOK_ORDER.map((c, i) => [c, i + 1]));

const clean = (s) => s.replace(/\s+/g, ' ').trim();

// ---------- lexicons ----------
function parseLexicon(text, lang) {
  const out = new Map();
  for (const line of text.split('\n')) {
    const c = line.split('\t');
    if (!/^[HG]\d{4}/.test(c[0] ?? '')) continue;
    const key = (c[1] ?? '').replace(/\s*=.*/, '').trim();
    if (!key) continue;
    // columns: eStrong, dStrong =, uStrong, lemma, transliteration, part of speech, gloss, [meaning: NOT USED]
    const entry = {
      l: clean(c[3] ?? ''),
      x: clean(c[4] ?? ''),
      p: clean((c[5] ?? '').replace(/^[HG]:/, '')),
      g: clean(c[6] ?? ''),
    };
    if (!out.has(key)) out.set(key, entry);
  }
  console.log(`${lang} lexicon entries: ${out.size}`);
  return out;
}

const strip = (s) =>
  clean(s.replace(/<w[^>]*>([^<]*)<\/w>/g, '$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));

function parseHebrewStrong(xml) {
  const defs = new Map();
  for (const m of xml.matchAll(/<entry id="(H\d+)">([\s\S]*?)<\/entry>/g)) {
    const meaning = /<meaning>([\s\S]*?)<\/meaning>/.exec(m[2])?.[1];
    const usage = /<usage>([\s\S]*?)<\/usage>/.exec(m[2])?.[1];
    defs.set(m[1], { d: meaning ? strip(meaning) : '', u: usage ? strip(usage).replace(/\.$/, '') : '' });
  }
  console.log(`Hebrew Strong definitions: ${defs.size}`);
  return defs;
}

// ---------- word tables ----------
class Table {
  constructor(first) {
    this.first = first;
    this.strongs = [];
    this.grammar = [];
    this.sIdx = new Map();
    this.gIdx = new Map();
    this.books = [];
    this.count = 0;
  }
  idx(list, map, v) {
    if (!map.has(v)) (map.set(v, list.length), list.push(v));
    return map.get(v);
  }
  add(bookNo, ch, v, row) {
    const b = (this.books[bookNo - this.first] ??= []);
    const c = (b[ch - 1] ??= []);
    (c[v - 1] ??= []).push(row);
    this.count++;
  }
  push(bookNo, ch, v, w, t, g, strong, gram) {
    this.add(bookNo, ch, v, [w, t, g, this.idx(this.strongs, this.sIdx, strong), this.idx(this.grammar, this.gIdx, gram)]);
  }
  finish() {
    // Dense arrays: a sparse array serialises its holes as null, which would crash readers.
    // Array.from visits holes too, so missing books, chapters and verses become [].
    const dense = (a) => Array.from(a ?? [], (x) => x ?? []);
    const books = dense(this.books).map((b) => dense(b).map((c) => dense(c)));
    return { first: this.first, strongs: this.strongs, grammar: this.grammar, books };
  }
}

const HEB_REF = /^([1-3]?[A-Za-z]{2,3})\.(\d+)\.(\d+)(?:\([^)]*\))?#(\d+)=(\w+)/;

function parseHebrew(text, table, stats) {
  for (const line of text.split('\n')) {
    const m = HEB_REF.exec(line);
    if (!m) continue;
    const [, code, ch, vs, , type] = m;
    const book = BOOK_NO.get(code);
    if (!book || book > 39 || Number(vs) === 0) {
      if (Number(vs) === 0) stats.titles++;
      continue; // psalm titles are verse 0 in the source and have no verse in our Bibles
    }
    // L Leningrad, Q Qere (the reading translators follow), R restored text. K and X are variants.
    if (!/^[LQR]/.test(type)) {
      stats.skipped++;
      continue;
    }
    const c = line.split('\t');
    const word = (c[1] ?? '').replace(/[\\/]/g, '').replace(/׃/g, '').trim();
    if (!word) continue;
    const translit = (c[2] ?? '').replace(/[./\\]/g, '').trim();
    const gloss = clean((c[3] ?? '').replace(/\//g, ' ').replace(/[<>]/g, ''));
    const root = /\{([HG]\d+[A-Za-z]?)\}/.exec(c[4] ?? '')?.[1] ?? /^\{?([HG]\d+[A-Za-z]?)/.exec(c[4] ?? '')?.[1];
    if (!root) continue;
    const gram = (c[5] ?? '').split('/').pop().trim();
    table.push(book, Number(ch), Number(vs), word, translit, gloss, root, gram.startsWith('H') ? gram : `H${gram}`);
  }
}

const GRK_REF = /^([1-3]?[A-Za-z]{2,3})\.(\d+)\.(\d+)#(\d+)=(\S+)/;

function parseGreek(text, table, stats) {
  for (const line of text.split('\n')) {
    const m = GRK_REF.exec(line);
    if (!m) continue;
    const [, code, ch, vs, , type] = m;
    const book = BOOK_NO.get(code);
    if (!book || book < 40) continue;
    // Textus Receptus words only: a capital K anywhere in the type. This is the KJV's Greek text.
    if (!type.includes('K')) {
      stats.skipped++;
      continue;
    }
    const c = line.split('\t');
    const wm = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(c[1] ?? '');
    // Punctuation belongs to the text, not the word: it would break matching of the same word.
    const word = clean(wm ? wm[1] : (c[1] ?? '')).replace(/[,.;:··]/g, '');
    const translit = (wm ? wm[2] : '').replace(/[,.;:]/g, '');
    const gloss = clean(c[2] ?? '').replace(/[,.;:]+$/, '');
    // "G1722=PREP", and for Old Testament names quoted in Greek: "H3327|G2464«G2464=N-ASM-P"
    const sg = (c[3] ?? '').split('«').pop();
    const [strongRaw, gram = ''] = sg.split('=');
    const strong = /^([HG]\d+[A-Za-z]?)/.exec(strongRaw.split('|').pop())?.[1];
    if (!word || !strong) continue;
    table.push(book, Number(ch), Number(vs), word, translit, gloss, strong, gram.trim());
  }
}

// ---------- run ----------
const hebLex = parseLexicon(await load('tbesh.txt'), 'Hebrew');
const grkLex = parseLexicon(await load('tbesg.txt'), 'Greek');
const hebDefs = parseHebrewStrong(await load('hebstrong.xml'));

const ot = new Table(1);
const nt = new Table(40);
const stats = { titles: 0, skipped: 0 };
for (const f of ['tahot1.txt', 'tahot2.txt', 'tahot3.txt', 'tahot4.txt']) parseHebrew(await load(f), ot, stats);
for (const f of ['tagnt1.txt', 'tagnt2.txt']) parseGreek(await load(f), nt, stats);
console.log(`Hebrew words: ${ot.count}, Greek words: ${nt.count}, variant rows skipped: ${stats.skipped}, psalm titles skipped: ${stats.titles}`);

// lexicon entries for the strongs actually used
const lexicon = {};
const miss = { H: 0, G: 0 };
for (const s of new Set([...ot.strongs, ...nt.strongs])) {
  const isHeb = s.startsWith('H');
  const base = (isHeb ? hebLex : grkLex);
  const e = base.get(s) ?? base.get(s.replace(/[A-Za-z]$/, ''));
  if (!e) {
    miss[s[0]]++;
    continue;
  }
  const entry = { ...e };
  if (isHeb) {
    const def = hebDefs.get(`H${Number(s.slice(1).replace(/\D/g, ''))}`);
    if (def?.d) entry.d = def.d;
    if (def?.u) entry.u = def.u;
  }
  lexicon[s] = entry;
}
console.log(`lexicon entries written: ${Object.keys(lexicon).length}; strongs without a lexicon entry: Hebrew ${miss.H}, Greek ${miss.G}`);

writeFileSync(join(OUT, 'original-ot.json'), JSON.stringify(ot.finish()));
writeFileSync(join(OUT, 'original-nt.json'), JSON.stringify(nt.finish()));
writeFileSync(join(OUT, 'lexicon.json'), JSON.stringify(lexicon));

const sources = {
  built: new Date().toISOString().slice(0, 10),
  note: 'Derived and reformatted for SELAH. Changes: word rows compacted, slashes and punctuation markers removed, Hebrew words from variant manuscripts and psalm titles left out, Greek limited to the Textus Receptus words, lexicon limited to lemma, transliteration, part of speech and gloss, Hebrew definitions added from OpenScriptures.',
  sources: [
    { name: 'STEPBible-Data (Tyndale House, Cambridge, and STEPBible.org)', url: 'https://github.com/STEPBible/STEPBible-Data', licence: 'CC BY 4.0', commit: await commitOf('STEPBible/STEPBible-Data'), used: 'TAHOT, TAGNT, TBESH and TBESG, limited fields' },
    { name: 'OpenScriptures Hebrew Lexicon', url: 'https://github.com/openscriptures/HebrewLexicon', licence: 'CC BY 4.0 (Strong\'s and BDB text are public domain)', commit: await commitOf('openscriptures/HebrewLexicon'), used: 'HebrewStrong.xml definitions' },
  ],
  excluded: ['TBESH Meaning column (Online Bible permission required)', 'TBESG definitions (Abbott-Smith edition status unverified)', 'Tagged-Bibles/TTESV (CC BY-NC)'],
};
writeFileSync(join(OUT, 'wordstudy-sources.json'), JSON.stringify(sources, null, 2));
console.log('done');
