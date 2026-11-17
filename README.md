# SELAH

Scripture study and sermon preparation that works without internet. Web and PWA first, mobile later from the same domain code.

Design source of truth: [docs/design/design-reference-index.md](docs/design/design-reference-index.md).

## Layout

```
Frontend/         Vite + React PWA. Local first: SQLite (WASM) in a Web Worker on OPFS.
Backend/          Express + TypeScript API, MongoDB. Layer folders: Configs, Models, Repositories, Services, Controllers, Routes, Middlewares, Utils.
packages/domain   Shared canonical books, verse references, translation catalogue, zod schemas.
packages/tokens   Design tokens (CSS variables and TS), light, dark and Pulpit themes.
scripts/          Data tooling, for example public domain Bible ingestion.
docs/             Design reference and architecture decision records (docs/adr).
```

## Run it

Requires Node 22 and pnpm 10.

```bash
pnpm install
pnpm bible:ingest        # once, builds Frontend/public/bibles/*.json from public domain sources
pnpm xref:ingest         # once, builds Frontend/public/data/crossrefs.json (OpenBible.info, CC BY)
pnpm words:ingest        # builds the Word Study data (STEPBible and OpenScriptures, CC BY), about 100 MB download
pnpm dictionary:ingest   # builds the interim Bible dictionary (Smith, 1884)
cp Backend/.env.example Backend/.env   # then fill in Mongodb_URI and the JWT secrets

pnpm dev                 # web on :5173, api on :4000
pnpm test                # domain and api tests
pnpm typecheck
pnpm build
```

The web app works fully without the API today: it runs as a guest, with everything stored on the device.

## Status

| Area | State |
| --- | --- |
| Design system, tokens, shell, dark theme, responsive layout, PWA | Done |
| Offline data layer (SQLite, migrations, full text search) | Done |
| Bible reader: pickers, highlights, bookmarks, compare, parallel, search | Done |
| Translation downloads (KJV bundled, WEB, ASV, BSB) | Done |
| API: auth with rotating refresh tokens, health, validation, rate limits | Done |
| Sermon Studio: library, new sermon, editor with autosave, outline and time budget | Done |
| Pulpit Mode: prepare, manuscript, outline and scripture views, timer, blank screen, find verse, session summary | Done |
| Library (all items, sermons, notes, bookmarks), Notes linked to verses and sermons, Recently deleted with restore and 30 day purge | Done |
| Sermon export: Pulpit Edition, Manuscript, Printable outline (print or PDF, A4 or Letter) and plain text, all offline | Done |
| Cross-references in the reader (89k links, offline, CC BY attributed) | Done |
| Study and Research: passage and topic studies, collected verses, start a sermon from a study | Done |
| Word Study: every Hebrew and Greek word, parsing in plain English, dictionary entry, how translators render it, every occurrence | Done |
| Interim Bible dictionary (Smith, 1884), clearly labelled historic reference | Done |
| Context Explorer, Theological Perspectives | Blocked on a qualified reviewer, see docs/needs-from-you.md |
| Collections | Next |
| Accounts: guest first, create account, sign in, password reset by email, devices, account deletion (ADR 0006) | Done, needs a domain and Resend verification to send real email |
| Sync API: push and pull, conflicts, history, quotas (ADR 0005), merge engine in `packages/domain` | Done, 52 API and 75 domain tests |
| Sync in the app: backup offer, automatic and manual sync, merge, conflict review, delete forever reaching other devices, status in the rail and Settings | Done, verified with two devices against a local API. Version history has no screen yet (kept 30 days) |
| Sermon suggestions: Topic field, SELAH suggests points, introductions and conclusions with editable text and Scripture you read in full before adding (ADR 0004 amendment) | Done, Beta. Needs `GROQ_API_KEY` on the server and a sign in |
| Collapsible side areas: navigation rail, sermon editor panels, library sections, study tools, export options. One light and dark control on every page | Done |
| Profile picture, name and church, on the account | Done |
| Front page for new visitors (`/welcome`) | Done |
| SELAH assistant (AI gateway) | Planned |

## More documentation

- [CLAUDE.md](CLAUDE.md) and `.claude/` hold the project rules, review skills and agents.
- [docs/deployment.md](docs/deployment.md) covers Render, domains and email. `render.yaml` is the Blueprint.
- [docs/needs-from-you.md](docs/needs-from-you.md) lists what is waiting on the owner.
- [docs/lexicon-licence-review.md](docs/lexicon-licence-review.md) is the Word Study source review.

## Principles

- Canonical verse ids (`ROM.12.2`) key every piece of user data.
- Scripture style is for Scripture only. SELAH (AI) output is always labelled and visually separate.
- Nothing the user writes is lost: user tables carry `updated_at`, `deleted_at` and `dirty` so sync can be added without rewrites.
- Public domain translations only until licences are in place. Licence data lives in `packages/domain`, not in UI code.


## Known follow-ups (from review, not yet done)

- An autosave that lands in the moment after a pull can overwrite the pulled version. The fix is a compare and set on save.
- Records pulled from the server take the time of the pull, so lists can reorder after a sync. The server needs to carry original times.
- A delete made here that is undone by an edit elsewhere shows no explanation.
- A push retried after a dropped connection gets a new idempotency key. It is safe (it recovers through the pull) but not the guarantee ADR 0005 describes.
- A failed save leaves the editor marked busy, so sync keeps deferring that record until it saves.
- No screen yet for the 30 day version history.
- No email verification before AI use, so free accounts can multiply the daily allowance. Needs the sending domain first.
- `pnpm audit`: upgrade vitest, vite and react-router before release.
