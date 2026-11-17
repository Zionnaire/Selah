import type { PulpitTheme } from '@selah/tokens';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PulpitMode = 'manuscript' | 'outline' | 'scripture';

interface PulpitPrefs {
  theme: PulpitTheme;
  /** -2 to 6, each step is 0.25rem on the pulpit text size */
  textStep: number;
  keepAwake: boolean;
  startMode: PulpitMode;
  set: (p: Partial<Omit<PulpitPrefs, 'set'>>) => void;
}

export const usePulpitPrefs = create<PulpitPrefs>()(
  persist(
    (set) => ({
      theme: 'dark',
      textStep: 2,
      keepAwake: true,
      startMode: 'manuscript',
      set: (p) => set(p),
    }),
    { name: 'selah.pulpit' },
  ),
);

export const pulpitFontSize = (step: number) => `${1.5 + step * 0.25}rem`;
