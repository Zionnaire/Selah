import { TRANSLATIONS } from '@selah/domain';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { installTranslation, isInstalled, type BibleBooks } from '@/data/bible';
import { getDb } from '@/data/db';

interface BootValue {
  phase: 'booting' | 'ready' | 'error';
  label: string;
  progress: number;
  error?: string;
}

const Ctx = createContext<BootValue>({ phase: 'booting', label: 'Opening your library', progress: 0 });

/**
 * Opens the database and, on the very first launch, puts the bundled King James Version into it.
 * Nothing here needs the network. The rest of the app waits for this to finish.
 */
export function BootProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BootValue>({ phase: 'booting', label: 'Opening your library', progress: 0 });

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        await getDb();
        const kjv = TRANSLATIONS.find((t) => t.id === 'kjv')!;
        if (!(await isInstalled(kjv.id))) {
          if (live) setState({ phase: 'booting', label: `Preparing the ${kjv.name}`, progress: 0 });
          // A data file in the app, read once. It is not part of the JavaScript, so it costs nothing after the first launch.
          const asset = Asset.fromModule(require('../../assets/data/kjv.bible') as number);
          await asset.downloadAsync();
          const file = JSON.parse(await new File(asset.localUri ?? asset.uri).text()) as { books: BibleBooks };
          let last = 0;
          await installTranslation(kjv, file.books, (p) => {
            if (live && p - last >= 0.04) {
              last = p;
              setState({ phase: 'booting', label: `Preparing the ${kjv.name}`, progress: p });
            }
          });
        }
        if (live) setState({ phase: 'ready', label: '', progress: 1 });
      } catch (err) {
        if (live) setState({ phase: 'error', label: '', progress: 0, error: err instanceof Error ? err.message : 'SELAH could not start' });
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export const useBoot = () => useContext(Ctx);
