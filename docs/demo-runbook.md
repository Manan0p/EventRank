# EventRank demo runbook (3–5 minutes)

Clock: the demo assumes `DEMO_NOW = 2026-10-10T09:00:00-04:00` (Sat morning).
Anchor events below are verified against the seed.

## Script
1. Open the app (`npm run dev` → http://localhost:3000). Land on the feed and
   note the seeded catalog with explainable score reasons.
2. Search "hands-on AI workshop". Expect "Applied AI Studio: Build a Campus
   Assistant" (Technology, Thu Oct 15 6:00–8:30 PM, Free) at the top.
3. Open Applied AI Studio. Read its details and score reasons.
4. Save it, then compare it with the overlapping event: "Women in Technology
   & Allies Networking Night" (Career, Thu Oct 15 6:30–8:30 PM, Free — same
   evening). Expect the conflict banner: "Schedule conflict detected — These
   events overlap. Pick the one that fits your week best."
5. Change preferences (e.g. add interests, set cost to free-only, pick
   formats). Show the feed re-ranking with updated reasons.
6. Open a completed event ("Sunrise 5K for Community Health", Thu Oct 8,
   status completed). Walk through the review path: register-then-review
   eligibility (reviews open after the event ends).
7. Close on architecture: deterministic `searchEvents`/`rankEvent`
   (`eventrank-v1`) over the 96-record seed; Neon + OAuth are the production
   boundary, demo mode is the explicit fallback.

## Manual checklist (mark each pass/fail before demo day)
- [ ] OAuth smoke test in a clean browser profile: with OAuth unconfigured,
  confirm the explicit demo fallback (Maya Chen) renders; no OAuth redirect.
  HUMAN CREDS REQUIRED for the real flow (Google client id/secret).
- [ ] Keyboard-only pass: tab through search → event dialog → save → compare
  → preferences → review; every action reachable and visible. RUNNABLE NOW.
- [ ] Mobile viewport pass (360–390px): feed, dialog, and compare layout hold
  without horizontal scroll. RUNNABLE NOW.
- [ ] Empty state: search "yoga" shows the zero-result state (known gap, see
  docs/search-evaluation.md). RUNNABLE NOW.
- [ ] API-error pass: stop the dev server or drop the network and confirm an
  error state renders instead of a hang. RUNNABLE NOW.

## Credential boundary
- Runnable now (no secrets): dev server, search, save/compare/conflict,
  preferences, review path on seeded data, keyboard/mobile/empty-state/error
  passes.
- Requires human credentials: `DATABASE_URL` (Neon), `GOOGLE_CLIENT_ID` /
  `GOOGLE_CLIENT_SECRET` + `AUTH_SECRET` (real OAuth round-trip),
  production `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL`.
