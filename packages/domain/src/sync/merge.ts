import type { NoteDoc, NoteLink } from '../note';
import { MAX_SECTIONS, type Block, type Section, type SermonDoc } from '../sermon';
import { MAX_STUDY_SECTIONS, type CollectedVerse, type StudyDoc, type StudySection } from '../study';
import { deepEqual } from './equal';
import { mergeList, type ListOptions } from './list';

/** A detail value that both sides changed differently. The server's value was kept. */
export interface Overwritten {
  field: string;
  /** What this device had. Saved to history so nothing is lost. */
  local: unknown;
}

export interface MergeNotices {
  /** Sections edited on one device and deleted on another. The edit was kept. */
  keptSections: string[];
  keptBlocks: string[];
  overwritten: Overwritten[];
}

export interface MergeResult<T, C> {
  /** The merged document. Where a conflict exists, the local version of that part is in use. */
  merged: T;
  conflicts: C[];
  notices: MergeNotices;
}

export type Choice = 'local' | 'remote' | 'both';

const emptyNotices = (): MergeNotices => ({ keptSections: [], keptBlocks: [], overwritten: [] });

/**
 * A detail value: a side that changed it wins over a side that did not. If both changed it
 * differently, the server's value wins (first to arrive) and the local one goes to history.
 */
function scalar<T>(field: string, base: T | undefined, local: T, remote: T, hasBase: boolean, out: Overwritten[]): T {
  if (deepEqual(local, remote)) return local;
  if (hasBase && deepEqual(local, base)) return remote;
  if (hasBase && deepEqual(remote, base)) return local;
  out.push({ field, local });
  return remote;
}

/** Text content: if both sides changed a field differently there is no safe answer, so it is a conflict. */
function mergeFields<T extends object>(
  base: T | undefined,
  local: T,
  remote: T,
  fields: string[],
): { item: T; conflict: boolean } {
  const l = local as Record<string, unknown>;
  const r = remote as Record<string, unknown>;
  const b = base as Record<string, unknown> | undefined;
  const out: Record<string, unknown> = { ...l };
  for (const f of fields) {
    if (deepEqual(l[f], r[f])) continue;
    if (b && deepEqual(l[f], b[f])) out[f] = r[f];
    else if (b && deepEqual(r[f], b[f])) out[f] = l[f];
    else return { item: local, conflict: true };
  }
  return { item: out as T, conflict: false };
}

// sermons

export interface SectionConflict {
  sectionId: string;
  title: string;
  local: Section;
  remote: Section;
}

const blockOptions = (): ListOptions<Block> => ({
  key: (b) => b.id,
  equal: deepEqual,
  mergeItem: (base, local, remote) => {
    if (local.type !== remote.type) return { item: local, conflict: true };
    const fields = [...new Set([...Object.keys(local), ...Object.keys(remote)])].filter((k) => k !== 'id' && k !== 'type');
    return mergeFields(base, local, remote, fields);
  },
});

function mergeSection(
  base: Section | undefined,
  local: Section,
  remote: Section,
  notices: MergeNotices,
): { item: Section; conflict: boolean } {
  const blocks = mergeList(base ? base.blocks : null, local.blocks, remote.blocks, blockOptions());
  if (blocks.conflicts.length) return { item: local, conflict: true };
  notices.keptBlocks.push(...blocks.keptOverDelete);
  const has = !!base;
  return {
    item: {
      id: local.id,
      title: scalar(`section ${local.id} title`, base?.title, local.title, remote.title, has, notices.overwritten),
      minutes: scalar(`section ${local.id} minutes`, base?.minutes, local.minutes, remote.minutes, has, notices.overwritten),
      blocks: blocks.items,
    },
    conflict: false,
  };
}

export function mergeSermon(
  base: SermonDoc | null,
  local: SermonDoc,
  remote: SermonDoc,
): MergeResult<SermonDoc, SectionConflict> {
  const notices = emptyNotices();
  const has = base !== null;
  const pick = <K extends keyof SermonDoc>(k: K): SermonDoc[K] =>
    scalar(String(k), base?.[k], local[k], remote[k], has, notices.overwritten);

  const sections = mergeList(base?.sections ?? null, local.sections, remote.sections, {
    key: (s) => s.id,
    equal: deepEqual,
    mergeItem: (b, l, r) => mergeSection(b, l, r, notices),
  });
  notices.keptSections.push(...sections.keptOverDelete);

  const merged: SermonDoc = {
    title: pick('title'),
    passage: pick('passage'),
    status: pick('status'),
    preachDate: pick('preachDate'),
    series: pick('series'),
    topic: pick('topic'),
    targetMinutes: pick('targetMinutes'),
    sections: sections.items,
  };
  const conflicts = sections.conflicts.map((id): SectionConflict => {
    const l = local.sections.find((s) => s.id === id)!;
    const r = remote.sections.find((s) => s.id === id)!;
    return { sectionId: id, title: l.title, local: l, remote: r };
  });
  return { merged, conflicts, notices };
}

/**
 * Applies the user's choice for one conflicting section. "Both" adds the other version as a copy
 * after this one, unless the sermon is already at the section limit, in which case nothing changes
 * and ok is false so the screen can offer only the first two choices.
 */
export function resolveSectionConflict(
  doc: SermonDoc,
  conflict: SectionConflict,
  choice: Choice,
  deviceName: string,
  newId: () => string,
): { doc: SermonDoc; ok: boolean } {
  const i = doc.sections.findIndex((s) => s.id === conflict.sectionId);
  if (i < 0) return { doc, ok: false };
  if (choice === 'local') return { doc, ok: true };
  const sections = [...doc.sections];
  if (choice === 'remote') {
    sections[i] = conflict.remote;
    return { doc: { ...doc, sections }, ok: true };
  }
  if (sections.length >= MAX_SECTIONS) return { doc, ok: false };
  const copy: Section = {
    ...conflict.remote,
    id: newId(),
    title: `${conflict.remote.title || 'Section'} (${deviceName})`,
    blocks: conflict.remote.blocks.map((b) => ({ ...b, id: newId() })),
  };
  sections.splice(i + 1, 0, copy);
  return { doc: { ...doc, sections }, ok: true };
}

// studies

export interface StudySectionConflict {
  sectionId: string;
  heading: string;
  local: StudySection;
  remote: StudySection;
}

const verseKey = (v: CollectedVerse) => `${v.ref.book}.${v.ref.chapter}.${v.ref.verseStart}.${v.ref.verseEnd}`;

export function mergeStudy(
  base: StudyDoc | null,
  local: StudyDoc,
  remote: StudyDoc,
): MergeResult<StudyDoc, StudySectionConflict> {
  const notices = emptyNotices();
  const has = base !== null;
  const pick = <K extends keyof StudyDoc>(k: K): StudyDoc[K] =>
    scalar(String(k), base?.[k], local[k], remote[k], has, notices.overwritten);

  const sections = mergeList(base?.sections ?? null, local.sections, remote.sections, {
    key: (s) => s.id,
    equal: deepEqual,
    mergeItem: (b, l, r) => {
      const heading = scalar(`section ${l.id} heading`, b?.heading, l.heading, r.heading, !!b, notices.overwritten);
      const body = mergeFields(b, l, r, ['body']);
      return body.conflict ? { item: l, conflict: true } : { item: { ...body.item, heading }, conflict: false };
    },
  });
  notices.keptSections.push(...sections.keptOverDelete);

  // Verses are identified by the passage they point at, not by an id, because two devices can add
  // the same verse independently. Their notes and groups are annotations, so the server's wins.
  const verses = mergeList(base?.verses ?? null, local.verses, remote.verses, {
    key: verseKey,
    equal: (a, b) => a.note === b.note && a.group === b.group,
    mergeItem: (b, l, r) => ({
      item: {
        id: r.id,
        ref: r.ref,
        note: scalar(`verse ${verseKey(l)} note`, b?.note, l.note, r.note, !!b, notices.overwritten),
        group: scalar(`verse ${verseKey(l)} group`, b?.group, l.group, r.group, !!b, notices.overwritten),
      },
      conflict: false,
    }),
  });

  const merged: StudyDoc = {
    title: pick('title'),
    kind: pick('kind'),
    passage: pick('passage'),
    topic: pick('topic'),
    sections: sections.items,
    verses: verses.items,
  };
  const conflicts = sections.conflicts.map((id): StudySectionConflict => {
    const l = local.sections.find((s) => s.id === id)!;
    const r = remote.sections.find((s) => s.id === id)!;
    return { sectionId: id, heading: l.heading, local: l, remote: r };
  });
  return { merged, conflicts, notices };
}

export function resolveStudySectionConflict(
  doc: StudyDoc,
  conflict: StudySectionConflict,
  choice: Choice,
  deviceName: string,
  newId: () => string,
): { doc: StudyDoc; ok: boolean } {
  const i = doc.sections.findIndex((s) => s.id === conflict.sectionId);
  if (i < 0) return { doc, ok: false };
  if (choice === 'local') return { doc, ok: true };
  const sections = [...doc.sections];
  if (choice === 'remote') {
    sections[i] = conflict.remote;
    return { doc: { ...doc, sections }, ok: true };
  }
  if (sections.length >= MAX_STUDY_SECTIONS) return { doc, ok: false };
  sections.splice(i + 1, 0, { ...conflict.remote, id: newId(), heading: `${conflict.remote.heading || 'Section'} (${deviceName})` });
  return { doc: { ...doc, sections }, ok: true };
}

// notes

export interface NoteConflict {
  local: string;
  remote: string;
}

const linkKey = (l: NoteLink) =>
  l.type === 'passage' ? `p:${l.ref.book}.${l.ref.chapter}.${l.ref.verseStart}.${l.ref.verseEnd}` : `s:${l.id}`;

export function mergeNote(base: NoteDoc | null, local: NoteDoc, remote: NoteDoc): MergeResult<NoteDoc, NoteConflict> {
  const notices = emptyNotices();
  const has = base !== null;
  const title = scalar('title', base?.title, local.title, remote.title, has, notices.overwritten);
  const links = mergeList(base?.links ?? null, local.links, remote.links, {
    key: linkKey,
    equal: deepEqual,
    mergeItem: (_b, _l, r) => ({ item: r, conflict: false }), // a sermon link's cached title may differ, nothing to lose
  });

  let body = local.body;
  const conflicts: NoteConflict[] = [];
  if (!deepEqual(local.body, remote.body)) {
    if (has && deepEqual(local.body, base!.body)) body = remote.body;
    else if (has && deepEqual(remote.body, base!.body)) body = local.body;
    else conflicts.push({ local: local.body, remote: remote.body }); // both edited: keep ours until chosen
  }
  return { merged: { title, body, links: links.items }, conflicts, notices };
}

/** "Both" keeps this note and returns the other version as a separate note named for the device. */
export function resolveNoteConflict(
  doc: NoteDoc,
  conflict: NoteConflict,
  choice: Choice,
  deviceName: string,
): { doc: NoteDoc; copy?: NoteDoc } {
  if (choice === 'local') return { doc };
  if (choice === 'remote') return { doc: { ...doc, body: conflict.remote } };
  return {
    doc,
    copy: { title: `${doc.title || 'Note'} (${deviceName})`, body: conflict.remote, links: doc.links },
  };
}

// highlights and bookmarks

/**
 * A highlight or bookmark is on or off for a verse. A side that changed it wins over one that did
 * not. With no base, either side having it means it is kept, since keeping loses nothing.
 */
export function mergeMark(base: boolean | undefined, local: boolean, remote: boolean): boolean {
  if (local === remote) return local;
  if (base === undefined) return true;
  if (local === base) return remote;
  if (remote === base) return local;
  return true;
}
