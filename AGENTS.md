<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
# AGENTS.md — GRC Platform (Next.js web app)

This file gives Claude Code persistent context about THIS project (the web app).
Keep it in the repo root. Do NOT put secrets here.

## Project overview

This is the **Next.js web app** half of the **GRC Platform** (Greek Randonneuring
Community). It shows brevet info, member profiles, and history on the web.

- Deployed at: `grcs-vert.vercel.app`
- Companion **Flutter mobile app** (Greek Brevets Tracker, package
  `com.nikos.greekbrevets`) lives in a SEPARATE repo and has its own CLAUDE.md.
- **Shared backend:** Firebase **Firestore** + **Realtime Database**. The mobile app
  and this web app read/write the same data, so schema and security-rule changes
  affect BOTH apps.

## Auth (important — differs from the mobile app)

- The web app uses **NextAuth** for Google login — **NOT Firebase Auth**.
- Profile flow: `/profile/page.tsx` fetches the user by **email** → reads
  `linkedLegacyMemberId` → fetches the matching doc in the `members` collection.
- Because NextAuth (not Firebase Auth) is used, Firestore rules for `users` and
  `claimed_members` are `if true`. The `members` collection has stricter update rules
  that only permit writes to specific fields.
- DO NOT tighten these rules without checking the mobile app — both apps depend on
  them. The mobile app authenticates with Firebase Auth and uses these same
  collections.

## Shared data model: brevet history

Member history is stored as `history_raw`. Each event has (among others) an `acp`
field (ACP/ΛΕ.ΠΟ.Τ.Ε. homologation number, "" if none) and a `har` field (HAR
number, "" if none). Club separation is driven by these two fields:

- ACP / ΛΕ.ΠΟ.Τ.Ε. events: `acp != ""`
- HAR events: `har != ""`
- An SR (Super Randonneur) = a 200 + 300 + 400 + 600 completed in the same calendar
  year, computed PER CLUB (separately for ACP and HAR).

Brevet primary key format used across the platform:
`{year}_{startCity}_{nominalDistance}_{organizerId}`.

## Conventions / preferences

- **React Hooks rule:** all hooks must run on every render in the same order. Place
  any early-return / gating pattern (e.g. the `usePageEnabled` / "ComingSoon" check)
  AFTER all hooks have been called, just before the component's `return` — never
  before a hook.
- Privacy/GDPR: public-facing member data uses surname initials and opt-in public
  profiles only.

## Current tasks / in progress

1. **Yearly history cards** on the web profile page — group a member's brevets by
   year and render a card per year.

## Do NOT

- Commit secrets here or anywhere tracked.
- Loosen or change Firestore security rules without checking the mobile app, which
  shares the same Firestore/RTDB and the same `members` / `claimed_members` / `users`
  collections.
- Assume Firebase Auth — this app uses NextAuth.