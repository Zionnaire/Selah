import { z } from 'zod';
import { getBook } from './books';
import type { PassageRef } from './reference';

/** What SELAH can be asked to suggest while preparing a sermon. */
export const SUGGEST_KINDS = ['point', 'introduction', 'conclusion'] as const;
export type SuggestKind = (typeof SUGGEST_KINDS)[number];

export const SUGGEST_LABEL: Record<SuggestKind, string> = {
  point: 'A main point',
  introduction: 'An introduction',
  conclusion: 'A conclusion',
};

const passageSchema = z.object({
  book: z.string().min(2).max(3),
  chapter: z.number().int().min(1).max(150),
  verseStart: z.number().int().min(1).max(176),
  verseEnd: z.number().int().min(0).max(176),
});

/**
 * The sermon's own context, sent only when the preacher asks. Excerpts are short and capped, so a
 * request stays small and nothing more of the sermon leaves the device than the question needs.
 */
export const suggestRequestSchema = z
  .object({
    kind: z.enum(SUGGEST_KINDS),
    topic: z.string().trim().max(300).optional(),
    title: z.string().trim().max(200).optional(),
    series: z.string().trim().max(120).optional(),
    passage: passageSchema.optional(),
    /** Scripture already in the sermon. */
    scriptures: z.array(passageSchema).max(20).default([]),
    /** Sections so far, with a short excerpt of what was written. */
    outline: z
      .array(z.object({ title: z.string().max(200), excerpt: z.string().max(600) }))
      .max(20)
      .default([]),
    /** The section the suggestion is for. */
    section: z.string().max(200).optional(),
    count: z.number().int().min(1).max(3).default(3),
  })
  .refine((r) => !!r.topic || !!r.passage || r.scriptures.length > 0, {
    message: 'Add a topic or a passage first',
    path: ['topic'],
  })
  .refine((r) => [r.passage, ...r.scriptures].every((p) => !p || isRealReference(p)), {
    message: 'A passage is not in the Bible',
    path: ['passage'],
  });

export type SuggestRequest = z.infer<typeof suggestRequestSchema>;

/** A proposal. The preacher edits it and chooses whether to add it. Never Scripture text. */
export interface Suggestion {
  heading: string;
  body: string;
  refs: PassageRef[];
}

export interface SuggestResponse {
  suggestions: Suggestion[];
  /** Suggestions left today for this account. */
  remaining: number;
  limit: number;
}

const MAX_REFS = 6;

/** True when the reference points inside the canon: a real book and a chapter that book has. */
export function isRealReference(r: PassageRef): boolean {
  const book = getBook(r.book);
  if (!book) return false;
  if (!Number.isInteger(r.chapter) || r.chapter < 1 || r.chapter > book.chapters) return false;
  if (!Number.isInteger(r.verseStart) || r.verseStart < 1) return false;
  if (!Number.isInteger(r.verseEnd) || r.verseEnd < 0) return false;
  return r.verseEnd === 0 || r.verseEnd >= r.verseStart;
}

const clean = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';

/**
 * Turns whatever the model returned into suggestions that are safe to show. Anything that is not
 * the expected shape is dropped, text is trimmed and capped, and a reference that is not in the
 * canon never reaches the person. The caller still checks verses against the installed Bible.
 */
export function parseSuggestions(raw: unknown, max = 3): Suggestion[] {
  const list = (raw as { suggestions?: unknown })?.suggestions;
  if (!Array.isArray(list)) return [];
  const out: Suggestion[] = [];
  for (const item of list) {
    if (out.length >= max) break;
    const it = item as { heading?: unknown; body?: unknown; refs?: unknown };
    const heading = clean(it.heading, 140);
    const body = clean(it.body, 700);
    if (!heading) continue;
    const refs: PassageRef[] = [];
    if (Array.isArray(it.refs)) {
      for (const r of it.refs) {
        const parsed = passageSchema.safeParse(r);
        if (!parsed.success) continue;
        const ref = parsed.data;
        if (!isRealReference(ref)) continue;
        const key = `${ref.book}.${ref.chapter}.${ref.verseStart}.${ref.verseEnd}`;
        if (refs.some((x) => `${x.book}.${x.chapter}.${x.verseStart}.${x.verseEnd}` === key)) continue;
        refs.push(ref);
        if (refs.length >= MAX_REFS) break;
      }
    }
    out.push({ heading, body, refs });
  }
  return out;
}
