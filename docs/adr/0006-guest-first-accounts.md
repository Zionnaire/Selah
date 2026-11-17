# 0006. Guest first, accounts optional

Status: accepted. Owner approved the sign in designs and confirmed these answers on 2026-11-17.

## Context

SELAH is used at the pulpit and in places with little or no connection. A person must be able to open the app and read, study and write immediately. An account adds backup and the same work on every device (ADR 0005), which is valuable once there is work worth protecting.

## Decision

**The app opens straight to Overview as a guest.** There is no sign in wall, no email request on first launch, and nothing is disabled for guests except features that need a server (the SELAH assistant, sync, backup).

**Continue without an account stays on the sign in screen**, as drawn. It returns the person to where they were.

**The account is offered, never imposed.** The "Back up your work" offer (screen 33) appears only when all of these are true:

- the person has made at least three things worth keeping (sermons, notes or studies),
- they have used SELAH on at least two different days,
- they are not writing, in Pulpit Mode, or in the middle of any flow.

Then it follows these limits: shown at most once a week, at most three times in total, and never again after the person chooses "Not now" the third time. Choosing "Not now" snoozes it. Sign in and Create account are always reachable from the rail's Guest line and Settings, Account, so the offer is never the only way in.

**What guests are told, plainly:** their work is saved on this device only. The rail says "Guest, working on this device", and Settings, Sync explains what an account adds.

## Why

- Trust. A tool for sermon preparation should not feel like it is collecting an email address.
- Reliability. The product promise is that it works without internet, so it cannot require one to start.
- Fit. A person who finds value first is far more likely to create an account, and then has real work to back up.

## Consequences

Everything must work without a server, which the local first design already requires. Sign in and sync are additive and can fail without hurting the core product.

## Amendment 2026-11-17: a front page

A new visitor on the web sees a short front page (`/welcome`) once, with Open SELAH as the main action and Create an account beside it. Nothing is required. After that, and for an installed app or a signed in person, SELAH opens straight to Overview as before. Settings has a link back to the page. It describes only what the app does today and uses real screenshots.

## Amendment 2026-11-17: signing out

Signing out keeps the account's work on the device but hidden: a signed out person sees guest work only, so a shared or borrowed computer never shows it to the next person. The sign out dialog also offers to remove the backed up copy from the device.
