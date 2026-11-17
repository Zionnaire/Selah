const KEY = 'selah.welcomed';

/** True once the person has seen the front page, so it greets a new visitor once and then gets out of the way. */
export function hasBeenWelcomed(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return true;
  }
}

export function markWelcomed(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* it just shows again next time */
  }
}

/** An installed app opens straight into the work. */
export const isInstalledApp = (): boolean =>
  typeof matchMedia === 'function' && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: minimal-ui)').matches);
