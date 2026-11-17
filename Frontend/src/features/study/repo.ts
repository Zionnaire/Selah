import {
  buildSections,
  hasVerse,
  type PassageRef,
  type Study,
  type StudyDoc,
} from '@selah/domain';
import { getDb } from '@/data/client';
import type { StudyRow } from '@/data/types';
import type { AutosaveIo } from '@/lib/useAutosave';
import { sermonRepo } from '../sermons/repo';

const toStudy = (r: StudyRow): Study => ({
  ...(JSON.parse(r.doc) as StudyDoc),
  id: r.id,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

export const studyRepo = {
  async list(): Promise<Study[]> {
    return (await getDb().studies()).map(toStudy);
  },

  async create(doc: StudyDoc): Promise<string> {
    const id = crypto.randomUUID();
    await studyRepo.save(id, doc);
    return id;
  },

  save: (id: string, doc: StudyDoc) =>
    getDb().saveStudy({ id, title: doc.title.trim() || 'Untitled study', kind: doc.kind, doc: JSON.stringify(doc) }),

  remove: (id: string) => getDb().deleteStudy(id),

  /**
   * Turns a study into the first draft structure of a sermon: the passage and every collected
   * verse arrive as Scripture blocks. The student's own writing stays in the study.
   */
  async toSermon(doc: StudyDoc): Promise<string> {
    const refs: PassageRef[] = [];
    if (doc.passage) refs.push(doc.passage);
    for (const v of doc.verses) {
      if (refs.length >= 9) break;
      if (!refs.some((r) => hasVerse([{ id: '', ref: r, note: '', group: '' }], v.ref))) refs.push(v.ref);
    }
    const sections = buildSections('three-points', 30, doc.passage, () => crypto.randomUUID());
    const home = sections[1] ?? sections[0]!;
    home.blocks = refs.map((ref) => ({ id: crypto.randomUUID(), type: 'scripture' as const, ref }));
    const id = crypto.randomUUID();
    await sermonRepo.save(id, {
      title: doc.title.replace(/^Understanding /, '') || 'Untitled sermon',
      passage: doc.passage,
      status: 'idea',
      targetMinutes: 30,
      sections,
    });
    return id;
  },
};

export const studyIo: AutosaveIo<StudyDoc> = {
  kind: 'study',
  async load(id) {
    const r = await getDb().study(id);
    if (!r) return null;
    const { id: _i, createdAt: _c, updatedAt, ...doc } = toStudy(r);
    return { doc, updatedAt };
  },
  save: (id, doc) => studyRepo.save(id, doc),
};
