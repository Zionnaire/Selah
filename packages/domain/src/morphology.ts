import type { OriginalLanguage } from './original';

/**
 * Turns grammar codes into plain English for a student. When a code is not understood the raw
 * code is returned unchanged. A wrong parse is worse than no parse.
 */
const CASE: Record<string, string> = { N: 'nominative', G: 'genitive', D: 'dative', A: 'accusative', V: 'vocative' };
const NUM: Record<string, string> = { S: 'singular', P: 'plural' };
const GEN: Record<string, string> = { M: 'masculine', F: 'feminine', N: 'neuter' };
const PERSON: Record<string, string> = { '1': 'first person', '2': 'second person', '3': 'third person' };
const TENSE: Record<string, string> = { P: 'present', I: 'imperfect', F: 'future', A: 'aorist', R: 'perfect', L: 'pluperfect' };
const VOICE: Record<string, string> = {
  A: 'active', M: 'middle', P: 'passive', E: 'middle or passive',
  D: 'middle deponent', O: 'passive deponent', N: 'middle or passive deponent', Q: 'impersonal active',
};
const MOOD: Record<string, string> = { I: 'indicative', S: 'subjunctive', O: 'optative', M: 'imperative', N: 'infinitive', P: 'participle' };

const GREEK_POS: Record<string, string> = {
  N: 'noun', T: 'article', A: 'adjective', P: 'personal pronoun', R: 'relative pronoun', D: 'demonstrative pronoun',
  C: 'reciprocal pronoun', F: 'reflexive pronoun', I: 'interrogative pronoun', X: 'indefinite pronoun', S: 'possessive pronoun',
  Q: 'correlative pronoun', K: 'correlative pronoun',
};
const GREEK_WORDS: Record<string, string> = {
  CONJ: 'conjunction', PREP: 'preposition', ADV: 'adverb', INJ: 'interjection', COND: 'conditional particle',
  PRT: 'particle', 'PRT-N': 'negative particle', 'PRT-I': 'interrogative particle', HEB: 'Hebrew word', ARAM: 'Aramaic word',
};
const GREEK_SUB: Record<string, string> = { P: 'proper name', L: 'place name', T: 'title' };

const join = (...parts: (string | undefined)[]) => parts.filter(Boolean).join(', ');

function cng(s: string): string | undefined {
  // case, number, gender, for example NSF
  if (s.length < 2) return undefined;
  const [c, n, g] = [s[0]!, s[1]!, s[2]];
  if (!CASE[c] || !NUM[n] || (g && !GEN[g])) return undefined;
  return join(CASE[c], NUM[n], g ? GEN[g] : undefined);
}

function describeGreek(code: string): string {
  if (GREEK_WORDS[code]) return GREEK_WORDS[code]!;
  const [pos, a, b, c] = code.split('-');
  if (!pos) return code;

  if (pos === 'V') {
    if (!a) return code;
    // tense (with an optional leading 2 for "second"), voice, mood
    const second = a.startsWith('2');
    const body = second ? a.slice(1) : a;
    if (body.length !== 3) return code;
    const [t, v, m] = [body[0]!, body[1]!, body[2]!];
    if (!TENSE[t] || !VOICE[v] || !MOOD[m]) return code;
    const verb = `${second ? 'second ' : ''}${TENSE[t]} ${VOICE[v]} ${MOOD[m]}`;
    if (m === 'P') {
      const x = b ? cng(b) : undefined;
      return b && !x ? code : join('verb', verb, x);
    }
    if (m === 'N') return join('verb', verb);
    if (b && b.length === 2 && PERSON[b[0]!] && NUM[b[1]!]) return join('verb', verb, `${PERSON[b[0]!]} ${NUM[b[1]!]}`);
    return b ? code : join('verb', verb);
  }

  const kind = GREEK_POS[pos];
  if (!kind) return code;
  if (!a) return kind;
  // personal pronoun with a person: P-2GS
  if (a.length === 3 && PERSON[a[0]!] && CASE[a[1]!] && NUM[a[2]!]) {
    return join(kind, PERSON[a[0]!], CASE[a[1]!], NUM[a[2]!]);
  }
  const x = cng(a);
  if (!x) return code;
  const sub = [b, c].map((s) => (s ? GREEK_SUB[s] : undefined)).find(Boolean);
  return join(kind, x, sub);
}

// ---------- Hebrew (ETCBC based codes as used by STEPBible, after the leading H) ----------
const H_STEM: Record<string, string> = {
  q: 'qal', N: 'niphal', p: 'piel', P: 'pual', h: 'hiphil', H: 'hophal', t: 'hithpael', o: 'polel', O: 'polal',
  r: 'hithpolel', m: 'poel', M: 'poal', k: 'palel', K: 'pulal', Q: 'qal passive', l: 'pilpel', L: 'polpal', f: 'cohortative stem', D: 'hophal stem', j: 'pealal', i: 'pilel', u: 'hothpaal', c: 'tiphil', v: 'hithpalpel', w: 'nithpael', y: 'nithpoel', z: 'hithpoel',
};
const H_ASPECT: Record<string, string> = {
  p: 'perfect', q: 'sequential perfect', i: 'imperfect', w: 'sequential imperfect', h: 'cohortative', j: 'jussive',
  v: 'imperative', r: 'active participle', s: 'passive participle', a: 'infinitive absolute', c: 'infinitive construct',
};
const H_PERSON: Record<string, string> = { '1': 'first person', '2': 'second person', '3': 'third person' };
const H_GENDER: Record<string, string> = { m: 'masculine', f: 'feminine', b: 'masculine or feminine', c: 'common' };
const H_NUMBER: Record<string, string> = { s: 'singular', p: 'plural', d: 'dual' };
const H_STATE: Record<string, string> = { a: 'absolute', c: 'construct', d: 'determined' };
const H_NOUN: Record<string, string> = { c: 'common noun', p: 'proper noun', g: 'gentilic noun', t: 'proper noun' };
const H_PARTICLE: Record<string, string> = {
  a: 'affirmation', d: 'definite article', e: 'exhortation', i: 'interrogative', j: 'interjection', m: 'demonstrative',
  n: 'negation', o: 'direct object marker', r: 'relative particle',
};
const H_PRONOUN: Record<string, string> = { p: 'personal pronoun', d: 'demonstrative pronoun', f: 'interrogative pronoun', i: 'indefinite pronoun', r: 'relative pronoun' };
const H_SUFFIX: Record<string, string> = { p: 'pronominal suffix', d: 'directional ending', h: 'paragogic he', n: 'paragogic nun', e: 'emphatic ending' };
const H_ADJ: Record<string, string> = { a: 'adjective', c: 'cardinal number', g: 'gentilic adjective', o: 'ordinal number' };

function describeHebrew(code: string): string {
  // Aramaic words are coded H + A + the usual letters (HAC, HANcbsa, HAVqp3ms). A Hebrew adjective
  // is H + A + a lowercase type, so an uppercase part of speech after HA means Aramaic.
  if (/^HA[CRDTSPNV]/.test(code)) {
    const inner = describeHebrew(`H${code.slice(2)}`);
    return inner === `H${code.slice(2)}` ? code : `Aramaic ${inner}`;
  }
  const s = code.replace(/^H/, '');
  const pos = s[0];
  const rest = s.slice(1);
  switch (pos) {
    case 'C':
      return 'conjunction';
    case 'R':
      return 'preposition';
    case 'D':
      return 'adverb';
    case 'T':
      return rest ? (H_PARTICLE[rest[0]!] ?? 'particle') : 'particle';
    case 'S': {
      if (!rest) return 'suffix';
      const [t, p, g, n] = [rest[0]!, rest[1], rest[2], rest[3]];
      const kind = H_SUFFIX[t];
      if (!kind) return code;
      const who = p && H_PERSON[p] ? `${H_PERSON[p]} ${g ? (H_GENDER[g] ?? '') : ''} ${n ? (H_NUMBER[n] ?? '') : ''}`.replace(/\s+/g, ' ').trim() : '';
      return join(kind, who || undefined);
    }
    case 'P': {
      const kind = H_PRONOUN[rest[0] ?? ''];
      if (!kind) return code;
      const [p, g, n] = [rest[1], rest[2], rest[3]];
      return join(kind, p && H_PERSON[p], g && H_GENDER[g], n && H_NUMBER[n]);
    }
    case 'N': {
      const [t, g, n, st] = [rest[0], rest[1], rest[2], rest[3]];
      if (!t || !H_NOUN[t]) return code;
      return join(H_NOUN[t], g && H_GENDER[g], n && H_NUMBER[n], st && H_STATE[st]);
    }
    case 'A': {
      const [t, g, n, st] = [rest[0], rest[1], rest[2], rest[3]];
      if (!t || !H_ADJ[t]) return code;
      return join(H_ADJ[t], g && H_GENDER[g], n && H_NUMBER[n], st && H_STATE[st]);
    }
    case 'V': {
      const [stem, aspect] = [rest[0], rest[1]];
      if (!stem || !aspect || !H_STEM[stem] || !H_ASPECT[aspect]) return code;
      const tail = rest.slice(2);
      let who: string | undefined;
      if (/^[123][mfbc][spd]$/.test(tail)) who = `${H_PERSON[tail[0]!]}, ${H_GENDER[tail[1]!]}, ${H_NUMBER[tail[2]!]}`;
      else if (/^[mfbc][spd][acd]?$/.test(tail)) who = join(H_GENDER[tail[0]!], H_NUMBER[tail[1]!], tail[2] ? H_STATE[tail[2]] : undefined);
      else if (tail === '' || tail === 'c' || tail === 'a') who = tail ? H_STATE[tail] : undefined;
      else return code;
      return join('verb', H_STEM[stem], H_ASPECT[aspect], who);
    }
    default:
      return code;
  }
}

export function describeGrammar(code: string, language: OriginalLanguage): string {
  if (!code) return '';
  return language === 'greek' ? describeGreek(code) : describeHebrew(code);
}

/** One short word for the card: verb, noun, particle ... */
export function partOfSpeech(code: string, language: OriginalLanguage): string {
  return describeGrammar(code, language).split(',')[0] ?? '';
}
