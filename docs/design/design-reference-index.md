# SELAH design reference index

**Design direction:** Quiet Scholarship
**Status:** Batches 1 and 2 produced (brand, all desktop screens, Pulpit Mode, core mobile screens). Batch 4 account, sync and feedback screens are produced (section 6) and awaiting owner review. Every path in this file was checked to exist when the file was written. Screens not yet produced are listed at the end without paths.

The images are rendered from the HTML sources in `source/`, which share `source/selah.css`. They are visual references, not production code. Build real components from the tokens below. Scripture in the mockups is KJV and WEB (public domain); people, churches and dates are sample content.

## 1. Brand assets (`brand/`)

| File | Use |
| --- | --- |
| `brand/selah-brand-identity.png` | Brand identity presentation |
| `brand/selah-colour-typography.png` | Colour and typography presentation |
| `brand/selah-logo-primary-on-navy.svg` | Primary stacked logo with the detailed symbol (Bible open at Ezra 7:10). Splash, about screen, marketing |
| `brand/selah-logo-stacked-on-light.svg` | Stacked logo on light backgrounds |
| `brand/selah-logo-horizontal-on-navy.svg`, `brand/selah-logo-horizontal-on-light.svg` | Horizontal logo |
| `brand/selah-logo-horizontal-mono-navy.svg`, `brand/selah-logo-horizontal-mono-white.svg` | Single-colour logo (print, watermarks, exports) |
| `brand/selah-symbol-gold.svg`, `brand/selah-symbol-navy.svg` | Compact symbol for navigation, favicon, small sizes |
| `brand/selah-symbol-detailed.svg` | Detailed symbol with page lines and the Ezra 7:10 engraving. Only at 160 px and above |
| `brand/selah-symbol-mono-navy.svg`, `brand/selah-symbol-mono-white.svg` | Monochrome symbol |
| `brand/selah-wordmark-navy.svg`, `brand/selah-wordmark-ivory.svg` | Wordmark alone (mobile header) |
| `brand/selah-app-icon.svg`, `brand/selah-app-icon-1024.png` | App icon for Expo (`icon`, adaptive icon foreground on `#08172F`) and PWA manifest |
| `brand/selah-symbol-512.png` | PWA icon, splash symbol |

All logo text is converted to outlines, so files render correctly without fonts installed.

**Ezra 7:10 wording.** The brand sheet uses the KJV (public domain): "For Ezra had prepared his heart to seek the law of the LORD, and to do it, and to teach in Israel statutes and judgments." The wording in the original brief ("set his heart to study the Law of the Lord… statutes and rules") is the ESV, which is copyrighted; don't use it in artwork without Crossway's permission.

## 2. Tokens

| Token | Value | Role |
| --- | --- | --- |
| Primary navy | `#0B1F44` | Sidebar, primary buttons, headings |
| Deep navy | `#08172F` | App icon background, deepest surfaces |
| Secondary navy | `#16335F` | Active navigation item, dark cards |
| Antique gold | `#D4AF37` | Gold on navy, main pulpit action, Scripture edge |
| Dark gold | `#B89428` | Gold accents on light, current-position marker |
| Gold background | `#F5EBC8` | Selected verses |
| Warm ivory | `#F8F7F2` | App background |
| Light surface | `#FDFCF9` | Cards, writing page |
| Secondary surface | `#EFEEE7` | Dividers, chips, quiet surfaces |
| Slate | `#64748B` | Secondary text |
| Charcoal | `#1F2937` | Body text |
| Dark background / surface / elevated | `#101827` / `#172235` / `#273449` | Dark theme and Pulpit Mode |
| Success / Warning / Error / Information | `#15803D` / `#B45309` / `#B91C1C` / `#2563EB` | Status |

**Derived values** (not in the brief, added for accessibility and structure; confirm or replace):

| Token | Value | Why |
| --- | --- | --- |
| Gold text on light | `#8A6D1A` | `#B89428` on ivory is below WCAG AA contrast for text; this darker gold is used for references and labels |
| Verse highlight | `#F8F1DA` | Softer than gold background for long Scripture blocks |
| Border on navy | `#27406B` | Card and button borders on navy |
| Input border | `#DEDCD2` | Form fields and dividers |
| Secondary text | `#374151` | Between charcoal and slate |
| AI surface / border / text | `#EEF3FD` / `#CFDCF7` / `#1D4ED8` | From the information blue family, so SELAH output never looks like Scripture or the user's text |

**Type.** Cormorant Garamond 600 for brand and editorial headings only (page titles, dashboard headline, sermon titles on cards). Inter for all interface text. Literata for Scripture, sermon manuscripts and Pulpit Mode notes. All three are OFL; bundle them so they work offline.

**Shape.** Radius 6 / 8 / 12 px. One soft shadow for sheets. No glassmorphism, no decorative gradients except the single light ray.

## 3. Rules the design depends on

1. **Scripture style** (gold left edge, verse-highlight background, Literata, reference and translation badge) is used only for Scripture.
2. **SELAH style** (blue surface, "SELAH suggests" label, evidence tags) is used for everything the AI produces. Tags: "Textual observation" in gold text, "Interpretation" in violet.
3. **AI suggestions inside a sermon** are pending blocks with Accept, Edit first and Dismiss.
4. **Pulpit cues** are italic: slate surface in the editor, pale gold text in Pulpit Mode.
5. **The light ray** appears only in the logo, the dashboard's next-sermon area and Pulpit Mode.
6. **Offline and sync status** is always visible where work could be lost.
7. **Gold is restrained:** one gold button per screen at most.

## 4. Produced screens

Each entry lists the reference image, then the behaviour the image can't show.

### 4.1 Dashboard (desktop)
`desktop/selah-dashboard-desktop.png` · source `source/01-overview.html`

- **Purpose:** show what to do next. **Entry:** Overview in the sidebar; default after sign-in.
- **Primary action:** Continue writing the next sermon. **Secondary:** Prepare for pulpit, Resume reading, open recent research, quick actions (New sermon, New study, Quick note).
- **Data:** next planned sermon with progress, last reading position, three recent studies, recent sermons with status, offline downloads and pulpit copies.
- **Empty:** no sermons → headline invites the first sermon with "Start from a passage" and "Start from a study". **Loading:** skeleton cards. **Error:** cards fail individually with Retry. **Offline:** everything shown comes from local storage; the sync line reads "Offline: changes saved on this device".
- **Tablet:** two-column cards, sidebar collapses to icons. **Mobile:** see 4.12.
- Includes a Scripture reflection under the headline, the four quick actions from the brief (Read Scripture, Start study, New sermon, Enter Pulpit) and today's SELAH allowance.

### 4.2 Bible Reader (desktop)
`desktop/selah-bible-reader-desktop.png` · source `source/02-bible-reader.html`

- **Purpose:** read Scripture and act on selected verses. **Entry:** Bible in the sidebar, any reference chip.
- **Primary:** read; select verses. **Secondary:** Compare, Note, Copy, Study this, Add to sermon; book, chapter and translation pickers; Parallel view; reading settings.
- **Components:** pickers, chapter navigation, verse text with numbers, floating selection bar, side panel with tabs (Cross-references, My notes, Translations, Ask SELAH).
- **Data:** chapter text by canonical IDs, section headings where the dataset has them, cross-references with source attribution.
- **Empty:** not applicable. **Loading:** text skeleton. **Error:** translation not downloaded and offline → "Download KJV to read offline" with the downloaded translations offered. **Offline:** works for downloaded translations; Ask SELAH tab shows "Needs internet".
- Left column lists books with a chapter grid for the open book. The selection bar offers Compare, Highlight, Bookmark, Study and Add to sermon; notes are in the side panel.

### 4.3 Passage Study (desktop)
`desktop/selah-passage-study-desktop.png` · source `source/03-study-workspace.html`

- **Purpose:** structured research on a passage. **Entry:** Study & Research, "Study this" from the Bible.
- **Primary:** Add to sermon. **Secondary:** Export, guide navigation, Ask SELAH, Save to study.
- **Components:** study guide navigation, research sheet, Scripture block, notes, saved AI findings, assistant thread with suggested questions.
- **AI states:** processing → skeleton inside the blue panel with "Searching Scripture and sources"; unavailable → "SELAH needs internet. Your study and notes still work."; insufficient evidence → answer states it plainly.
- **Offline:** saved study opens; assistant disabled with explanation.

### 4.4 Sermon Studio dashboard (desktop)
`desktop/selah-sermon-studio-dashboard-desktop.png` · source `source/04-sermon-studio-home.html`

- **Primary:** New sermon. **Secondary:** New series, Continue writing, Review, Prepare for pulpit, Enter Pulpit, filters, search by title or passage.
- **Data:** next two planned sermons, library table (title, passage, series, status, last edited, date).
- Recent research, Collections and Templates sit between the preaching-next cards and the library.
- **Empty:** illustration-free empty state with three ways to start.

### 4.5 New sermon (desktop)
`desktop/selah-new-sermon-desktop.png` · source `source/05-new-sermon.html`

- **Primary:** Create sermon. Only a title or passage is required.
- **Behaviour:** passage field parses as you type and previews the text from the local Bible; invalid reference shows an inline error; structure cards only create empty sections.
- Start from: Blank, Passage, Saved study or Outline. Language selector included.

### 4.6 Sermon Editor (desktop)
`desktop/selah-sermon-editor-desktop.png` · source `source/06-sermon-editor.html`

- **Primary:** write. **Secondary:** Review, Prepare for pulpit, Preview, version history, insert toolbar (Scripture, Story, Application, Pulpit cue), outline drag-and-drop.
- **Components:** outline with time budgets, manuscript page, Scripture block, pulpit cue, illustration, pending AI block, right-panel tabs (Bible, Research, Stories, Check, Ask SELAH).
- **States:** autosave indicator ("Saving…", "Saved on this device", "Synced"); conflict banner if another device changed the sermon; AI tab disabled offline.
- **Tablet:** outline in a drawer, one right tab. **Mobile:** see 4.12.

### 4.7 Sermon Review (desktop)
`desktop/selah-sermon-review-desktop.png` · source `source/07-sermon-review.html`

- **Purpose:** checklist before preaching; never a score or certification.
- **Behaviour:** reference and quotation checks run offline; SELAH context checks need internet and are labelled; each finding has Go to and Dismiss.

### 4.8 Prepare for pulpit (desktop)
`desktop/selah-pulpit-prepare-desktop.png` · source `source/08-pulpit-prepare.html`

- **Primary:** Enter Pulpit. **Checks:** offline copy, battery, Do Not Disturb, keep screen awake (on by default, switchable), interpreter invite, optional verse listening, start mode, time and text-size preview.

### 4.9 Pulpit Mode (desktop and tablet)
`desktop/selah-pulpit-mode-desktop.png`, `desktop/selah-pulpit-mode-tablet.png` · source `source/09-pulpit-tablet.html`

- **Purpose:** deliver the sermon. Works fully offline.
- **Controls:** Manuscript, Outline and Scripture modes; large previous and next targets; section progress; find a verse; blank screen; text size; stop listening.
- **Keyboard:** arrows and Page Up/Down navigate, S toggles Scripture, F finds a verse, B blanks the screen. Exit needs a deliberate action.
- Timer shows elapsed and remaining time with a pause control. Themes (dark, warm, light) are chosen on the preparation screen. Line spacing and continuous scroll live in the text-size panel (not drawn).

### 4.10 Pulpit Mode (mobile)
`mobile/selah-pulpit-mode-mobile.png`, `mobile/selah-pulpit-scripture-overlay-mobile.png`, `mobile/selah-pulpit-session-summary-mobile.png`, set: `mobile/selah-pulpit-mode-mobile-set.png`

- Outline mode with tap zones; verse overlay that keeps your place; session summary with time per section and "Mark as preached today".

### 4.11 Mobile Scripture selection
`mobile/selah-bible-selection-mobile.png`

- Selected verses highlighted; bottom sheet with Compare, Note, Study and add-to-Sermon.

### 4.12 Mobile dashboard, sermon editor, offline manager
`mobile/selah-dashboard-mobile.png`, `mobile/selah-sermon-editor-mobile.png`, `mobile/selah-offline-manager-mobile.png`, set: `mobile/selah-mobile-core-set.png` · source `source/11-mobile-app.html`

- Five-tab navigation: Home, Bible, Study, Sermons, Library. Pulpit opens from a sermon.
- The editor shows one section at a time with a section switcher and an insert bar.
- The offline manager lists changes waiting to sync, conflicts, downloaded Bibles and pulpit copies.

### 4.13 Bible translation comparison
`desktop/selah-translation-comparison-desktop.png` · source `source/12-translation-comparison.html`

- Side-by-side or verse-by-verse; "Highlight differences" compares texts without AI; a summary lists where wording differs and links to Theological Perspectives. Only translations licensed for display appear; offline shows downloaded ones only.

### 4.14 Scripture search
`desktop/selah-scripture-search-desktop.png` · source `source/13-scripture-search.html`

- Exact results (deterministic, works offline) are always separate from "Passages about the same idea", which is labelled as suggested by meaning. Typing a reference opens the verse. **Empty:** "No verses contain 'x' in KJV" with options to search other translations. **Offline:** meaning-based suggestions hidden with a note.

### 4.15 Verse details
`desktop/selah-verse-details-desktop.png` · source `source/14-verse-details.html`

- Drawer over the reader: verse, actions (Highlight, Bookmark, Note, add to Sermon), context, key words linking to Word Study, connections, and where the verse appears in the user's own work.

### 4.16 Study & Research home
`desktop/selah-study-home-desktop.png` · source `source/20-study-home.html`

- Research input with approach choice (Passage, Topic, Question, Person), six research tools, continue-research list with progress, library counts. **Empty:** example starting points.

### 4.17 Topic research
`desktop/selah-topic-research-desktop.png` · source `source/15-topic-research.html`

- Shows how a theme develops across Scripture as a vertical timeline of stages with passages, then the user's summary. Assistant suggests connections with evidence tags and related themes.

### 4.18 Word study
`desktop/selah-word-study-desktop.png` · source `source/16-word-study.html`

- Original word, transliteration, parsing for this verse, Strong's number, gloss, range, every occurrence, meaning in this verse, related words. Shows the data source and the rule that a word's full range doesn't apply in every verse. **Licensing:** lexicon data appears only after its licence is confirmed.

### 4.19 Biblical Context Explorer
`desktop/selah-context-explorer-desktop.png` · source `source/17-context-explorer.html`

- Author, date, setting, timeline and people. Every historical claim carries a label: Widely agreed, Scholarly estimate, Debated or Inferred, with sources listed.

### 4.20 Cross-Reference Explorer
`desktop/selah-cross-reference-explorer-desktop.png` · source `source/18-cross-reference-explorer.html`

- Map view with link types (same command, shared theme, same Greek word) and a List view with identical content for accessibility and phones. Selecting a node shows the verse and why it is linked.

### 4.21 Theological Perspectives
`desktop/selah-theological-perspectives-desktop.png` · source `source/19-theological-perspectives.html`

- The question, each major view with supporting passages and the translations that reflect it, where views agree, further reading. Tradition setting changes source order only.

### 4.22 Sermon Outline Builder
`desktop/selah-outline-builder-desktop.png` · source `source/21-outline-builder.html`

- Central idea, then point cards with Explanation, Scripture, Story and Application slots. Every point shows "Rooted in" its phrase of the main passage. Split, merge, move to sub-point. "Write manuscript from outline" converts the user's own notes into headings and paragraphs without generating new text.

### 4.23 Sermon export and Pulpit Edition preview
`desktop/selah-sermon-export-desktop.png` · source `source/22-export-preview.html`

- Formats: Pulpit Edition, Manuscript (PDF or Word), Printable outline, Speaker notes, Plain text. Options for Scripture text, cues, stories and marking accepted AI suggestions. Live preview with translation attribution in the footer. Works offline.

### 4.24 My Library dashboard
`desktop/selah-library-desktop.png` · source `source/23-library-dashboard.html`

- Sections: All items, Sermons, Studies, Notes, Bookmarks, Collections, Resources, Downloads, Recently deleted; tags; universal search; list or grid; bulk actions (Add to collection, Download, Export, Delete).

### 4.25 Sermon library
`desktop/selah-sermon-library-desktop.png` · source `source/24-sermon-library.html`

- Grid view with status filters (All, Drafts, Ready, Delivered, Archived) and series filter.

### 4.26 Study library
`desktop/selah-study-library-desktop.png` · source `source/25-study-library.html`

- Grid of studies by type with offline status.

### 4.27 Notes
`desktop/selah-notes-desktop.png` · source `source/26-notes.html`

- List and reader. Shows what a note is linked to and states that deleting the linked sermon or study keeps the note.

### 4.28 Collections
`desktop/selah-collections-desktop.png` · source `source/27-collections.html`

- Collections grid and a detail panel. Items can belong to several collections; deleting a collection keeps its contents.

### 4.29 Downloads and offline storage
`desktop/selah-downloads-offline-desktop.png` · source `source/28-downloads.html`

- Storage used by category, auto-download settings, each download with size and state (Offline, Downloading, Up to date, Older than latest edit), and removal. Offline storage only where each translation's licence allows.

### 4.30 Settings (AI preferences shown)
`desktop/selah-settings-desktop.png` · source `source/29-settings.html`

- Sections: Profile, Security, Bible preferences, Reading, Appearance, AI preferences, Notifications, Offline storage, Sync, Privacy, About. AI page shows today's allowance, section drafting (off by default), personalisation from the user's own material, tradition for sources, evidence labels (always on) and the no-training statement. Other sections follow the same row pattern.

## 5. Not yet produced

These screens from the brief have no image yet. Their paths will be added when they exist.

**Batch 3: mobile.** Welcome; onboarding (Scripture, Research, Preparation); Bible Reader (unselected); Study workspace; Word Study; Sermon dashboard; Library; Settings.

**Batch 4, remaining.** Empty research; AI processing; AI unavailable; download progress. (Account, sync, notifications and the feedback components are now produced, see section 6.)

## 6. Batch 4: account, sync and feedback (produced, awaiting review)

Generated by `scripts/design/build-batch4.mjs` from shared components, using `source/selah-batch4.css`. Sample people and times are made up. The sync behaviour these screens depend on is decided in `docs/adr/0005-sync-model.md`.

### 6.1 Sign in
`desktop/selah-login-desktop.png` · source `source/30-auth-login.html`

- **Purpose:** return to an account. **Entry:** Settings, Account, or the Guest line in the rail. Never shown on first launch: the app opens straight to Overview as a guest.
- **Primary:** Sign in (navy, not gold). **Secondary:** Continue without an account, which keeps working as a guest. **Links:** Forgot password, Create an account.
- **Behaviour:** the eye button toggles the password. Errors are one sentence under the form, never naming which field was wrong: "Email or password is not correct". After 20 attempts in 15 minutes the form shows "Too many attempts. Try again in a few minutes." and the button disables.
- **States:** loading (button shows a spinner, fields lock), error, offline ("You are offline. Sign in needs internet. Your work is still on this device." with Continue offered), success (goes to Overview, shows a toast).
- **Mobile:** `mobile/selah-auth-mobile-set.png`. The navy panel is dropped, the form fills the screen.

### 6.2 Create account
`desktop/selah-register-desktop.png` · source `source/31-auth-register.html`

- The left panel says plainly what an account adds (backup, every device, the assistant) and promises nothing changes for existing use.
- **Password:** two live rules shown as ticks (at least 10 characters, letters and a number). The rules match the server. No strength meter, no forced symbols.
- **Church or ministry** is optional. Consent is one checkbox covering the Privacy notice and Terms, required to submit.
- **Existing work:** if the device has work, a line says it comes with the account and the guest-to-account flow (6.4) runs after creation.
- **Errors:** an email already in use reads "An account with this email already exists" with a Sign in link.

### 6.3 Password recovery
`desktop/selah-password-recovery-desktop.png` · source `source/32-auth-recovery.html`

- Three steps: ask, check your email, choose a new password.
- **No account enumeration:** the confirmation always reads "If an account exists for this address, a link is on its way". The link lasts 30 minutes and works once.
- **Resend** is disabled for 60 seconds with a visible countdown.
- **Finishing** signs the account out of every other device and says so before the user saves. Work saved on those devices is kept.

### 6.4 Guest to account
`desktop/selah-account-flows-desktop.png` · source `source/33-account-flows.html`

- **Offer:** lists what will be backed up with counts. Says what will not be uploaded (downloaded Bibles and offline data). "Not now" always works.
- **Existing account on a device with work:** asked once. *Add it to your account* is the default and removes nothing. *Keep it on this device only* leaves it unsynced. Neither choice deletes anything on either side.
- **Backing up:** a progress bar with counts. The app stays usable. Closing it pauses the backup and it resumes next time.

### 6.5 Sync settings
`desktop/selah-sync-settings-desktop.png` · source `source/34-sync-settings.html`

- A status card (everything backed up, last synced time, Sync now), the signed in devices with Rename, and Sign out for each other device, what syncs with counts, and preferences (automatic sync, sign out of this device).
- Devices show browser, system and last synced time, never a place. A place would need IP geolocation and a privacy decision. There is no "mobile data" setting because the browser cannot report connection type on Safari or Firefox. Turning automatic sync off means sync only runs on Sync now.
- Settings do not sync in the first release, so they are not listed under "What syncs".
- States of the status card follow section 6.8: synced, syncing, waiting, offline, needs attention, signed out.

### 6.6 Sync conflict resolution
`desktop/selah-sync-conflict-desktop.png` · source `source/35-sync-conflict.html` · mobile in `mobile/selah-sync-mobile-set.png`

- Appears only when the same section was changed on two devices. Sections changed on one device merged automatically and are listed as such.
- **One choice per conflicting section:** keep this device, keep the other device, or keep both, shown as a single radio group. *Keep both* adds the other version as a clearly named copy section after this one. If the sermon is already at the 60 section limit, only the first two choices are offered. For a note, *keep both* creates a second note named for the device. Differences are highlighted by word.
- **Safety:** nothing is lost whichever is chosen, both versions are kept for 30 days. "Decide later" is allowed, the local version stays in use, that sermon waits to sync and everything else continues.
- **Mobile:** one version at a time with a This phone / Other device switch, same three choices.

### 6.7 Notification centre
`desktop/selah-notifications-desktop.png` · source `source/36-notifications.html` · mobile in `mobile/selah-sync-mobile-set.png`

- A bell in the top bar with an unread count. Items needing action come first under "Needs you", the rest under "Earlier".
- **Kinds:** sync conflict (Review, Later), new sign in from another device (That was me, Secure account), download finished, new version ready (Reload), and plain explanations such as a deleted note being restored by an edit on another device.
- Notifications are never marketing. Empty state: "Nothing needs you." The rail shows the same attention state as a dot and a line.

### 6.8 Feedback components
`desktop/selah-feedback-components-desktop.png` · source `source/37-feedback-components.html`

- **Toasts:** success, info, warning, error, and an undo toast ("Moved to Recently deleted", Undo). Bottom right on desktop, above the tab bar on phones. They say what happened and what to do, and stay up long enough to act on (errors until dismissed).
- **Banners:** offline, browser not keeping data, new version, session ended.
- **Dialogs:** confirm delete, sign out with unsynced work, session ended. The destructive action is red, the safe action is the default focus.
- **Sync states in the rail:** Synced, Syncing, Waiting to sync (n changes), Offline, Needs attention, Signed out. The wording never claims synced when work is only on the device.
- Buttons, fields and their states (default, focus, error, disabled, loading). Gold appears at most once per screen.
