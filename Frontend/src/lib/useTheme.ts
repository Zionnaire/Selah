import { useSyncExternalStore } from 'react';
import { effectiveTheme, readThemePref, setThemePref, subscribeTheme, type ThemePref } from './theme';

/** The theme preference and what is showing, kept in step across every screen. */
export function useTheme(): { pref: ThemePref; mode: 'light' | 'dark'; setPref: (p: ThemePref) => void } {
  const snapshot = useSyncExternalStore(
    subscribeTheme,
    () => `${readThemePref()}|${effectiveTheme()}`,
    () => 'system|light',
  );
  const [pref, mode] = snapshot.split('|') as [ThemePref, 'light' | 'dark'];
  return { pref, mode, setPref: setThemePref };
}
