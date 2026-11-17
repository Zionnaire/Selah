---
name: debugging
description: Structured debugging for SELAH: reproduce, isolate, diagnose, fix, and add the test that should have caught it. Use when something misbehaves, a page crashes, data is lost or not saved, offline behaves differently, or a test fails and the cause is not obvious.
---

# Debugging

Do not guess. Find the cause, prove it, then fix it.

## Steps

1. **State the symptom exactly.** What was done, what happened, what was expected. Note the screen, the data, online or offline, desktop or phone.
2. **Reproduce it.** Prefer the production build in a real browser (`pnpm --filter @selah/web build`, `vite preview`). Collect console errors and page errors. For input bugs, type slowly. For persistence bugs, reload. For offline bugs, set the browser offline after the service worker is ready.
3. **Isolate.** Narrow to one layer: UI state, hook, repo, worker SQL, or API. Add a temporary log or a minimal script, not a broad change.
4. **Find the cause.** Read the code path end to end. Typical causes in this codebase:
   - A render dereferences state that lags input (for example `ref!` after the input became invalid).
   - A keyed element remounts while typing because the key or grouping changed.
   - The OPFS file is still held by the previous page, so the app fell back to memory. Check `db.mode`.
   - An older autosave landing after a newer one, or a save not flushed on page hide.
   - A selector or wait that passes too early because another screen shares the class.
5. **Fix the cause, not the symptom.** Smallest correct change. No unrelated refactors.
6. **Add the regression test** at the level that should have caught it (domain unit test, supertest, or a scripted browser step), and watch it fail without the fix.
7. **Verify.** `pnpm typecheck`, `pnpm test`, `pnpm build`, then the original reproduction.
8. **Report** the cause in one or two sentences, what changed, and what now guards against it.

If you cannot reproduce it, say so and list what you tried. Do not claim a fix you could not observe.
