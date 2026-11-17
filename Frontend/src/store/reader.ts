import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ReadingPosition {
  book: string;
  chapter: number;
  verse?: number;
}

interface ReaderState {
  translation: string;
  parallel: boolean;
  parallelWith: string;
  /** -2 to 4, each step is 2px on the scripture font size */
  textStep: number;
  /** One verse per line instead of flowing paragraphs. Reads better for Psalms and poetry. */
  lines: boolean;
  last: ReadingPosition;
  setLines: (on: boolean) => void;
  setTranslation: (id: string) => void;
  setParallel: (on: boolean) => void;
  setParallelWith: (id: string) => void;
  bumpText: (delta: number) => void;
  setLast: (p: ReadingPosition) => void;
}

/** Device level reading preferences. Verse selection is deliberately not persisted. */
export const useReader = create<ReaderState>()(
  persist(
    (set) => ({
      translation: 'kjv',
      parallel: false,
      parallelWith: 'web',
      textStep: 0,
      lines: false,
      last: { book: 'JHN', chapter: 1 },
      setLines: (lines) => set({ lines }),
      setTranslation: (translation) => set({ translation }),
      setParallel: (parallel) => set({ parallel }),
      setParallelWith: (parallelWith) => set({ parallelWith }),
      bumpText: (delta) => set((s) => ({ textStep: Math.max(-2, Math.min(4, s.textStep + delta)) })),
      setLast: (last) => set({ last }),
    }),
    { name: 'selah.reader' },
  ),
);
