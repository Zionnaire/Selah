/** Raw palette values for places CSS variables cannot reach (canvas, PDF export, native shells). */
export const palette = {
  navy: '#0B1F44',
  navyDeep: '#08172F',
  navy2: '#16335F',
  navyBorder: '#27406B',
  gold: '#D4AF37',
  goldDark: '#B89428',
  goldText: '#8A6D1A',
  goldTint: '#F5EBC8',
  verseTint: '#F8F1DA',
  ivory: '#F8F7F2',
  sheet: '#FDFCF9',
  stone: '#EFEEE7',
  stoneBorder: '#DEDCD2',
  ink: '#1F2937',
  ink2: '#374151',
  slate: '#64748B',
  darkBg: '#101827',
  darkSurface: '#172235',
  darkElevated: '#273449',
  ok: '#15803D',
  warn: '#B45309',
  risk: '#B91C1C',
  info: '#2563EB',
} as const;

export type ThemeName = 'light' | 'dark';
export type PulpitTheme = 'dark' | 'warm' | 'light';
