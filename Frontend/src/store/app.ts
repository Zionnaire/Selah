import { TRANSLATIONS } from '@selah/domain';
import { create } from 'zustand';
import { downloadTranslation } from '@/data/bibleDownloads';
import { getDb, initDb, proxy } from '@/data/client';
import type { DbInfo, TranslationRow } from '@/data/types';
import { readHintId } from './account';

interface AppState {
  phase: 'booting' | 'ready' | 'error';
  bootLabel: string;
  bootProgress: number;
  error?: string;
  db: DbInfo | null;
  installed: Record<string, TranslationRow>;
  /** translation id to progress between 0 and 1 while downloading */
  installing: Record<string, number>;
  failed: Record<string, string>;
  /** Cross-references install in the background after the app opens. */
  xrefs: 'checking' | 'installing' | 'ready' | 'failed';
  xrefProgress: number;
  ensureXrefs: () => Promise<void>;
  /** Word Study data is large, so it installs only when the user asks. */
  original: 'unknown' | 'none' | 'installing' | 'ready' | 'failed';
  originalProgress: number;
  originalError?: string;
  /** The interim Bible Dictionary (Smith, 1884). Optional download. */
  dictionary: 'unknown' | 'none' | 'installing' | 'ready' | 'failed';
  dictProgress: number;
  dictError?: string;
  checkDictionary: () => Promise<void>;
  installDictionary: () => Promise<void>;
  removeDictionary: () => Promise<void>;
  checkOriginal: () => Promise<void>;
  installOriginal: () => Promise<void>;
  removeOriginal: () => Promise<void>;
  boot: () => Promise<void>;
  download: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const toMap = (rows: TranslationRow[]) => Object.fromEntries(rows.map((r) => [r.id, r]));

let booting: Promise<void> | null = null;

export const useApp = create<AppState>((set, get) => ({
  phase: 'booting',
  bootLabel: 'Opening your library',
  bootProgress: 0,
  db: null,
  installed: {},
  installing: {},
  failed: {},
  xrefs: 'checking',
  xrefProgress: 0,
  original: 'unknown',
  originalProgress: 0,
  dictionary: 'unknown',
  dictProgress: 0,

  async checkDictionary() {
    if (get().dictionary === 'installing') return;
    set({ dictionary: (await getDb().dictCount()) > 0 ? 'ready' : 'none' });
  },

  async installDictionary() {
    if (get().dictionary === 'installing') return;
    set({ dictionary: 'installing', dictProgress: 0, dictError: undefined });
    try {
      await getDb().installDict('/data/dictionary-smith.json', proxy((p: number) => set({ dictProgress: p })));
      set({ dictionary: 'ready' });
    } catch (err) {
      await getDb().removeDict().catch(() => undefined);
      set({
        dictionary: 'failed',
        dictError: navigator.onLine
          ? err instanceof Error ? err.message : 'The download failed'
          : 'You are offline. Try again when you are connected.',
      });
    }
  },

  async removeDictionary() {
    await getDb().removeDict();
    set({ dictionary: 'none' });
  },

  async checkOriginal() {
    if (get().original === 'installing') return;
    const s = await getDb().originalStatus();
    set({ original: s.installed ? 'ready' : 'none' });
  },

  async installOriginal() {
    if (get().original === 'installing') return;
    set({ original: 'installing', originalProgress: 0, originalError: undefined });
    try {
      await getDb().installOriginal('/data/', proxy((p: number) => set({ originalProgress: p })));
      set({ original: 'ready' });
    } catch (err) {
      await getDb().removeOriginal().catch(() => undefined);
      set({
        original: 'failed',
        originalError: navigator.onLine
          ? err instanceof Error ? err.message : 'The download failed'
          : 'You are offline. Try again when you are connected.',
      });
    }
  },

  async removeOriginal() {
    await getDb().removeOriginal();
    set({ original: 'none' });
  },

  async ensureXrefs() {
    if (get().xrefs === 'installing' || get().xrefs === 'ready') return;
    try {
      if ((await getDb().xrefCount()) > 0) return set({ xrefs: 'ready' });
      set({ xrefs: 'installing', xrefProgress: 0 });
      const res = await fetch('/data/crossrefs.json');
      if (!res.ok) throw new Error(`Cross-references download failed (${res.status})`);
      const rows = (await res.json()) as number[][];
      await getDb().installXrefs(rows, proxy((p: number) => set({ xrefProgress: p })));
      set({ xrefs: 'ready' });
    } catch {
      // Offline on first run, or a failed download. The reader still works and retries next launch.
      set({ xrefs: 'failed' });
    }
  },

  boot() {
    booting ??= (async () => {
      try {
        const db = await initDb();
        // Before anything is read, so a screen never shows another account's work.
        await getDb().setAccount(readHintId());
        // Deleted items are kept for 30 days, then removed for good.
        await getDb().purgeExpired(30).catch(() => undefined);
        let installed = toMap(await getDb().translations());

        // The first install carries the bundled translation so the reader works at once.
        const bundled = TRANSLATIONS.filter((t) => t.bundled && !installed[t.id]);
        for (const t of bundled) {
          set({ bootLabel: `Preparing the ${t.name}`, bootProgress: 0 });
          await downloadTranslation(t.id, (p) => set({ bootProgress: p }));
        }
        if (bundled.length) installed = toMap(await getDb().translations());
        set({ db, installed, phase: 'ready' });
        void get().ensureXrefs();
        void get().checkOriginal();
        void get().checkDictionary();
      } catch (err) {
        set({
          phase: 'error',
          error: err instanceof Error ? err.message : 'SELAH could not start',
        });
      }
    })();
    return booting;
  },

  async download(id) {
    if (get().installing[id] !== undefined) return;
    set((s) => ({ installing: { ...s.installing, [id]: 0 }, failed: { ...s.failed, [id]: '' } }));
    try {
      await downloadTranslation(id, (p) =>
        set((s) => ({ installing: { ...s.installing, [id]: p } })),
      );
      set({ installed: toMap(await getDb().translations()) });
    } catch (err) {
      const message = navigator.onLine
        ? err instanceof Error
          ? err.message
          : 'Download failed'
        : 'You are offline. Try again when you are connected.';
      set((s) => ({ failed: { ...s.failed, [id]: message } }));
    } finally {
      set((s) => {
        const { [id]: _done, ...rest } = s.installing;
        return { installing: rest };
      });
    }
  },

  async remove(id) {
    await getDb().removeTranslation(id);
    set({ installed: toMap(await getDb().translations()) });
  },
}));
