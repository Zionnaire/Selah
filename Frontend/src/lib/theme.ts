export type ThemePref = 'light' | 'dark' | 'system';

const KEY = 'selah.theme';

export const readThemePref = (): ThemePref => {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    /* storage can be blocked, fall through to the default */
  }
  return 'system';
};

const CHANGED = 'selah-theme';

export function applyTheme(pref: ThemePref): void {
  const dark = pref === 'dark' || (pref === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? '#101827' : '#0B1F44');
  window.dispatchEvent(new Event(CHANGED));
}

/** Lets any component follow the theme, so a change made anywhere shows everywhere. */
export function subscribeTheme(cb: () => void): () => void {
  window.addEventListener(CHANGED, cb);
  return () => window.removeEventListener(CHANGED, cb);
}

/** What is on screen now: light or dark, whatever the preference says. */
export const effectiveTheme = (): 'light' | 'dark' => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

export function setThemePref(pref: ThemePref): void {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    /* ignore */
  }
  applyTheme(pref);
}

/** Runs before first paint so there is no flash of the wrong theme. */
export function initTheme(): void {
  applyTheme(readThemePref());
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (readThemePref() === 'system') applyTheme('system');
  });
}
