# 0003. Bible text and licensing

Status: accepted

## Decision

Launch with public domain translations only: KJV (bundled on first run), World English Bible, American Standard Version and Berean Standard Bible. Licensed translations (ESV, NIV, NLT and others) are out of scope until licences exist.

- `packages/domain/src/translations.ts` is the catalogue. Each entry carries its licence, attribution line and whether offline storage is allowed. The downloader refuses translations that disallow offline storage, so the rule is enforced in data and not in UI code.
- `scripts/ingest-bibles.mjs` builds compact per translation files from public sources. Verse counts are checked on ingest (KJV is exactly 31,102).
- The reader footer and every export must show the translation's attribution line.
- Do not reproduce Ezra 7:10 from the ESV in artwork. The KJV wording is used on the brand sheet.

## Cross-references (decided)

OpenBible.info cross-references, licensed CC BY. `scripts/ingest-crossrefs.mjs` keeps links with at least 5 votes and the best 10 per verse (89,042 links). Wherever they appear the UI shows `CROSSREF_ATTRIBUTION` from `@selah/domain`. Do not remove that line.

## Word study and dictionary (decided)

See `docs/lexicon-licence-review.md`. Original language data is CC BY 4.0 from STEPBible-Data and the OpenScriptures Hebrew Lexicon, with the Hebrew "Meaning" column deliberately excluded, the Greek base text limited to the Textus Receptus, and Tyndale's CC BY-NC ESV tags excluded. The interim dictionary is Smith's 1884, public domain per CCEL. Each ingestion script records its sources, and the dictionary script refuses to run if the Public Domain statement disappears.

## Open items
- Lexicon data (Strong's, OSHB): confirm each licence before display, as the design index already requires.
- Compare the BSB text we ship against the official `bsb.txt` (see Berean Standard Bible evidence, below). Our copy comes from a third party repackaging, not from the official files.

## Berean Standard Bible: licence evidence

Read by us from the official site on 2026-11-18. The pages carry no page date or version of their own, so this record is the dated copy.

- **Source:** https://berean.bible/licensing.htm ("Free Licensing")
- **Statement, verbatim:** "The Berean Bible and Majority Bible texts are officially placed into the public domain as of April 30, 2023. See terms and conditions. Licensing is not required for any use. However, you are welcome to complete the licensing form in order to receive communications as we develop new resources."
- **Date:** the public domain date is 30 April 2023. The page states no other dedication date.
- **Attribution:** the page does not ask for any. We still credit the translation, as we do for every translation.
- **Decision:** the BSB text may be used in SELAH without a separate licence. Status: public domain.

What this does not cover. The statement is about the Berean Bible and Majority Bible texts. It says nothing about the audio recordings, artwork, study tools (outlines, concordance, topical index), commentary, or any third party datasets, and nothing in SELAH may assume those carry the same dedication. SELAH uses the text only. The Majority Bible is not used. The site's Terms and Conditions page (https://berean.bible/terms.htm) is linked from the statement and was not read for this record. Read it before launch.

Where our text comes from. The BSB in SELAH is ingested from the scrollmapper bible dataset (`scripts/ingest-bibles.mjs`), a third party repackaging of the text, not from the official downloads. The official site offers `bsb.txt` and USFM files, marked "updated to 3rd Printing". Before launch, compare our verses with the official text so we know which printing we ship and that nothing differs. Record the result here.
