/** Shown with every Word Study screen. Required by the CC BY licences of the data. */
export const ORIGINAL_ATTRIBUTION =
  'Original language data from STEPBible.org and Tyndale House, Cambridge (CC BY 4.0), STEPBible.github.io/STEPBible-Data. ' +
  'Hebrew definitions from the OpenScriptures Hebrew Lexicon (CC BY 4.0), based on Strong’s and Brown-Driver-Briggs, which are public domain. ' +
  'Reformatted for SELAH.';

export const ORIGINAL_TEXT_NOTE =
  'Hebrew follows the Westminster Leningrad Codex. Greek follows the Textus Receptus (Scrivener, 1894), the text behind the King James Version. Some modern translations follow a different Greek text in a few places.';

export type OriginalLanguage = 'hebrew' | 'greek';

export const languageOf = (strong: string): OriginalLanguage => (strong.startsWith('H') ? 'hebrew' : 'greek');

/** "G3339" and "H0430G" become "G3339" and "H430" for display and for Strong's lookups. */
export const displayStrong = (strong: string): string => {
  const m = /^([HG])0*(\d+)/.exec(strong);
  return m ? `${m[1]}${m[2]}` : strong;
};

/** The testament a language lives in, for "4 in the New Testament". */
export const testamentOfLanguage = (l: OriginalLanguage): string => (l === 'hebrew' ? 'Old Testament' : 'New Testament');
