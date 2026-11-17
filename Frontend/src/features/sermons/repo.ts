import {
  summarise,
  type PassageRef,
  type Sermon,
  type SermonDoc,
  type SermonStatus,
} from '@selah/domain';
import { getDb } from '@/data/client';
import type { SermonRow } from '@/data/types';

export interface SermonListItem {
  id: string;
  title: string;
  passage?: PassageRef;
  status: SermonStatus;
  preachDate?: string;
  series?: string;
  targetMinutes: number;
  writtenMinutes: number;
  sectionsTotal: number;
  sectionsStarted: number;
  updatedAt: number;
}

const toItem = (r: SermonRow): SermonListItem => ({
  id: r.id,
  title: r.title,
  passage: r.passage ? (JSON.parse(r.passage) as PassageRef) : undefined,
  status: r.status as SermonStatus,
  preachDate: r.preachDate ?? undefined,
  series: r.series ?? undefined,
  targetMinutes: r.targetMinutes,
  writtenMinutes: r.words / 130,
  sectionsTotal: r.sectionsTotal,
  sectionsStarted: r.sectionsStarted,
  updatedAt: r.updatedAt,
});

export const sermonRepo = {
  async list(): Promise<SermonListItem[]> {
    return (await getDb().sermons()).map(toItem);
  },

  async load(id: string): Promise<Sermon | null> {
    const row = await getDb().sermon(id);
    if (!row) return null;
    return { ...(JSON.parse(row.doc) as SermonDoc), id, createdAt: row.createdAt, updatedAt: row.updatedAt };
  },

  /** Writes the document and its list summary in one call. Returns the saved timestamp. */
  async save(id: string, doc: SermonDoc): Promise<number> {
    const s = summarise(doc);
    return getDb().saveSermon({
      id,
      doc: JSON.stringify(doc),
      title: doc.title.trim() || 'Untitled sermon',
      passage: doc.passage ? JSON.stringify(doc.passage) : null,
      status: doc.status,
      preachDate: doc.preachDate ?? null,
      series: doc.series ?? null,
      targetMinutes: doc.targetMinutes,
      words: s.words,
      sectionsTotal: s.sectionsTotal,
      sectionsStarted: s.sectionsStarted,
    });
  },

  remove: (id: string) => getDb().deleteSermon(id),
};

/** Next sermon to preach: the earliest dated one that has not been delivered. */
export function pickNext(items: SermonListItem[], today = new Date().toISOString().slice(0, 10)) {
  return items
    .filter((s) => s.status !== 'delivered' && s.preachDate && s.preachDate >= today)
    .sort((a, b) => a.preachDate!.localeCompare(b.preachDate!))[0];
}
