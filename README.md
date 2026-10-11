# EventRank

EventRank is a focused MVP for Northbridge University students who want to discover what is worth attending. It brings synthetic campus events into one searchable catalog and adds practical filters, a deterministic EventRank score, human-readable explanations, saving, comparison, and a lightweight review path.

## Product scope

The 24-hour build prioritizes one college and a polished student journey:

- A catalog of 80–120 realistic, synthetic events spanning technology, career, entrepreneurship, arts and culture, community, wellness, sports, and academic programming.
- Discovery, keyword/natural-language search, category browsing, cost/format/date filters, and recommended sorting.
- Event detail logistics, organizer/status information, score reasons, save, compare, and review affordances.
- Graceful fallbacks: keyword discovery and seeded data remain usable when Neon, OAuth, or semantic retrieval are not configured.

Organizer self-service, live campus integrations, payments, notifications, native apps, multi-college tenancy, and opaque recommendation logic are outside this MVP.

## Architecture

```text
Browser
  -> Next.js App Router + React components
  -> EventRank domain module (lib/events.ts)
  -> seeded synthetic catalog (data/)
  -> optional Next.js server/API and Neon Postgres persistence
  -> optional OAuth/JWT sessions and semantic retrieval
```

The domain module owns catalog lookup, search/filter behavior, deterministic ranking, and score explanations. The UI consumes those functions rather than reimplementing ranking rules. Neon is the intended system of record when persistence is enabled; the demo can run entirely from the seeded catalog.

## Local setup

Prerequisite: a current Node.js LTS release and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The examples and seed records are synthetic; do not add real student credentials or private data to the repository.

### Environment variables

Use blank values or local-only values in `.env.local`; never commit secrets.

| Variable | Purpose | Demo behavior |
| --- | --- | --- |
| `DATABASE_URL` | Neon pooled connection URL | Optional for the seeded browser demo |
| `DIRECT_DATABASE_URL` | Direct Neon URL for migrations/admin tasks | Optional |
| `AUTH_SECRET` | Server-managed session signing secret | Optional in local demo mode; required for real sessions |
| `GOOGLE_CLIENT_ID` | OAuth web client identifier | Optional until OAuth is configured |
| `GOOGLE_CLIENT_SECRET` | OAuth web client secret | Optional until OAuth is configured |
| `COLLEGE_DOMAIN` | Allowed college email domain | Optional; use a fictional demo domain for local testing |
| `ENFORCE_COLLEGE_DOMAIN` | Enable the domain policy (`true`/`false`) | Keep disabled for synthetic demo identities |
| `EMBEDDING_API_KEY` | Optional semantic-search provider key | Leave unset to use keyword fallback |
| `EMBEDDING_MODEL` | Embedding model name | Optional |
| `SEMANTIC_SEARCH_ENABLED` | Feature flag for semantic retrieval | `false` is a safe default |
| `DEMO_NOW` | Fixed ISO timestamp for repeatable demo dates | Optional; useful for rehearsals |
| `NEXT_PUBLIC_APP_URL` | Public app URL used by callbacks/links | Local value is `http://localhost:3000` |

With Neon and OAuth unset, EventRank runs in demo mode: synthetic catalog records render locally, saves/preferences use browser-local persistence where available, and registration/review actions provide simulated UI feedback. No external account or database is required for the browse/search/score/compare rehearsal.

## Quality checks and run commands

The domain tests are intentionally independent of Neon, OAuth, and browser credentials. They cover catalog count/category coverage and required fields, search relevance, hard filter behavior, deterministic bounded scores and explanations, and event lookup (including an unknown ID).

```bash
npm run lint
npm test
npm run build
```

For a targeted Vitest run after dependencies are installed:

```bash
npx vitest run tests/event-domain.test.ts
```

Keep the checks separate when reporting results: a passing unit suite does not replace the manual clean-browser OAuth smoke check or keyboard/mobile smoke check needed before deployment.

## Primary 3–5 minute demo flow

1. Open EventRank and introduce the Northbridge University discovery promise.
2. Search **“AI workshop”** (or **“hands-on AI workshop after 5pm”**) and point out relevant results, filters, EventRank badges, and explanation chips.
3. Open **Applied AI Studio: Build a Campus Assistant** or another synthetic technology event. Show its date/time, location, organizer, cost, score, and “why this ranks high” reasons.
4. Save it, add a second overlapping synthetic event to Compare, and show the schedule conflict plus side-by-side score/logistics.
5. Open Preferences, switch interests toward arts/live music, and show the recommended order change. Finish by showing the completed-event review path.

Close with the architecture: Next.js and React, a focused domain/ranking layer, Neon-ready persistence, OAuth/JWT boundary, keyword fallback, and explainable deterministic scoring.

## 24-hour feature cutline

### Ship in the MVP

- Synthetic catalog coverage and data validation.
- Anonymous discovery, search, filters, event details, and responsive/keyboard-friendly states.
- Deterministic 0–100 ranking with 2–4 data-backed explanation reasons.
- OAuth/JWT boundary, preferences, saves, compare/conflict warning, and eligible review flow when the corresponding service configuration is available.
- Stable demo mode without Neon, OAuth, or embeddings.

### Cut first if time is short

Calendar export, related-event recommendations, advanced facet counts, interaction analytics, and semantic retrieval can be deferred while keyword search remains the fallback. Organizer portals, live integrations, payments, notifications, native apps, and multi-college support remain post-MVP work. Do not cut event details, search/filters, saves/compare, score explanations, catalog quality, or demo stability.
