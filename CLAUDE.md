# SELAH

Scripture study and sermon preparation that works without internet. Web and PWA first, mobile later from the same domain code. Read README.md for status and docs/adr for decisions.

## Commands

```bash
pnpm install
pnpm dev                       # web :5173, api :4000
pnpm typecheck                 # all packages
pnpm test                      # domain and api unit tests
pnpm build
pnpm bible:ingest              # rebuild Frontend/public/bibles
pnpm xref:ingest               # rebuild Frontend/public/data/crossrefs.json
pnpm words:ingest              # rebuild Word Study data (verifies nothing: re-read docs/lexicon-licence-review.md first)
pnpm dictionary:ingest         # rebuild the interim Bible dictionary (refuses to run if the source drops its Public Domain statement)
```

A change is not done until `pnpm typecheck`, `pnpm test` and `pnpm build` pass and, for UI work, you have run the app in a browser. See `.claude/rules/testing.md`.

## Layout

```
Frontend/         Vite + React PWA. SQLite (WASM) in a Web Worker on OPFS holds all user data.
Backend/src/      Configs Models Repositories Services Controllers Routes Middlewares Utils Types.ts
packages/domain   Shared: books, references, sermon/note/study/export models, zod schemas. Pure, tested.
packages/tokens   Design tokens (CSS variables), light, dark and Pulpit themes.
docs/             design/ (the visual source of truth), adr/, deployment.md, needs-from-you.md
```

## Rules that must not be broken

1. **Offline first.** The user's data lives on the device and every core feature works with no network. The server is for sign in, backup and sync only.
2. **Canonical verse ids** (`ROM.12.2`, book numbers 1 to 66) key all data. Never key by display text.
3. **No licensed text.** Public domain translations only. Licence data lives in `packages/domain`. Cross-references need their CC BY attribution wherever shown.
4. **Never print, read or commit `.env` values.** Names of variables are fine.
5. **Scripture style is only for Scripture. SELAH (AI) output is always labelled and visually separate.** Gold: at most one gold button per screen.
6. **The user's words stay theirs.** SELAH never fills study sections. In Sermon Studio it may suggest points and conclusions (ADR 0004 amendment), only as editable proposals the pastor adds on purpose.
7. **No em dashes or double dashes in UI copy, comments or docs.** Use commas, colons or full stops. Real icons from lucide-react only, no emoji icons.
8. **Do not invent doctrinal, historical or scholarly claims.** Content that needs an expert is imported from a reviewed source, see docs/content.

Detailed standards: `.claude/rules/` (architecture, security, testing, coding-standards).

## Working here

- Match the design in `docs/design` (read the PNG and `design-reference-index.md`). Improve it where it falls short, and say what you changed and why.
- Migrations in `Frontend/src/data/schema.ts` are append only. Never edit a shipped one.
- User data tables carry `updated_at`, `deleted_at`, `dirty`. Delete means soft delete.
- Prefer extending `packages/domain` for logic that is pure, so it is unit tested and reusable on mobile.
- When something needs a decision, a licence, an account or expert content from the owner, write it in `docs/needs-from-you.md` rather than guessing.

## Skills and agents

Skills: `architecture-review`, `security-audit`, `debugging`, `release-check`. Agents: `architect`, `security-reviewer`, `test-engineer`, `code-reviewer`. Use the reviewer agents on a diff before calling a larger change finished.
