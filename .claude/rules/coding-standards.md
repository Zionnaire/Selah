# Coding standards

## TypeScript

- Strict mode and `noUncheckedIndexedAccess` are on. Do not weaken them. Avoid `any`. A non-null assertion needs a reason that is true at that line, not "it is probably set".
- Narrow with conditions before use. When state can lag behind input, render from values that exist now (`ref && preview.length > 0`), not from a flag set elsewhere.
- Name things for what they are. Functions that return JSX are components in PascalCase. Hooks start with `use`.

## Naming and files

- Backend: PascalCase layer folders, short lowercase file names matching the feature (`Routes/auth.ts`, `Services/auth.ts`).
- Frontend: `features/<name>/` per feature, components in PascalCase files, hooks and repos in camelCase files.
- Comments explain why, not what. Keep them short. No commented out code.

## Copy and content

- No em dashes or double dashes anywhere user can read: UI text, errors, docs, comments. Use commas, colons, full stops. Ranges use an en dash only in formatted references (`Romans 12:1–2`).
- Plain, calm, specific language. Say what happened and what to do. No exclamation marks, no hype, no filler like "seamless" or "powerful".
- Offline and save state must be honest. Never claim "synced" when data is only on the device.

## UI and design

- Use design tokens from `packages/tokens`. Read the semantic variables (`--bg`, `--text`, `--border`), not the raw palette, so dark and Pulpit themes work.
- Icons are `lucide-react` with `aria-hidden` when decorative. Icon only buttons need an `aria-label`.
- Every screen has real empty, loading, error and offline states. Loading uses skeletons, not spinners over blank pages.
- Accessibility: keyboard reachable, visible focus, labels on inputs, contrast at least WCAG AA, honour reduced motion. Use native elements (`dialog`, `select`, `button`) before custom ones.
- Gold is at most one button per screen. The Scripture style (gold edge, reading face) is only for Scripture. AI output uses the blue SELAH style.
- No decorative gradients, glass effects or stock illustration. The one light ray appears only in the logo, the Overview hero and Pulpit Mode.
- Responsive: desktop rail, icon rail on tablet, bottom tab bar on phones. Check 390 pixel width.

## Git

- Small commits with a message that says why. Do not commit `.env`, `node_modules`, `dist`. Do not force push.
