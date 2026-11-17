---
name: architecture-review
description: Review SELAH code or a proposed design against its architecture rules (offline first, layering, canonical ids, append only migrations). Use before merging a large change, when adding a feature, or when someone proposes a new data store or dependency.
---

# Architecture review

Read `.claude/rules/architecture.md` and the ADRs in `docs/adr` first.

## Steps

1. **Scope.** Run `git diff` (or read the files named) and list what changed: data, UI, API, domain.
2. **Offline first.** For each new feature ask: does it work with no network? Where is the user's data stored? Is anything fetched at run time that should be cached or bundled? Does it show honest offline and save state?
3. **Data layer.** Is persistence only through the SQLite worker and a feature repo? Is the migration appended, never edited? Do new user tables carry `id`, `updated_at`, `deleted_at`, `dirty`? Is deletion soft, and is restore and purge covered?
4. **Keys and licensing.** Are verses keyed by canonical id? Does any new data source have a verified licence and an attribution line? Is a translation licence enforced in data?
5. **Layering.** Frontend: feature folder owns its logic, no cross feature reach into internals. Backend: Routes to Controllers to Services to Repositories to Models, no upward imports, no Express types in services, no Mongoose documents leaking out of repositories.
6. **Reuse.** Is logic that is pure and shared (or needed by mobile) in `packages/domain` with tests? Is there duplicated logic that an existing hook or function already provides (`useAutosave`, `useScriptureTexts`, `buildExport`)?
7. **Reversibility.** Does the change need an ADR? A hard to reverse choice (storage, sync model, third party service) does.

## Output

A short report: **Verdict** (approve, approve with changes, rework), **Findings** ordered by severity with file and line, each with the rule it breaks and a concrete fix, and **Questions** for the author. Do not pad. If it is sound, say so in two lines.
