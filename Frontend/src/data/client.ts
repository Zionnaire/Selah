import * as Comlink from 'comlink';
import type { DbApi, DbInfo } from './types';

let worker: Worker | null = null;
let remote: Comlink.Remote<DbApi> | null = null;
let ready: Promise<DbInfo> | null = null;

function spawn() {
  worker?.terminate();
  worker = new Worker(new URL('./db.worker.ts', import.meta.url), { type: 'module' });
  remote = Comlink.wrap<DbApi>(worker);
}

/** One worker for the whole app. All SQLite work stays off the UI thread. */
export function getDb(): Comlink.Remote<DbApi> {
  if (!remote) spawn();
  return remote!;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The browser releases a closed page's storage handle a moment after the page goes away,
// so a quick reload can find the file still locked. Waiting briefly fixes that case.
const LOCKED = /access handle|nomodificationallowed|createSyncAccessHandle/i;
const ATTEMPTS = 8;

export function initDb(): Promise<DbInfo> {
  ready ??= (async () => {
    let info = await getDb().init();
    for (let i = 1; i < ATTEMPTS && info.mode === 'memory' && LOCKED.test(info.reason ?? ''); i++) {
      await sleep(350 * i);
      spawn();
      info = await getDb().init();
    }
    if (info.mode === 'memory' && LOCKED.test(info.reason ?? '')) {
      info = { mode: 'memory', reason: 'SELAH is open in another tab. Close it to keep your changes.' };
    }
    return info;
  })();
  return ready;
}

export { proxy } from 'comlink';
