import { z } from 'zod';
import type { PassageRef } from './reference';

/** What a note is attached to. A note outlives anything it links to. */
export type NoteLink =
  | { type: 'passage'; ref: PassageRef }
  | { type: 'sermon'; id: string; title: string };

export interface NoteDoc {
  title: string;
  body: string;
  links: NoteLink[];
}

export interface Note extends NoteDoc {
  id: string;
  createdAt: number;
  updatedAt: number;
}

const passage = z.object({
  book: z.string().min(2).max(3),
  chapter: z.number().int().min(1).max(150),
  verseStart: z.number().int().min(1).max(176),
  verseEnd: z.number().int().min(0).max(176),
});

export const noteDocSchema = z.object({
  title: z.string().max(200),
  body: z.string().max(100_000),
  links: z
    .array(
      z.discriminatedUnion('type', [
        z.object({ type: z.literal('passage'), ref: passage }),
        z.object({ type: z.literal('sermon'), id: z.string(), title: z.string().max(200) }),
      ]),
    )
    .max(50),
});

/** Title shown in lists when the user left it blank. */
export const noteDisplayTitle = (n: Pick<NoteDoc, 'title' | 'body'>): string => {
  if (n.title.trim()) return n.title.trim();
  const line = n.body.trim().split('\n')[0]?.trim();
  return line ? line.slice(0, 80) : 'Untitled note';
};
