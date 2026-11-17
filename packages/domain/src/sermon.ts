import { z } from 'zod';
import type { PassageRef } from './reference';

export const SERMON_STATUSES = ['idea', 'drafting', 'ready', 'delivered'] as const;
export type SermonStatus = (typeof SERMON_STATUSES)[number];

export const STATUS_LABEL: Record<SermonStatus, string> = {
  idea: 'Idea',
  drafting: 'Drafting',
  ready: 'Ready',
  delivered: 'Delivered',
};

/** Spoken pace used to turn words into minutes. Shown to the user, never hidden. */
export const WORDS_PER_MINUTE = 130;
/** The most sections one sermon may have. Also enforced by the schema and by sync. */
export const MAX_SECTIONS = 60;
/** Reading a passage aloud costs time too. Counted as this many words per scripture block. */
const SCRIPTURE_WORD_EQUIVALENT = 40;

export type BlockType = 'text' | 'scripture' | 'story' | 'application' | 'cue';

interface BlockBase {
  id: string;
}
export interface TextBlock extends BlockBase {
  type: 'text';
  text: string;
}
/** Stores the reference, not the words, so the translation can change later. */
export interface ScriptureBlock extends BlockBase {
  type: 'scripture';
  ref: PassageRef;
}
export interface StoryBlock extends BlockBase {
  type: 'story';
  title: string;
  text: string;
}
export interface ApplicationBlock extends BlockBase {
  type: 'application';
  text: string;
}
/** A note to self, never read aloud: "Pause", "Slow down", "Hold up the clay". */
export interface CueBlock extends BlockBase {
  type: 'cue';
  text: string;
}
export type Block = TextBlock | ScriptureBlock | StoryBlock | ApplicationBlock | CueBlock;

export interface Section {
  id: string;
  title: string;
  /** Time budget in minutes. */
  minutes: number;
  blocks: Block[];
}

export interface SermonDoc {
  title: string;
  passage?: PassageRef;
  status: SermonStatus;
  /** ISO date, yyyy-mm-dd */
  preachDate?: string;
  series?: string;
  /** What the sermon is about, in the preacher's words. Used as context when suggesting points. */
  topic?: string;
  targetMinutes: number;
  sections: Section[];
}

export interface Sermon extends SermonDoc {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export const countWords = (text: string): number => (text.trim() ? text.trim().split(/\s+/).length : 0);

/** Words that will be spoken. Cues are for the preacher, so they are not counted. */
export const blockWords = (b: Block): number => {
  switch (b.type) {
    case 'text':
    case 'application':
      return countWords(b.text);
    case 'story':
      return countWords(b.text);
    case 'scripture':
      return SCRIPTURE_WORD_EQUIVALENT;
    case 'cue':
      return 0;
  }
};

export const sectionWords = (s: Section): number => s.blocks.reduce((n, b) => n + blockWords(b), 0);

/** Spoken words only, ignoring scripture blocks, to tell whether a section has been started. */
const hasWrittenContent = (s: Section): boolean =>
  s.blocks.some((b) => (b.type === 'scripture' ? false : blockWords(b) > 0));

export const wordsToMinutes = (words: number): number => words / WORDS_PER_MINUTE;

export interface SermonSummary {
  words: number;
  writtenMinutes: number;
  sectionsTotal: number;
  sectionsStarted: number;
}

export const summarise = (doc: SermonDoc): SermonSummary => {
  const words = doc.sections.reduce((n, s) => n + sectionWords(s), 0);
  return {
    words,
    writtenMinutes: wordsToMinutes(words),
    sectionsTotal: doc.sections.length,
    sectionsStarted: doc.sections.filter(hasWrittenContent).length,
  };
};

/** 0 to 1 progress of one section against its time budget. */
export const sectionProgress = (s: Section): number =>
  s.minutes > 0 ? Math.min(1, wordsToMinutes(sectionWords(s)) / s.minutes) : 0;

export const sectionStarted = hasWrittenContent;

/** First sentence of a text block, used for the outline view in Pulpit Mode. */
export const firstSentence = (text: string): string => {
  const t = text.trim().replace(/\s+/g, ' ');
  const m = /^.*?[.!?](?=\s|$)/.exec(t);
  return (m ? m[0] : t).slice(0, 160);
};

// ---------- Templates ----------

export type TemplateId = 'three-points' | 'verse-by-verse' | 'blank';

export const TEMPLATES: { id: TemplateId; name: string; description: string }[] = [
  { id: 'three-points', name: 'Three points', description: 'Introduction, three points, conclusion and a response.' },
  { id: 'verse-by-verse', name: 'Verse by verse', description: 'One section for each part of the passage.' },
  { id: 'blank', name: 'Blank', description: 'A single section. Add structure as you go.' },
];

const WEIGHTS: Record<'three-points', [string, number][]> = {
  'three-points': [
    ['Introduction', 1],
    ['First point', 2],
    ['Second point', 2],
    ['Third point', 2],
    ['Conclusion', 1],
    ['Response and prayer', 1],
  ],
};

/** Splits the time budget by weight, rounded to whole minutes, with the remainder on the last. */
const allocate = (total: number, weights: number[]): number[] => {
  const sum = weights.reduce((a, b) => a + b, 0);
  const mins = weights.map((w) => Math.max(1, Math.round((total * w) / sum)));
  const drift = total - mins.reduce((a, b) => a + b, 0);
  mins[mins.length - 1] = Math.max(1, mins[mins.length - 1]! + drift);
  return mins;
};

export function buildSections(
  template: TemplateId,
  targetMinutes: number,
  passage: PassageRef | undefined,
  id: () => string,
  verseCount?: number,
): Section[] {
  const make = (titles: string[], weights: number[]): Section[] => {
    const mins = allocate(targetMinutes, weights);
    return titles.map((title, i) => ({ id: id(), title, minutes: mins[i]!, blocks: [] }));
  };

  if (template === 'three-points') {
    const rows = WEIGHTS['three-points'];
    return make(rows.map((r) => r[0]), rows.map((r) => r[1]));
  }

  if (template === 'verse-by-verse' && passage) {
    const end = passage.verseEnd || verseCount || passage.verseStart;
    const verses = Math.max(1, end - passage.verseStart + 1);
    // Group verses so a long passage does not become dozens of sections.
    const groupSize = Math.max(1, Math.ceil(verses / 6));
    const titles: string[] = ['Introduction'];
    for (let v = passage.verseStart; v <= end; v += groupSize) {
      const last = Math.min(end, v + groupSize - 1);
      titles.push(last > v ? `Verses ${v} to ${last}` : `Verse ${v}`);
    }
    titles.push('Conclusion');
    const weights = titles.map((t) => (t === 'Introduction' || t === 'Conclusion' ? 1 : 2));
    return make(titles, weights);
  }

  return make(['Message'], [1]);
}

export const newBlock = (type: BlockType, id: string, ref?: PassageRef): Block => {
  switch (type) {
    case 'text':
      return { id, type, text: '' };
    case 'story':
      return { id, type, title: '', text: '' };
    case 'application':
      return { id, type, text: '' };
    case 'cue':
      return { id, type, text: '' };
    case 'scripture':
      return {
        id,
        type,
        ref: ref ?? { book: 'GEN', chapter: 1, verseStart: 1, verseEnd: 1 },
      };
  }
};

// ---------- Validation (used by the API once sync exists) ----------

const passageSchema = z.object({
  book: z.string().min(2).max(3),
  chapter: z.number().int().min(1).max(150),
  verseStart: z.number().int().min(1).max(176),
  verseEnd: z.number().int().min(0).max(176),
});

const blockSchema = z.discriminatedUnion('type', [
  z.object({ id: z.string(), type: z.literal('text'), text: z.string().max(50_000) }),
  z.object({ id: z.string(), type: z.literal('scripture'), ref: passageSchema }),
  z.object({ id: z.string(), type: z.literal('story'), title: z.string().max(200), text: z.string().max(50_000) }),
  z.object({ id: z.string(), type: z.literal('application'), text: z.string().max(50_000) }),
  z.object({ id: z.string(), type: z.literal('cue'), text: z.string().max(1_000) }),
]);

export const sermonDocSchema = z.object({
  title: z.string().max(200),
  passage: passageSchema.optional(),
  status: z.enum(SERMON_STATUSES),
  preachDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  series: z.string().max(120).optional(),
  topic: z.string().max(300).optional(),
  targetMinutes: z.number().int().min(1).max(240),
  sections: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().max(200),
        minutes: z.number().min(0).max(240),
        blocks: z.array(blockSchema).max(500),
      }),
    )
    .max(MAX_SECTIONS),
});
