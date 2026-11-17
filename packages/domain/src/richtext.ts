import { parseReference, type PassageRef } from './reference';

export type RichSegment =
  | { kind: 'text'; text: string }
  | { kind: 'entry'; term: string }
  | { kind: 'ref'; text: string; ref: PassageRef };

const ENTRY = /\[\[([^\]]+)\]\]/;
const GROUP = /\(([^()]*?\d+:\d+[^()]*?)\)/g;
const BARE = /^\d+:\d+(?:[-–]\d+)?$/;

/**
 * Splits one parenthesised list of references, "Numbers 26:59; 33:39", into links. A token that
 * is only chapter and verse takes the book of the one before it. If any token cannot be read
 * as a reference, nothing in the group is linked, so the text is never mangled.
 */
function referenceGroup(inner: string): RichSegment[] | null {
  const parts = inner.split(/(\s*;\s*)/);
  const out: RichSegment[] = [];
  let book = '';
  for (const part of parts) {
    if (/^\s*;\s*$/.test(part)) {
      out.push({ kind: 'text', text: part });
      continue;
    }
    const token = part.trim();
    const lead = part.slice(0, part.length - part.trimStart().length);
    const trail = part.slice(part.trimEnd().length);
    const ref = BARE.test(token) && book ? parseReference(`${book} ${token}`) : parseReference(token);
    if (!ref || (!BARE.test(token) && !/\d+:\d+/.test(token))) return null;
    if (!BARE.test(token)) book = token.replace(/\s*\d+:\d+.*$/, '').trim();
    if (lead) out.push({ kind: 'text', text: lead });
    out.push({ kind: 'ref', text: token, ref });
    if (trail) out.push({ kind: 'text', text: trail });
  }
  return out;
}

function withScripture(text: string): RichSegment[] {
  const out: RichSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(GROUP)) {
    const group = referenceGroup(m[1]!);
    if (!group) continue;
    if (m.index! > last) out.push({ kind: 'text', text: text.slice(last, m.index) });
    out.push({ kind: 'text', text: '(' }, ...group, { kind: 'text', text: ')' });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out;
}

/** Turns dictionary text with [[Entry]] markers and verse lists into segments a screen can render. */
export function parseDictionaryText(text: string): RichSegment[] {
  const out: RichSegment[] = [];
  const pieces = text.split(new RegExp(ENTRY.source, 'g'));
  pieces.forEach((piece, i) => {
    if (i % 2 === 1) out.push({ kind: 'entry', term: piece });
    else if (piece) out.push(...withScripture(piece));
  });
  return out;
}
