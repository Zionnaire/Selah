import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { getSetting, setSetting } from '@/data/settings';
import { dark, fontSize, light, radius, space } from './tokens.generated';

export type ThemePref = 'light' | 'dark' | 'system';
export type Colours = { -readonly [K in keyof typeof light]: string };

/** Font family names as registered by expo-font in the root layout. */
export const fonts = {
  display: 'CormorantGaramond_600SemiBold',
  read: 'Literata_400Regular',
  readBold: 'Literata_600SemiBold',
  ui: 'Inter_400Regular',
  uiMedium: 'Inter_500Medium',
  uiBold: 'Inter_600SemiBold',
} as const;

interface ThemeValue {
  c: Colours;
  mode: 'light' | 'dark';
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
  size: typeof fontSize;
  radius: typeof radius;
  space: typeof space;
}

const Ctx = createContext<ThemeValue | null>(null);

/** Colours come from the same tokens as the web app, generated from packages/tokens. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [pref, setPrefState] = useState<ThemePref>('system');

  useEffect(() => {
    void getSetting('theme').then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setPrefState(v);
    });
  }, []);

  const value = useMemo<ThemeValue>(() => {
    const mode = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
    return {
      c: (mode === 'dark' ? dark : light) as Colours,
      mode,
      pref,
      setPref: (p) => {
        setPrefState(p);
        void setSetting('theme', p);
      },
      size: fontSize,
      radius,
      space,
    };
  }, [pref, system]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTheme needs a ThemeProvider');
  return v;
}
