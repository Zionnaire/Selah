---
name: release-check
description: Pre-release verification checklist for SELAH covering tests, builds, data, licences, offline behaviour, security, deployment configuration and rollback. Use before deploying to Render or tagging a release.
---

# Release check

Work through every item. Mark each Pass, Fail or Not checked, with evidence. Stop and report if anything fails.

## Build and tests
- [ ] `pnpm install --frozen-lockfile` succeeds from a clean clone.
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm build` pass. Quote the test counts.
- [ ] `pnpm audit` has no unreviewed high or critical findings.

## Data and licences
- [ ] `Frontend/public/bibles/*.json` and `Frontend/public/data/crossrefs.json` exist and verse counts match (KJV 31,102).
- [ ] Every translation in `packages/domain/src/translations.ts` is public domain with a recorded source. Berean Standard Bible dedication confirmed and recorded in `docs/adr/0003`.
- [ ] Cross-reference attribution shows wherever cross-references appear. Any new third party data has its attribution in Settings, About.

## Product behaviour (production build, real browser)
- [ ] First run on a clean profile: boots, KJV prepares once, cross-references install.
- [ ] Create a sermon, write, reload: content is kept. Enter Pulpit, navigate, blank screen, end session.
- [ ] Offline (service worker ready, network off): reader, Library, sermon editor and Pulpit all load.
- [ ] Phone width 390: no horizontal scroll, bottom tabs work, selection bar usable.
- [ ] Recently deleted restores. Export prints with the attribution footer.
- [ ] Console shows no errors other than the known OPFS retry notice on rapid reload.

## Security and config
- [ ] No secrets in the repository or the web bundle. `.env.example` lists every variable.
- [ ] `COOKIE_SAME_SITE` matches the domain plan in `docs/deployment.md`. HTTPS only.
- [ ] `/health` and `/ready` respond. Rate limits active. CORS equals the deployed app origin.

## Deployment
- [ ] `render.yaml` validated by Render. Custom domains attached, DNS records in place. Email domain verified in Resend if email is in this release.
- [ ] Atlas network access set. Backups enabled.
- [ ] Rollback plan stated: previous deploy to roll back to, and whether the release includes a schema migration (migrations only append).

## Output
A table of the items with Pass, Fail or Not checked, then **Go or No-go** with the reasons.
