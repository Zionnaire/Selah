import { firstSentence, type Block, type SermonDoc } from './sermon';
import { formatReference, type PassageRef } from './reference';

export type ExportFormat = 'pulpit' | 'manuscript' | 'outline';

export interface ExportOptions {
  format: ExportFormat;
  /** Print the Scripture text. When off, only the reference appears. */
  scripture: boolean;
  /** Include pulpit cues. Never included in the printable outline. */
  cues: boolean;
  /** Pulpit Edition only: tell stories in full instead of a one line prompt. */
  stories: boolean;
}

export interface VerseText {
  verse: number;
  text: string;
}

export type ExportItem =
  | { kind: 'bullet'; text: string }
  | { kind: 'para'; text: string }
  | { kind: 'scripture'; ref: string; verses?: VerseText[] }
  | { kind: 'cue'; text: string }
  | { kind: 'story'; title: string; text: string };

export interface ExportModel {
  title: string;
  passage?: string;
  preachDate?: string;
  format: ExportFormat;
  sections: { title: string; items: ExportItem[] }[];
}

type Lookup = (ref: PassageRef) => VerseText[] | undefined;

const blockItems = (b: Block, o: ExportOptions, lookup: Lookup): ExportItem[] => {
  const full = o.format === 'manuscript';
  switch (b.type) {
    case 'text':
    case 'application': {
      if (!b.text.trim()) return [];
      return full ? [{ kind: 'para', text: b.text.trim() }] : [{ kind: 'bullet', text: firstSentence(b.text) }];
    }
    case 'story': {
      if (!b.title.trim() && !b.text.trim()) return [];
      if (full || (o.format === 'pulpit' && o.stories)) return [{ kind: 'story', title: b.title.trim(), text: b.text.trim() }];
      return [{ kind: 'bullet', text: b.title.trim() || firstSentence(b.text) }];
    }
    case 'cue':
      return o.cues && o.format !== 'outline' && b.text.trim() ? [{ kind: 'cue', text: b.text.trim() }] : [];
    case 'scripture': {
      const ref = formatReference(b.ref);
      const wantText = o.scripture && o.format !== 'outline';
      return [{ kind: 'scripture', ref, verses: wantText ? lookup(b.ref) : undefined }];
    }
  }
};

/** One pure function feeds the on-screen preview, print and plain text, so they cannot disagree. */
export function buildExport(doc: SermonDoc, options: ExportOptions, lookup: Lookup): ExportModel {
  return {
    title: doc.title.trim() || 'Untitled sermon',
    passage: doc.passage ? formatReference(doc.passage) : undefined,
    preachDate: doc.preachDate,
    format: options.format,
    // Sections with nothing to print are left out, so a page never carries empty headings.
    sections: doc.sections
      .map((s) => ({
        title: s.title.trim() || 'Untitled section',
        items: s.blocks.flatMap((b) => blockItems(b, options, lookup)),
      }))
      .filter((s) => s.items.length > 0),
  };
}

export function modelToText(m: ExportModel, attribution: string): string {
  const lines: string[] = [m.title];
  if (m.passage) lines.push(m.passage);
  lines.push('');
  m.sections.forEach((s, i) => {
    lines.push(`${i + 1}. ${s.title}`, '');
    for (const it of s.items) {
      switch (it.kind) {
        case 'bullet':
          lines.push(`  - ${it.text}`);
          break;
        case 'para':
          lines.push(it.text, '');
          break;
        case 'cue':
          lines.push(`[${it.text}]`, '');
          break;
        case 'story':
          lines.push(...(it.title ? [it.title] : []), it.text, '');
          break;
        case 'scripture':
          lines.push(
            it.verses?.length ? `${it.ref}: ${it.verses.map((v) => `${v.verse} ${v.text}`).join(' ')}` : it.ref,
            '',
          );
          break;
      }
    }
    lines.push('');
  });
  lines.push(attribution);
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}
