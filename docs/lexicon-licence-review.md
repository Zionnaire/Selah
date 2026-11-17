# Word study: licence review

Prepared 2026-11-17 from the repositories' own files, not from summaries. Updated after the build. This is engineering due diligence, not legal advice. If SELAH is distributed commercially, have a lawyer confirm before launch.

## What was built and from what

| Source | Used for | Licence (verified) | Obligation |
| --- | --- | --- | --- |
| **STEPBible-Data** (Tyndale House, Cambridge) TAHOT, TAGNT | Every Hebrew and Greek word with transliteration, gloss, Strong's number and grammar | **CC BY 4.0**, stated in each file's header | Credit Tyndale House and STEPBible.org, link STEPBible.github.io/STEPBible-Data, note changes |
| **STEPBible-Data** TBESH, TBESG | Lemma, transliteration, part of speech and gloss **only** | **CC BY 4.0** | As above |
| **OpenScriptures Hebrew Lexicon** HebrewStrong.xml | Hebrew definitions | **CC BY 4.0** (Strong's and BDB text are public domain) | Attribution |

All three attributions are shown on every Word Study screen (`ORIGINAL_ATTRIBUTION` in `packages/domain`). The exact source commits are recorded in `Frontend/public/data/wordstudy-sources.json` each time the data is rebuilt.

## What changed from the first recommendation, and why

Reading the actual file headers turned up problems the repository summaries did not show.

1. **The Hebrew brief lexicon's "Meaning" column is excluded.** Its header says it is based on the Abridged BDB by Online Bible, copyright Larry Pierce, and that *"Permission should be gained from Online Bible before these are applied in any project."* We take only the lemma, transliteration, part of speech and gloss from that file, and use OpenScriptures for Hebrew definitions instead.
2. **Greek definitions are not shown.** The Greek brief lexicon derives from Abbott-Smith. The edition's copyright status is not independently verified, so we use only the gloss, plus a data derived "How translators render it" range computed from every occurrence.
3. **The Greek text is the Textus Receptus (Scrivener 1894), not the modern critical text.** TAGNT marks which edition contains each word. We keep the words the KJV translators used (type K), which is public domain and matches the KJV the app bundles. The Word Study screens say so. This avoids any question about reproducing the Nestle-Aland text.
4. **Excluded entirely:** Tyndale's ESV tags (`Tagged-Bibles/TTESV`) are **CC BY-NC**, non-commercial.

The data file asks people not to repost copies of their files. SELAH ships a derived, reformatted dataset and credits the source, which their licence text explicitly allows ("Download the data and reformat it for your application").

## Sources not used

| Source | Finding | Why |
| --- | --- | --- |
| `openscriptures/strongs` packaging | No LICENSE file. File headers say GPL 3.0 and CC-BY-SA | Contradictory and copyleft |
| MorphGNT with SBLGNT | Text under the SBLGNT EULA, parsing CC-BY-SA | EULA restrictions and share-alike |
| Commercial lexicons (BDAG, HALOT) | Copyrighted | Needs a licence and a budget |
| Berean Strong's data | Public domain, but not needed once STEPBible covers the words | Kept as a possible later cross-check |

## Interim Bible dictionary

Smith's Bible Dictionary, William Smith, print basis 1884. The Christian Classics Ethereal Library states **"Rights: Public Domain"** inside the file (`DC.Rights`), and the ingestion script refuses to run if that line ever disappears. Easton's 1897 is also public domain per CCEL, but CCEL publishes it only as about 4,000 separate web pages, so it is not included. The screens are labelled "Historic reference, from 1884".

## Remaining checks

1. Have a lawyer confirm CC BY attribution wording if SELAH is sold.
2. Confirm the Berean Standard Bible dedication (owner task).
3. If Greek definitions are wanted, verify the copyright status of the Abbott-Smith edition STEPBible used, or use a lexicon with a clear licence.
