import type { RecordKind } from '@selah/domain';

/**
 * Lets an open editor and the sync engine agree without knowing about each other.
 * - An editor says when it holds edits that are not yet saved, so sync never replaces that record underneath it.
 * - Sync says which records the server changed, so an open editor can show the new version.
 * - Before a round, sync asks every editor to save what it has.
 */
const key = (kind: RecordKind, id: string) => `${kind}:${id}`;

const busy = new Map<string, () => boolean>();
const flushers = new Set<() => Promise<unknown>>();
const listeners = new Set<(keys: string[]) => void>();

export function registerEditor(kind: RecordKind, id: string, isBusy: () => boolean, flush: () => Promise<unknown>) {
  busy.set(key(kind, id), isBusy);
  flushers.add(flush);
  return () => {
    busy.delete(key(kind, id));
    flushers.delete(flush);
  };
}

/** Keys of records that have unsaved edits right now. */
export const busyKeys = (): string[] => [...busy.entries()].filter(([, f]) => f()).map(([k]) => k);

export const flushEditors = () => Promise.all([...flushers].map((f) => f().catch(() => undefined)));

export function onRecordsChanged(cb: (keys: string[]) => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export const emitRecordsChanged = (keys: string[]) => {
  if (keys.length) listeners.forEach((l) => l(keys));
};

export const recordKey = key;
