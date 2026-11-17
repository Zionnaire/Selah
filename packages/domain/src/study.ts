import { z } from 'zod';
import { formatReference, type PassageRef } from './reference';

/** Shown wherever cross-references appear. Required by the CC BY licence. */
export const CROSSREF_ATTRIBUTION =
  'Cross-references from OpenBible.info, licensed CC BY. These are links people have drawn between passages. Read each one in its context.';

/** The most sections one study may have. Also enforced by the schema and by sync. */
export const MAX_STUDY_SECTIONS = 40;

export type StudyKind = 'passage' | 'topic';

/** The user's own writing. SELAH never fills these in. */
export interface StudySection {
  id: string;
  heading: string;
  body: string;
}

export interface CollectedVerse {
  id: string;
  ref: PassageRef;
  /** Why this verse matters to the study, in the user's words. */
  note: string;
  /** Stage or theme label. Topic studies group their verses by it. */
  group: string;
}

export interface StudyDoc {
  title: string;
  kind: StudyKind;
  passage?: PassageRef;
  topic?: string;
  sections: StudySection[];
  verses: CollectedVerse[];
}

export interface Study extends StudyDoc {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export const STUDY_KIND_LABEL: Record<StudyKind, string> = {
  passage: 'Passage study',
  topic: 'Topic research',
};

/** Prompts, not content: they ask the questions and leave the answers to the student. */
const SECTION_HEADINGS: Record<StudyKind, string[]> = {
  passage: ['What the text says', 'What it meant then', 'What it asks of us'],
  topic: ['What I am asking', 'What the passages show', 'Where it leaves me'],
};

export function newStudy(
  input: { kind: StudyKind; passage?: PassageRef; topic?: string },
  id: () => string,
): StudyDoc {
  const title =
    input.kind === 'passage' && input.passage
      ? `Understanding ${formatReference(input.passage)}`
      : input.topic?.trim()
        ? `${input.topic.trim().replace(/^./, (c) => c.toUpperCase())} across Scripture`
        : 'Untitled study';
  return {
    title,
    kind: input.kind,
    passage: input.kind === 'passage' ? input.passage : undefined,
    topic: input.kind === 'topic' ? input.topic?.trim() : undefined,
    sections: SECTION_HEADINGS[input.kind].map((heading) => ({ id: id(), heading, body: '' })),
    verses: [],
  };
}

/** Collected verses grouped by their label, keeping first seen order. Ungrouped ones come first. */
export function groupVerses(verses: CollectedVerse[]): { group: string; verses: CollectedVerse[] }[] {
  const map = new Map<string, CollectedVerse[]>();
  for (const v of verses) {
    const key = v.group.trim();
    (map.get(key) ?? map.set(key, []).get(key)!).push(v);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a === '' ? -1 : b === '' ? 1 : 0))
    .map(([group, vs]) => ({ group, verses: vs }));
}

const sameRef = (a: PassageRef, b: PassageRef) =>
  a.book === b.book && a.chapter === b.chapter && a.verseStart === b.verseStart && a.verseEnd === b.verseEnd;

export const hasVerse = (verses: CollectedVerse[], ref: PassageRef) => verses.some((v) => sameRef(v.ref, ref));

const passageSchema = z.object({
  book: z.string().min(2).max(3),
  chapter: z.number().int().min(1).max(150),
  verseStart: z.number().int().min(1).max(176),
  verseEnd: z.number().int().min(0).max(176),
});

export const studyDocSchema = z.object({
  title: z.string().max(200),
  kind: z.enum(['passage', 'topic']),
  passage: passageSchema.optional(),
  topic: z.string().max(200).optional(),
  sections: z.array(z.object({ id: z.string(), heading: z.string().max(200), body: z.string().max(100_000) })).max(MAX_STUDY_SECTIONS),
  verses: z
    .array(z.object({ id: z.string(), ref: passageSchema, note: z.string().max(2_000), group: z.string().max(120) }))
    .max(500),
});
