---
name: security-audit
description: Audit SELAH for security and privacy problems in auth, input handling, secrets, cookies, dependencies and data exposure. Use before a release, after touching authentication or the API, or when adding anything that handles user content or third party data.
---

# Security audit

Read `.claude/rules/security.md`. Never open or print `.env` files. Checking that a variable is required in `Configs/env.ts` is enough.

## Checklist

**Secrets and config**
- Search the repository (including git history if it exists) for key-like strings, URLs with credentials, and committed `.env` files. Report names and locations, never values.
- `.gitignore` excludes `.env*` except `.env.example`. Required secrets fail fast at boot.

**Authentication** (`Backend/src/Services/auth.ts`, `token.ts`, `Controllers/auth.ts`)
- Hash cost, token lifetimes, refresh rotation and reuse revocation, unknown-email timing, cookie flags (httpOnly, Secure in production, path, SameSite matches the deployment).

**Input and injection**
- Every route validates its body with zod. SQL is parameterised and identifiers come from closed constants. No `dangerouslySetInnerHTML`, no `eval`, no unescaped HTML from search snippets.

**Transport and headers**
- CORS limited to `CLIENT_ORIGIN`. Helmet on. Rate limits on credential routes. `render.yaml` sets no-cache on `sw.js` and `index.html`.

**Privacy**
- No request or response bodies in logs. AI questions and answers are not stored by default. Plan exists for data export and account deletion.

**Dependencies**
- Run `pnpm audit`. Report high and critical with the fix version. Flag unmaintained or unnecessary packages.

**Client**
- Service worker caches only intended assets. No secrets in the web bundle (only `VITE_` public values). localStorage holds preferences only, not user content.

## Output

Findings table: severity (critical, high, medium, low), location, what is wrong, how it is exploited, fix. Then a list of things checked and found sound. Separate what you verified by reading code or running a command from what you assume.
