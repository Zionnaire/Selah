import { noteDisplayTitle, type Note, type NoteDoc, type NoteLink } from '@selah/domain';
import { getDb } from '@/data/client';
import type { NoteRow } from '@/data/types';
import type { AutosaveIo } from '@/lib/useAutosave';

const parseLinks = (raw: string): NoteLink[] => {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as NoteLink[]) : [];
  } catch {
    return [];
  }
};

const toNote = (r: NoteRow): Note => ({
  id: r.id,
  title: r.title,
  body: r.body,
  links: parseLinks(r.links),
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

export const notesRepo = {
  async list(): Promise<Note[]> {
    return (await getDb().notes()).map(toNote);
  },

  async create(doc: NoteDoc): Promise<string> {
    const id = crypto.randomUUID();
    await notesRepo.save(id, doc);
    return id;
  },

  save: (id: string, doc: NoteDoc) =>
    getDb().saveNote({ id, title: doc.title, body: doc.body, links: JSON.stringify(doc.links) }),

  remove: (id: string) => getDb().deleteNote(id),
};

export const noteIo: AutosaveIo<NoteDoc> = {
  kind: 'note',
  async load(id) {
    const r = await getDb().note(id);
    if (!r) return null;
    const { title, body, links, updatedAt } = toNote(r);
    return { doc: { title, body, links }, updatedAt };
  },
  save: (id, doc) => notesRepo.save(id, doc),
};

export { noteDisplayTitle };
