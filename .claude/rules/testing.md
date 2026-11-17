# Testing rules

## What gets which kind of test

| Code | Test |
| --- | --- |
| `packages/domain` (parsing, models, export, validation) | Vitest unit tests next to the code. Required for every exported function with logic |
| `Backend` services and middleware | Vitest. Controllers through supertest against `createApp()`. Do not need a database for validation, auth guard and error paths |
| UI flows | Run the app in a real browser and exercise the flow, including reload and offline |

## Before calling work done

1. `pnpm typecheck`, `pnpm test`, `pnpm build` all pass.
2. For UI changes, run the production build (`pnpm --filter @selah/web build`, then `vite preview`) and drive it in a browser. Look at screenshots at desktop (1440 wide) and phone (390 wide) widths.
3. Check reload persistence (data survives a refresh) and offline behaviour (service worker plus SQLite) for anything that stores data.

## Habits that have caught real bugs here

- **Type slowly.** Drive inputs with a per key delay. A half typed value is invalid for a moment, and a render that dereferences stale state crashes. Do not paste a whole value instantly.
- **Reload mid flow.** The previous page can hold the OPFS file for a moment. The client retries, so a reload test should still find saved data.
- **Check the thing, not a proxy.** A selector that also exists on another screen can pass too early. Wait for the URL or a unique element.
- **Test the failure state.** Invalid reference, empty state, offline, storage unavailable.
- When a bug is found, add the case to the test that should have caught it before fixing.

## Open items

An automated browser suite (Playwright) is not in the repository yet. Until it is, browser checks are manual or scripted outside the repo. Adding it is a standing task.
