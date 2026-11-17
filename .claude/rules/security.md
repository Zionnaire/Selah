# Security rules

SELAH holds private sermon drafts and notes that can include pastoral counselling details. Treat all user content as sensitive.

## Secrets

- Never read, print, log or commit `.env` files or their values. Variable names are fine. `.claude/settings.json` denies reading and editing them.
- Do not paste keys into chat, issues or commit messages. Production secrets live in Render's environment settings.
- Required secrets are validated at boot in `Backend/src/Configs/env.ts`. The API refuses to start when they are missing.

## Authentication

- Passwords: bcrypt, cost 12. Never log or return hashes.
- Access tokens last 15 minutes. Refresh tokens are opaque, stored only as SHA-256, rotated on every use, grouped in a family. Presenting a used token revokes the family.
- Login for an unknown email still performs a hash comparison, so timing does not reveal which emails exist. Error messages do not say which field was wrong.
- The refresh cookie is httpOnly, Secure in production, path limited to `/api/v1/auth`. `COOKIE_SAME_SITE` stays `lax` when the app and API share a domain.

## Input and output

- Validate every request body with zod at the route (`validateBody`). Never trust types alone.
- SQL: always parameterised. Table or column names come only from closed constants, never input.
- No `dangerouslySetInnerHTML`. When highlighting search matches, split on markers and render elements, as `SearchResults.tsx` does.
- Rate limit credential endpoints tightly (`authLimiter`) and the API generally (`apiLimiter`).
- CORS allows only `CLIENT_ORIGIN`. Helmet stays enabled.

## Privacy

- Do not store AI questions or answers on the server by default. Do not write request bodies to logs. `pino` redacts authorization and cookie headers.
- Account deletion must remove the user's server data. Plan for export and delete before launch.
- Cross-references and any third party data keep their licence attribution visible.

## Dependencies

- Prefer fewer, maintained packages. Run `pnpm audit` before a release and review anything high or critical.
- Pin exact build tooling through the lockfile. Install with `--frozen-lockfile` in CI and on Render.
