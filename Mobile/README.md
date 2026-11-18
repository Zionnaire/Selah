# SELAH mobile

The native app, built with React Native and Expo (ADR 0007). Android first.

It shares `packages/domain` with the web app and the API, and the database migrations that now live there. Everything else is native: screens, navigation, SQLite through `expo-sqlite`, sign in with the refresh token in the device's secure storage.

## Run it

Needs Node 22.13 or later and, for Android, the Android SDK with an emulator or a phone.

```bash
cd Mobile
npm install
npm start            # builds the theme and copies the Bible text first, then starts Expo
npm run android      # the same, and opens it on an Android emulator or device
npm run typecheck    # theme, bible data, then tsc
```

Point the app at an API with `EXPO_PUBLIC_API_URL`. The default, `http://10.0.2.2:4000`, is how the Android emulator reaches an API running on the computer (`pnpm dev` at the repository root).

## How it is wired

- `scripts/tokens.mjs` reads `packages/tokens/src/tokens.css` and writes `src/theme/tokens.generated.ts`, so colours match the web app.
- `scripts/assets.mjs` copies the King James Version from `Frontend/public/bibles`. Both generated files are not committed.
- `metro.config.js` watches `packages/domain/src` and resolves packages from this folder only, so there is one copy of zod and React.
- Mobile is not part of the pnpm workspace on purpose: its own npm lockfile cannot affect the web or API deploy.

## Rules that carry over

Offline first, canonical verse ids, soft deletes, public domain text only with its attribution shown, no em dashes in copy, lucide icons, at most one gold button per screen, AI output labelled and separate. See `CLAUDE.md` and `.claude/rules/`.

## Builds and updates (EAS)

The EAS project is `@zionnaire/selah`. Three kinds of release, three commands.

| What changed | What to run | Needs a new APK? |
| --- | --- | --- |
| Screens, logic, text, styles, the Bible data file, anything in JavaScript | `npm run update:preview "what changed"` then, once tested, `npm run update:production "what changed"` | No. Installed apps fetch it and apply it on the next launch |
| A new native library, a change to `app.json` native settings (permissions, icon, package), an Expo SDK upgrade | `npm run build:preview` or `npm run build:production` | Yes |
| First install, or a signed bundle for Google Play | `npm run build:preview` (APK for testing), `npm run build:store` (AAB for Play) | Yes |

How it stays safe:

- **Compatibility is checked for you.** `runtimeVersion` uses the fingerprint rule: it is a hash of everything native. An update is only offered to builds with the same hash, so a JavaScript update can never reach an app whose native code it does not match. If an update is not showing up, a native change is the usual reason, and the fix is a new build.
- **Channels.** `preview` builds read the `preview` channel, `production` builds read `production`. Publish to preview first, try it on a phone, then publish to production.
- **Startup never waits for the network.** The app opens with what it has and downloads an update in the background, so it still opens at a pulpit with no signal. The update applies on the next launch.
- **Updates can be rolled back** from the Expo dashboard (Updates, choose the earlier one) or with `eas update:rollback`.

Environment values are public and end up inside the app, so never put a secret in them.

| Variable | Where it is set | Meaning |
| --- | --- | --- |
| `EXPO_PUBLIC_API_URL` | Local: `.env`. Builds and updates: EAS environment variable `preview` and `production` (see below). `development` profile: `eas.json` | The API the app calls. Must be `https` in a release. While empty, the app works fully on the device and says accounts are not switched on |
| `EXPO_PUBLIC_APP_ENV` | `eas.json` per profile | `development`, `preview` or `production` |

Set the API address once your API is deployed:

```bash
npx eas-cli env:create --environment preview --name EXPO_PUBLIC_API_URL --value https://api.example.org --visibility plaintext
npx eas-cli env:create --environment production --name EXPO_PUBLIC_API_URL --value https://api.example.org --visibility plaintext
```

The address is read when a build or an update is created, so after changing it, publish a new update.
