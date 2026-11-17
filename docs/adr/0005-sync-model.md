# 0005. Sync model

Status: proposed, revised after an independent review. To be confirmed when the sign in and sync screens (docs/design batch 4) are approved.

## Context

SELAH is offline first. A guest can become an account holder without losing work, one person may use several devices, and a pastor's writing must never be lost silently. The data layer marks user records with `id`, `updated_at`, `deleted_at` and `dirty` (ADR 0001).

An independent review of the first draft found three critical, four high and four medium problems. Each is resolved below and listed in the review log at the end.

## Decisions

### Principles

- **An account adds backup and sync. It is never required.** Everything works as a guest. Signing out never deletes local work.
- **Device clocks are never used to decide anything.** Time is shown to people. Merging uses comparison against the stored base version and the server's arrival order.
- **Nothing is lost silently.** Conflicts are shown to the user. Replaced versions are kept for 30 days.

### What syncs

Sermons, notes, studies, highlights and bookmarks. Reference data (Bibles, cross-references, word study, dictionary) never syncs, each device downloads its own. **Settings do not sync in the first release**, because that table has no change tracking and the value is small.

### Record identity

- Sermons, notes and studies keep their random uuid.
- **Highlights and bookmarks are keyed by the verse itself**: the record id is the canonical verse id (`ROM.12.2`). Two devices marking the same verse offline are therefore the same record, not a collision. This needs a migration that re-keys existing rows, which is why it is decided here.
- A highlight or bookmark is a single on or off state. Merging compares the state to the base: a state changed on only one side takes that side, changed on both to the same value is fine, and a removal on one side against a re-add on the other resolves to **present**, since nothing is lost that way.

### Protocol

The client pushes changed records and pulls changes since a cursor.

- Each record has a server assigned `rev`, a counter that only increases per account.
- **Writes are serialised per account.** A push batch is applied in one database transaction that also takes the next revs, and pulls return only revs up to the last committed value, so a cursor can never skip a record.
- A push carries the `baseRev` the client last saw for each record. The server applies it only if that equals the current `rev`. Otherwise it returns the current server version as a conflict.
- Each batch has an idempotency key. The server stores its per record result for 24 hours under `(accountId, key)`, so a retry after a dropped connection gets the same answer.
- The response is **per record**: applied, conflict or rejected, so one bad record never fails a batch.
- On the client, `dirty` is cleared only if the record's local `change_seq` is unchanged since the push started. Two saves in the same millisecond cannot be mistaken for one.

### Local state

- `sync_base`: the last server version of a record, **copied the first time a record becomes dirty after a sync** (copy on write). It is only needed for records edited since the last sync, so it does not double storage. It counts in the offline storage figures.
- `sync_state`: cursor, last success time, account id.
- `record_history`: any version about to be replaced, kept 30 days.
- Per record: `account_id` and `local_only` (see Ownership), `change_seq`.

### Merge

Three way, comparing local, remote and base. Rules live in `packages/domain` with tests. A conflict arises only where both sides changed the same thing.

| Data | Rule |
| --- | --- |
| Detail fields (title, passage, date, status, series) | A field changed on one side takes that side. Changed on both to different values: the server's value (first to arrive) wins and the other is saved in history |
| Sections (matched by id) | Added on one side: added. Changed on one side only: that side. Deleted on one side and untouched on the other: deleted. **Deleted on one side and edited on the other: the edit is kept**, and the user is told |
| Section order | Taken from the side that reordered relative to the base. If both reordered differently, the server's order wins |
| Blocks inside a section (matched by id) | Merged the same way as sections. A **conflict** only if the same block was edited on both sides, or deleted on one and edited on the other |
| Study collected verses | Compared to the base as a set of verses: additions union, a removal on one side with no edit on the other removes it |
| Note body | Changed on both sides: a **conflict** (whole body). Line level merging is a possible later improvement |
| Section ids | Stable when a section moves. Any future split must keep the original id on the first part |

**Autosave alone is not an edit.** A save whose content equals the base does not count as a change, does not mark the record dirty and never revives a deleted record. (The current code also stopped resetting `deleted_at` on autosave as part of this review. Only an explicit restore or re-marking a verse revives a record.)

### Conflicts

Never resolved silently. The user chooses per conflicting section: **keep this device**, **keep the other device**, or **keep both**. For a sermon or study, *keep both* adds the other section as a clearly named copy after it, unless the document is already at the 60 section limit, in which case only the first two choices are offered. For a note, *keep both* creates a second note titled with the device name. Until chosen, the local version stays in use and syncing pauses for that record only.

### Deletion

- **Soft delete is a tombstone** and syncs like any change.
- **Purging never removes the tombstone.** Permanent removal (after 30 days, or "Delete forever") turns the row into a content free stub holding only `id`, `deleted_at` and `rev`, kept until the server confirms it. "Delete forever" also erases the content on the server.
- The server keeps tombstones for 90 days. A device whose cursor is older than that does a full reconcile of ids instead of a delta, so a device offline for months cannot resurrect deleted records.

### Ownership and accounts

- Every user record has `account_id`, empty for guest work. `local_only` marks records the user chose to keep off the account.
- **Signing in as a different account never exposes the first account's work.** Account A's records stay on the device owned by A and are invisible to B. Only guest work, and B's own, is offered to B.
- Guest to account: guest records upload as new records, as before. Signing in to an existing account with guest work asks once: add it (default) or keep it on this device only (`local_only`). Neither deletes anything.
- **Account deletion** removes the account's records, tombstones, idempotency entries and refresh tokens on the server. Devices then treat the account as removed and keep the local work as guest work. They never wipe it.

### Security

- `accountId` always comes from the verified token, never from a request body. All routes are rate limited. Every record is validated with the shared zod schemas.
- Per account quotas, a maximum batch size and a maximum byte size per push.
- The server keeps 30 days of history per record, so a stolen token that pushes mass deletes can be undone.
- A batch that deletes more than a set number of records is held and needs the client to confirm.
- Refresh tokens are already one per sign in, which gives per device sessions. Signing a device out revokes that token family.

### Where sync runs

In the database worker, the one place that holds OPFS, guarded by a Web Lock. A second tab that fell back to memory never syncs.

### Triggers

On open, a few seconds after changes settle (online), when connectivity returns, and on "Sync now". Browser background sync is used where available and never relied on.

### Visible status

One of: Synced, Syncing, Waiting to sync (n changes), Offline, Needs attention, Signed out. Wording never claims "synced" for work that is only on the device.

## Schema changes this requires (migration 7 onward)

1. Re-key `highlights` and `bookmarks` so `id` equals `verse_id`.
2. Add `account_id`, `local_only` and `change_seq` to sermons, notes, studies, highlights and bookmarks.
3. Add `sync_base`, `sync_state` and `record_history`.
4. Change purge to leave a stub, and add a "stub awaiting server confirmation" state.
5. Server: `records` indexed by `(accountId, kind, id)` and `(accountId, rev)`, an `accounts` counter document, a tombstone horizon, an idempotency collection with a 24 hour expiry, and 30 days of history.

## Design consequences

The review found the first version of the screens promised things the model could not deliver. Resolved:

- **"Use mobile data" is removed.** The browser API that reports connection type does not exist on Safari or Firefox. Sync waits for any connection and the user can switch sync off.
- **Device places such as "Abuja" are removed** from the device list and the sign in alert. They would need IP geolocation and a privacy decision. Devices show browser, system and last synced time, and the user can rename them.
- **"Keep both"** is defined as a section copy (above), consistent between the model and screen 35.

## Alternatives considered

- **Last write wins per record.** Silently destroys the other device's writing. Rejected.
- **CRDT text sync (Yjs, Automerge).** Right for live co-editing, heavy for one person on a few devices, which section level merging covers. Revisit if collaboration becomes a goal.
- **End to end encryption.** Strong privacy, but prevents server side features and makes account recovery destructive. Out of scope for the first release. Content is encrypted at rest by the database.

## Review log

| # | Finding | Resolution |
| --- | --- | --- |
| 1 critical | Purge hard deletes tombstones, so old devices resurrect records | Stubs, 90 day server horizon, full reconcile for old cursors |
| 2 critical | Highlight and bookmark ids collide across devices | Keyed by verse id (migration 7) |
| 3 critical | Merge relied on device clocks | No clocks. Three way against base, arrival order, state comparison |
| 4 high | Cursors can skip records, retries unsafe | Serialised transactional writes, committed watermark, per record results, stored idempotent responses, `change_seq` |
| 5 high | Structure not covered by merge rules | Explicit list merge rules above |
| 6 high | Autosave revives deleted records and fakes edits | Fixed in code now, base comparison in the model |
| 7 high | Another account inherits local data | `account_id` and `local_only`, strict visibility, deletion rules |
| 8 medium | Stolen token could wipe everything | History, mass delete hold, quotas, token from header only |
| 9 medium | Two tabs | Sync in the OPFS worker under a Web Lock |
| 10 medium | Screens promised the impossible | Design changed, see above |
| 11 medium | Settings cannot sync, base doubles storage | Settings excluded, copy on write base, counted in storage |

## Consequences

More client work (base snapshots, merge, history, stubs) in exchange for no silent loss. The conflict screen is rare in practice, because most differences merge on their own. The same model supports sharing and review later.
