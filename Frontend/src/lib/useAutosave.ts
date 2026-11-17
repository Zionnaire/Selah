import type { RecordKind } from '@selah/domain';
import { useCallback, useEffect, useRef, useState } from 'react';
import { onRecordsChanged, recordKey, registerEditor } from './syncBus';

export type SaveState = 'saved' | 'saving' | 'error';

export interface AutosaveIo<T> {
  /** What kind of record this is, so sync can tell when it changes the open one. */
  kind: RecordKind;
  load: (id: string) => Promise<{ doc: T; updatedAt: number } | null>;
  /** Returns the timestamp that was written. */
  save: (id: string, doc: T) => Promise<number>;
}

const DEBOUNCE_MS = 600;

/**
 * Holds a document in memory, applies edits immediately, and writes to the device shortly after
 * the user pauses. Writes are chained so an older save can never land after a newer one, and
 * pending edits are flushed when the tab is hidden or the screen is left.
 *
 * `io` must be a stable object (declare it at module level).
 */
export function useAutosave<T>(id: string, io: AutosaveIo<T>) {
  const [doc, setDoc] = useState<T | null>(null);
  const [missing, setMissing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const latest = useRef<T | null>(null);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const writing = useRef(0);

  useEffect(() => {
    let live = true;
    void io.load(id).then((r) => {
      if (!live) return;
      if (!r) return setMissing(true);
      latest.current = r.doc;
      setDoc(r.doc);
      setSavedAt(r.updatedAt);
    });
    return () => {
      live = false;
    };
  }, [id, io]);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    if (!dirty.current || !latest.current) return chain.current;
    const snapshot = latest.current;
    dirty.current = false;
    setSaveState('saving');
    writing.current++;
    chain.current = chain.current
      .then(() => io.save(id, snapshot))
      .then((at) => {
        writing.current--;
        setSavedAt(at);
        setSaveState(dirty.current ? 'saving' : 'saved');
      })
      .catch(() => {
        writing.current--;
        dirty.current = true;
        setSaveState('error');
      });
    return chain.current;
  }, [id, io]);

  const update = useCallback(
    (fn: (d: T) => T) => {
      if (!latest.current) return;
      latest.current = fn(latest.current);
      dirty.current = true;
      setDoc(latest.current);
      setSaveState('saving');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), DEBOUNCE_MS);
    },
    [flush],
  );

  // Sync must never replace a record under unsaved edits, and an open record shows what sync brought in.
  useEffect(() => registerEditor(io.kind, id, () => dirty.current || writing.current > 0, flush), [id, io, flush]);
  useEffect(
    () =>
      onRecordsChanged((keys) => {
        if (!keys.includes(recordKey(io.kind, id)) || dirty.current || writing.current > 0) return;
        void io.load(id).then((r) => {
          if (!r || dirty.current || writing.current > 0) return;
          latest.current = r.doc;
          setDoc(r.doc);
          setSavedAt(r.updatedAt);
        });
      }),
    [id, io],
  );

  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && void flush();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      void flush();
    };
  }, [flush]);

  return { doc, missing, update, saveState, savedAt, flush };
}
