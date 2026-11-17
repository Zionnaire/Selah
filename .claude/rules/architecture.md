# Architecture rules

## Frontend

- All persistent user data goes through the SQLite worker in `Frontend/src/data`. Components never import SQLite. They call `getDb()` or a feature repository (`features/*/repo.ts`).
- Schema changes are new entries appended to `MIGRATIONS`. Never edit or reorder an existing one. Every user data table has `id`, `updated_at`, `deleted_at`, `dirty`.
- Deletes are soft. Restore and purge go through the closed `TABLE` map in the worker, so table names never come from input.
- Editable documents use `useAutosave` (`lib/useAutosave.ts`): in memory edits, debounced writes, chained so an older save cannot land after a newer one, flushed on page hide. Do not write a second autosave.
- A feature owns its folder: `features/<name>/` with its repo, hooks and components. Cross feature imports go through repos and hooks, not internals.
- Anything that must work offline must not depend on the network at run time. First run downloads (Bibles, cross-references) are one time and cached in SQLite.
- Controlled inputs that change a grouping or a key must not remount while the user types. Commit such fields on blur or Enter.

## Backend

- One folder per layer, one file per feature in each: Routes, Controllers, Services, Repositories, Models. Dependencies point one way: Routes to Controllers to Services to Repositories to Models.
- Controllers handle HTTP only. Services hold business rules and know nothing about Express or Mongoose. Repositories return plain records, never Mongoose documents.
- Shared types live in `Types.ts`. Shared validation lives in `packages/domain` so browser and API agree.
- `app.ts` builds the app without listening so tests can import it. `server.ts` connects and listens.

## Domain package

- Pure TypeScript, no DOM, no Node APIs, no React. Everything in it has unit tests. Logic that more than one screen needs, or that mobile will need, belongs here.
- A sermon stores Scripture as a reference, never as copied text, so the translation can change.
- Exports, previews and plain text come from one function (`buildExport`) so they cannot disagree.

## Data and licensing

- Keys are canonical verse ids. Book numbers are 1 to 66 in canonical order.
- Translation licence, attribution and offline permission live in `packages/domain/src/translations.ts` and are enforced in data.
- Add an ADR in `docs/adr` for any decision that is hard to reverse.
