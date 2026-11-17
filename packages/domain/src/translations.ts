export type LicenseKind = 'public-domain' | 'licensed';

export interface TranslationInfo {
  id: string;
  name: string;
  abbr: string;
  language: string;
  year: string;
  license: LicenseKind;
  /** Attribution line shown in exports and the reader footer. */
  attribution: string;
  /** May the text be stored offline on a device? Enforced in data, not in UI code. */
  offlineAllowed: boolean;
  /** Bundled with the first install so the reader works immediately. */
  bundled: boolean;
  /** Approximate download size in MB, shown before the user commits. */
  sizeMb: number;
}

export const TRANSLATIONS: readonly TranslationInfo[] = [
  {
    id: 'kjv',
    name: 'King James Version',
    abbr: 'KJV',
    language: 'en',
    year: '1769',
    license: 'public-domain',
    attribution: 'King James Version. Public domain.',
    offlineAllowed: true,
    bundled: true,
    sizeMb: 4.2,
  },
  {
    id: 'web',
    name: 'World English Bible',
    abbr: 'WEB',
    language: 'en',
    year: '2020',
    license: 'public-domain',
    attribution: 'World English Bible. Public domain.',
    offlineAllowed: true,
    bundled: false,
    sizeMb: 4.2,
  },
  {
    id: 'asv',
    name: 'American Standard Version',
    abbr: 'ASV',
    language: 'en',
    year: '1901',
    license: 'public-domain',
    attribution: 'American Standard Version. Public domain.',
    offlineAllowed: true,
    bundled: false,
    sizeMb: 4.1,
  },
  {
    id: 'bsb',
    name: 'Berean Standard Bible',
    abbr: 'BSB',
    language: 'en',
    year: '2023',
    license: 'public-domain',
    attribution: 'Berean Standard Bible. Dedicated to the public domain by Bible Hub.',
    offlineAllowed: true,
    bundled: false,
    sizeMb: 4.2,
  },
];

export const getTranslation = (id: string) => TRANSLATIONS.find((t) => t.id === id);
