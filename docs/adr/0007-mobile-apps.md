# 0007. Mobile apps: React Native with Expo

Status: accepted. Decided by the owner on 2026-11-18.

## Context

SELAH is web and PWA first. The owner wants native mobile apps, and chose a true native rewrite with React Native and Expo over wrapping the web app (Capacitor) or staying a PWA. The costs were stated up front: every screen and the whole data and sync layer are rebuilt, and there are two user interfaces to keep consistent.

## Decisions

### What is shared and what is not

- **Shared:** `packages/domain` only (books, references, sermon, note and study models, zod schemas, the export builder, the three way merge, the sync reconcile rules and protocol, suggestion contract) and, new with this decision, the **database migrations**, which moved into `packages/domain/src/schema.ts`. Both apps run the same schema, so they cannot drift.
- **Shared by generation, not by hand:** the colours. `Mobile/scripts/tokens.mjs` reads `packages/tokens/src/tokens.css` and writes the native theme, so light and dark match the web.
- **Not shared:** every screen, the navigation, the database access (the web uses SQLite compiled to WebAssembly in a worker on OPFS, the app uses `expo-sqlite`), the sync engine's SQL, the autosave hook, and the secure storage.

### Where it lives

`Mobile/` at the repository root, **outside the pnpm workspace**, with its own npm lockfile and `node_modules`. React Native's bundler (Metro) wants a different package layout than the web build and Render's install uses the pnpm workspace as it is. Keeping them apart means a mobile dependency can never break the web or API deploy. `Mobile` reads `packages/domain/src` directly through Metro's `watchFolders` and a path alias, so there is still one copy of the domain code.

### Sign in

Cookies are not dependable in a native app. The app sends `X-SELAH-Client: native`. The API then returns the refresh token in the response body instead of a cookie, and accepts it back in the request body to refresh and sign out. The app keeps it in `expo-secure-store` (Android Keystore, iOS Keychain). Everything else is unchanged: the token is opaque, stored hashed on the server, rotated on every use, and a replayed token revokes the whole family. The access token stays in memory only. A web page cannot use this path because the custom header forces a CORS preflight that only the web app's origin passes.

### Offline first, same rules

All user data lives on the device in SQLite and every core feature works with no network. The app downloads the same public domain Bibles and data files as the web app, once, into SQLite. Canonical verse ids key everything. Deletes are soft. Sync follows ADR 0005 unchanged, and the pure merge and reconcile code is the same code the web app runs.

### Platforms and order

Android first (the owner has no Apple developer account yet), iOS after. Expo is cross platform, so iOS work is mostly signing, testing and platform polish.

### Build order

1. **Foundation:** project, navigation, theme from the shared tokens, the shared migrations running on `expo-sqlite`, secure sign in.
2. **Bible:** download and install translations, reader, verse selection, highlights, bookmarks, search, cross-references.
3. **Library:** notes, studies, Recently deleted.
4. **Sermon Studio:** editor, autosave, outline, export, Suggest.
5. **Pulpit Mode:** with the screen kept awake.
6. **Sync:** the engine over `expo-sqlite`, the conflict screen, the backup offer.
7. **Word Study and the dictionary.**
8. **Release:** icons, splash, signing, Play Console listing, privacy declarations.

## Consequences

Roughly several times the work of a wrapper, in exchange for native navigation, gestures, text rendering, keyboard behaviour and background handling, and room for platform features later (widgets, share sheets, notifications). Every screen exists twice. To keep them consistent, a behaviour change starts in `packages/domain` where it can, and `docs/design` stays the visual source of truth for both. Screens are matched to the same designs, then adapted to native patterns.

Two rules protect the web app while this is built: nothing under `Mobile/` is imported by `Frontend`, `Backend` or `packages/*`, and a change to `packages/domain` must keep `pnpm test` green, because the web, the API and the app all depend on it.

## Amendment 2026-11-18: builds and updates with EAS

- **Builds:** EAS Build from the Expo account `zionnaire`, project `@zionnaire/selah`. Profiles: `development` (a development client), `preview` and `production` (APKs, so they can be installed directly and shared), and `store` (an Android App Bundle for Google Play). Credentials are managed by EAS.
- **Updates:** EAS Update. Anything that is JavaScript or an asset, including the bundled Bible text, ships as an update with no new build. Anything native needs a new build.
- **Compatibility:** `runtimeVersion` uses the `fingerprint` policy, so an update is only offered to a build whose native code is identical. This is stricter and safer than tying it to the app version number.
- **Channels:** `preview` and `production`, each tied to the build profile of the same name. Testing goes through preview first.
- **Offline first:** `checkAutomatically: ON_LOAD` with `fallbackToCacheTimeout: 0`. The app starts at once with what it has, fetches an update in the background, and uses it on the next launch.
- **Environment:** public values only, in `eas.json` and EAS environment variables. A build with no `EXPO_PUBLIC_API_URL` runs fully on the device and says accounts are not switched on.
- **Upload:** EAS archives the whole git repository, because `Mobile` reads `packages/domain`, the tokens and the Bible data from outside its folder. The generated theme and Bible data file are rebuilt on the build server by the `eas-build-post-install` script.
