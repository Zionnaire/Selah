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
- Confirm the Berean Standard Bible public domain dedication wording before launch and keep the source URL in the repo.
