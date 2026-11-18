# What SELAH needs from you

Updated 2026-11-17.

## Waiting on you

### Sign in and sync: designs approved

Approved 2026-11-17. Decisions: the app opens as a guest and the account is offered, never imposed (ADR 0006). "Continue without an account" stays. Building is in progress, see the README status table.

### A. Buy a domain (blocks sign in emails and going live)

This is a personal project, so it needs its own domain. Read `docs/deployment.md`, section 1. In short:

1. Choose a name and buy it, roughly 10 to 15 US dollars a year for a common ending. Cloudflare Registrar sells at cost and also gives free DNS. Namecheap is a simple alternative. Check current prices.
2. Plan three subdomains: `app.` for the web app, `api.` for the API, `mail.` for email.
3. In Resend, add `mail.yourdomain` as a domain, then add the DNS records it shows at your DNS manager and click Verify. Steps are in section 2 of the deployment guide.

Until then everything works locally and offline. Only password reset emails and a live deployment wait on this.

### B. Berean Standard Bible dedication: recorded

Done on 2026-11-18. The official statement, URL and date are in `docs/adr/0003-bible-licensing.md`. Two things remain before launch: read the site's Terms and Conditions page, and compare our BSB text with the official `bsb.txt` (ours comes from a third party copy).

### C. Groq data controls: done

You set them on 2026-11-17. Before launch, re-read Groq's current terms and record which setting applied (ADR 0004).

## Decided and done

- **Word Study** is built from STEPBible-Data and the OpenScriptures Hebrew Lexicon (both CC BY 4.0). Details, and three things I changed from the first plan after reading the real file headers, are in `docs/lexicon-licence-review.md`.
- **Interim Bible dictionary** is built from Smith's Bible Dictionary (1884, public domain), clearly labelled historic reference.
- **Assistant policy**: `docs/adr/0004-ai-assistant-policy.md`.
- **Hosting**: Render static site plus web service, described in `render.yaml`.

## A reviewer for doctrinal and historical content

You do not have a pastor or theologian to ask right now, and I cannot be one. I will not invent historical or doctrinal claims, so these stay paused: **Biblical Context Explorer**, **Theological Perspectives**, and the assistant's Beta label. The interim dictionary covers people and places with clearly dated, attributed text in the meantime.

Ways to get a reviewer:

1. **Your own network.** Pastors from churches you know, a fellowship or denominational office, or a seminary or Bible college. Many will review ministry software for free if the request is small and clear. Ask for a named person.
2. **Seminary graduates and students.** Career offices often connect graduates with short paid or volunteer projects.
3. **Pay someone.** A seminary trained freelancer reviewing a bounded set of work. Agree scope and price first.

Keep the ask small. A good first request: review the 10 most preached books (Genesis, Psalms, Isaiah, Matthew, Luke, John, Acts, Romans, 1 Corinthians, Ephesians) using `docs/content/context-template.md`, plus about 50 assistant test questions.

## Later

- **Sign in and sync screens**: you said yes. I will design them in the same style for you to review before I build.
- **Easton's Bible Dictionary** can be added if you obtain a bulk copy with a clear public domain statement.
- **Greek definitions** need a lexicon with a clear licence (see the licence review, remaining checks).
- **Real feedback**: once online, put the app in front of three to five pastors. I can write the test script.

## Suggestions in Sermon Studio (added 2026-11-17)

- Set `GROQ_API_KEY` (and optionally `GROQ_MODEL`, `AI_DAILY_LIMIT`) on the Render API service. Without a key the panel says suggestions are not switched on.
- Read 20 or so real suggestions yourself before release, on passages you know well, and tell me what reads wrong. The model proposes ideas and references only, but it can be wrong or one sided. A qualified reviewer is still needed before the Beta label comes off.
- Version history (the 30 day copies kept when a merge or a choice replaces text) has no screen yet. Say if you want one.

## Privacy notice and Terms (added 2026-11-17)

The pages at `/privacy` and `/terms` are written from what SELAH actually does. They show a "draft" note until you fill in `Frontend/src/features/legal/config.ts`:

- `operator`: the person or organisation that runs SELAH (not AHFID unless you decide it is).
- `contactEmail`: an address people can write to about their data. Needed for the export promise in the Privacy notice.
- `governingLaw`: for example "the laws of Nigeria". The clause is left out while empty.

Please confirm or correct these statements before launch, since only you can vouch for them:

- That Groq's data controls are set as you reported. The Privacy notice does not claim "no training", on purpose, until you have re-read Groq's terms.
- That SELAH is not directed at children.
- Which regions Render and MongoDB Atlas run in. The notice does not name regions. If you serve people in the EU or UK, or Nigeria's NDPA applies to you, the notice may need a lawful basis section and a data protection contact.
- That server logs may be kept as long as needed. If you want a fixed period, tell me and I will set it in the logger and the notice.

These pages are plain language drafts, not legal advice. Have a lawyer read them before you launch publicly, especially because pastoral content can be sensitive.
