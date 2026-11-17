# 0001. Local first data layer

Status: accepted

## Context

The product promises Pulpit Mode that works with no signal, instant autosave ("Saved on this device"), and a visible sync state. A pastor must never lose a sermon because a connection dropped. MongoDB is provisioned for the server, but it cannot serve a browser that is offline.

## Decision

- The browser owns a SQLite database (`@sqlite.org/sqlite-wasm`) running in a dedicated Web Worker, persisted in OPFS using the `opfs-sahpool` VFS. That VFS needs no cross origin isolation headers, so the app can be hosted anywhere.
- The UI talks to the worker through a typed Comlink API (`Frontend/src/data/types.ts`). No component imports SQLite.
- Schema changes are append only migrations tracked with `PRAGMA user_version`.
- User data tables carry `id` (uuid), `updated_at`, `deleted_at` (soft delete) and `dirty`. This is what a sync engine needs, so adding sync later does not rewrite the tables.
- Reference data (Bible text) is read only, imported from static files, and searchable with FTS5.
- MongoDB stays the server of record. Sync will exchange changed rows by `updated_at` cursor, with per field merge for metadata and a document level strategy for manuscripts (decision deferred to the Sermon Studio ADR).

## Consequences

- The app is useful before any account exists. Accounts add backup and multi device, they do not gate the product.
- If OPFS is unavailable, or another tab holds the file, the app falls back to memory and says so in the UI. It never silently loses data.
- Two tabs cannot write at once. The client retries briefly (covers reloads) and then tells the user to close the other tab.
