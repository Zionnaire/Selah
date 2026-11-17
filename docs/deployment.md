# Deploying SELAH on Render, and setting up email

## 1. You need a domain of your own

SELAH signs users in with a cookie that the API sets and the browser sends back. Browsers only send it when the app and the API are on the same "site".

`onrender.com` is on the Public Suffix List, so `selah-app.onrender.com` and `selah-api.onrender.com` count as **different sites**. Sign in would fail, or need weaker cookie settings that some browsers block.

The fix is a domain you own, with the app and API on subdomains of it. Resend (email) also needs a domain you control before it will send to anyone other than yourself. One domain solves both.

**Cost.** A domain is roughly 10 to 15 US dollars a year for a common ending such as `.com`. Some endings cost more. Check current prices. Two sensible places to buy:

- **Cloudflare Registrar**: sells at wholesale cost with no markup, and gives free DNS management. Needs a free Cloudflare account.
- **Namecheap**: simple, widely used.

Pick a name you are happy to keep, because moving a live domain later is a hassle.

Once you own `example.com`, plan these names:

| Service | Address |
| --- | --- |
| Web app (Render static site) | `app.example.com` |
| API (Render web service) | `api.example.com` |
| Email sending (Resend) | `mail.example.com` |

## 2. Resend: verifying the sending domain

Without a verified domain, Resend only lets its test sender (`onboarding@resend.dev`) deliver to **your own account email**. Password reset emails to real users would not arrive. A free Resend plan exists, so verifying costs nothing beyond the domain. Check Resend's current limits.

Steps, after you own the domain:

1. Resend dashboard, **Domains**, **Add Domain**. Enter `mail.example.com`. A subdomain keeps email records away from the rest of your domain.
2. Resend shows a short list of DNS records (typically SPF and DKIM entries and one for return mail). Copy them exactly.
3. In your DNS manager (Cloudflare or Namecheap, wherever the domain's DNS lives), add each record as shown: type, name, value.
4. Back in Resend, click **Verify**. It often completes within minutes and can take longer.
5. Your API key is already in `Backend/.env`. Set `EMAIL_FROM` to something like `SELAH <no-reply@mail.example.com>`.

Never paste the key anywhere except `.env` and Render's environment settings.

## 3. Render setup

`render.yaml` in the repository describes both services.

1. Push the repository to GitHub (no `.env` files, they are ignored).
2. Render, **New**, **Blueprint**, choose the repository. Render reads `render.yaml`.
3. When prompted, enter the values marked secret: `Mongodb_URI`, `Groq_API_KEY`, `CLIENT_ORIGIN` (the final app address, `https://app.example.com`), `EMAIL_API_KEY`, `EMAIL_FROM`.
4. After the first deploy, open each service, **Settings**, **Custom Domains**, add `app.example.com` and `api.example.com`, then add the CNAME records Render shows at your DNS manager. If you use Cloudflare, set these records to **DNS only** until Render marks the domain verified, then follow Render's current guidance on proxying.
5. In MongoDB Atlas, **Network Access**: allow Render's outbound addresses (listed in the service's Connect menu), or allow access from anywhere for the first launch and tighten it afterwards.
6. Set `VITE_API_URL` on the static site to `https://api.example.com` and redeploy it.

Verify after deploy: `https://api.example.com/health` returns `{"status":"ok"}`, `https://api.example.com/ready` returns `{"status":"ready"}`, and the app installs from the browser's install button over HTTPS.

## 4. Things to know

- **`VITE_API_URL` is read at build time.** Changing it needs a rebuild of the static site, not only a restart.
- **Cookies.** Keep `COOKIE_SAME_SITE=lax` and put the app and API on subdomains of one domain. Different domains would need `none`, which is weaker and not recommended.
- **Proxy hops.** The API trusts the proxy for client IPs (rate limits, device names). After the first deploy, confirm the hop count in `Backend/src/app.ts` matches Render, or limits will key on the wrong address.
- **Local run with no database.** `pnpm --filter @selah/api dev:memory` starts the API on an in-memory MongoDB replica set. Nothing is saved after it stops, and it never touches your Atlas database.

- **Generated data is committed on purpose.** `Frontend/public/bibles`, `Frontend/public/data` (cross-references, word study, dictionary) are built by the `*:ingest` scripts and kept in the repository, so a deploy never depends on third party servers being up. Regenerate with `pnpm bible:ingest`, `pnpm xref:ingest`, `pnpm words:ingest`, `pnpm dictionary:ingest`. The Word Study data is about 24 MB of JSON, which Render compresses when serving.
- **Free web services sleep** after a period of inactivity, and the first request afterwards waits for the service to start. Fine for testing, not for sermon day. Move the API to a paid plan before real use. The app itself keeps working offline either way, because the API is only needed to sign in and sync.
- **Static sites** have no such sleep.
- The service worker caches the app shell. `render.yaml` marks `sw.js` and `index.html` as never cached so new versions are picked up. Users see "A new version of SELAH is ready" and choose when to reload.
