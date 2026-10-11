# EventRank
## Product Requirements Document and 24-Hour Implementation Plan

**Status:** Draft for approval  
**Prepared:** 10 October 2026  
**Tagline:** Shift your ideas. Build what matters.  
**Product promise:** Discover what is worth attending.  
**Team name:** `[TEAM NAME]`  
**Team members:** `[TO BE ADDED]`

---

## Executive Decision Summary

EventRank is a modern, professional web MVP for students at one college. It brings all campus events into one searchable experience and helps students decide what is worth their time using personal preferences, practical event information, an explainable EventRank score, comparison, and student feedback.

### Agreed project direction

- **Initial market:** One college; designed so the data model can expand later.
- **Event scope:** All campus event categories, including technical, career, academic, cultural, sports, wellness, clubs, competitions, and social events.
- **Build target:** A functional prototype/MVP suitable for a hackathon demo.
- **Data:** Realistic seeded sample data rather than a live campus integration.
- **Frontend:** Next.js and React with a modern professional visual system.
- **Backend:** Prefer a focused Next.js server/API layer for the 24-hour MVP; keep a Python/FastAPI boundary available for ML work if it adds clear value.
- **Database:** Neon Postgres.
- **Authentication:** OAuth identity with JWT-backed server sessions.
- **AI/ML:** Minimal and useful: semantic search or event-to-interest matching, with deterministic ranking and explanations as the source of truth.
- **Submission:** A 5–6 slide PDF presentation, supported by a working prototype.

### Recommendation before coding

Approve the scope and architecture in this document first. The build should prioritize a polished end-to-end student journey over organizer portals, live integrations, payments, notifications, or a complex black-box recommender.

---

# Part I — Product Requirements Document

## 1. Product Vision

EventRank transforms scattered campus announcements into personalized, explainable decisions. It should help a student answer:

> **“Given my interests, time, and goals, which campus event is most worth attending?”**

EventRank is not simply an event calendar. Its differentiator is the decision layer: students can discover, evaluate, compare, save, register for, and review events using consistent information and community feedback.

## 2. Problem Statement

Students receive event announcements through email, social media, posters, club groups, department websites, and messaging platforms. Information is fragmented, inconsistent, promotional, and often missing the details needed to make a decision.

As a result:

- Students miss useful events or discover them too late.
- Popularity and promotional reach matter more than personal relevance.
- Students cannot easily compare events that compete for the same time.
- New or smaller clubs have difficulty reaching students outside their existing network.
- There is little structured feedback about whether an event was useful, welcoming, or well organized.

### Target users

**Primary:** College students who want to discover relevant, valuable, or enjoyable campus events.  
**Secondary:** Student organizations, departments, and campus administrators who need better reach, event quality, and feedback.

## 3. Goals and Non-Goals

### Goals

1. Create one trusted discovery experience for a single college.
2. Cover all major campus event categories in a consistent catalog.
3. Help students find relevant events quickly through search and filters.
4. Show an understandable EventRank score rather than an opaque recommendation.
5. Let students compare competing events and make a confident choice.
6. Close the feedback loop with post-event reviews.
7. Deliver a responsive, accessible, demonstrable MVP within the 24-hour hackathon.

### Non-goals for the MVP

- Multi-college tenancy or live campus-calendar integrations.
- Ticket sales, payments, refunds, or financial settlement.
- A complete event-management CRM or organizer analytics suite.
- Native mobile applications, push notifications, or SMS.
- Fully autonomous AI moderation or event publishing.
- Sensitive-personality inference, facial recognition, or demographic profiling.
- A social network, direct messaging system, or public friend graph.

## 4. Product Principles

1. **Relevance over popularity:** The most popular event is not automatically the best event for every student.
2. **Explainability over hype:** Every recommendation must show real reasons based on stored signals.
3. **Trust over volume:** Verified organizers, complete information, recency, and review quality matter.
4. **Human judgment remains central:** EventRank supports a student’s decision; it does not claim to guarantee event quality.
5. **Privacy by default:** Use only the information needed for authentication and explicit personalization.
6. **Graceful degradation:** Search and discovery must remain useful if semantic retrieval is unavailable.

## 5. Personas

### Curious first-year student

New to campus, interested in meeting people and exploring opportunities, but unfamiliar with where events are advertised. Values welcoming, beginner-friendly, free, and well-explained events.

### Intent-driven student

Has a specific goal such as finding a technical workshop, career fair, volunteer opportunity, or research talk. Needs precise search, filters, and comparison.

### Busy student or commuter

Has limited availability and needs to consider time, duration, location, cost, and conflicts before committing.

### Student organization or department

Wants its event to reach students beyond the organization’s existing audience and needs a consistent way to provide accurate event details.

### Campus administrator

Needs to keep listings accurate, approve or archive events, and respond to reports or moderation issues.

## 6. Core User Journey

1. **Sign in:** The student uses OAuth and receives a secure JWT-backed session.
2. **Set preferences:** The student optionally selects interests, categories, availability, format, and cost preferences.
3. **Discover:** The home feed shows recommended, upcoming, new, and category-based events.
4. **Search:** The student searches with keywords or natural language such as “free AI workshops this Friday evening.”
5. **Evaluate:** The event detail page shows logistics, community feedback, EventRank, and “why this is recommended.”
6. **Compare:** The student compares two or three events, including time conflicts, cost, location, and scores.
7. **Save or register:** The student saves the event or uses an internal RSVP/external registration link.
8. **Attend and review:** After the event, the student can submit structured feedback and an optional comment.

This creates a feedback loop: better event information and reviews improve future decisions without requiring a black-box system.

## 7. MVP Scope and Priorities

| Priority | Capability | MVP expectation |
|---|---|---|
| P0 | Event catalog | 80–120 realistic events covering all campus categories |
| P0 | Discovery | Home feed, category browsing, search, filters, and sorting |
| P0 | Event details | Complete logistics, organizer, status, score, and registration action |
| P0 | Explainable ranking | Score from 0–100 with deterministic component reasons |
| P0 | Authentication | OAuth sign-in with JWT-backed server session |
| P0 | Personalization | Interests and basic availability preferences |
| P0 | Save/register | Save events and support internal RSVP or external registration |
| P0 | Compare | Compare two or three events side by side |
| P0 | Reviews | Post-event rating and optional structured feedback |
| P0 | Quality | Responsive, keyboard-friendly, and clear loading/error states |
| P1 | Semantic search | Embedding-assisted search with full-text fallback |
| P1 | Conflict warnings | Identify overlapping saved or registered events |
| P1 | Related events | Show similar or complementary events |
| P1 | Calendar export | Add saved/registered events to a calendar |
| P2 | Organizer portal | Self-service submission and analytics |
| P2 | Notifications | Email, push, or SMS reminders |
| P2 | Live integrations | Campus calendar and ticketing integrations |
| P2 | Multi-campus support | Cross-college discovery |

## 8. Functional Requirements and Acceptance Criteria

### Student experience — P0

1. **Authentication:** A student can sign in through the selected OAuth provider. A local user record is created or retrieved, and protected API requests use a verified JWT-backed session.
2. **Preferences:** A student can choose interests, preferred categories, optional availability, formats, and cost preferences. Onboarding can be skipped and edited later.
3. **Event catalog:** Events have a title, summary, description, category, tags, date/time, location, organizer, audience, cost, registration status, accessibility information, and source link where applicable.
4. **Search and filters:** Students can search by title, description, organizer, category, and tags. Filters include date, time, cost, location, category, audience, format, and availability.
5. **Event details:** The detail page shows all decision-critical logistics, EventRank, score reasons, community feedback, save action, and RSVP/external registration action.
6. **Explainable score:** Each event displays a 0–100 score and two to four human-readable reasons that correspond to actual data signals.
7. **Save and RSVP:** A signed-in student can save/unsave an event. The product supports internal RSVP for seeded events or clearly routes to an organizer-provided external registration page.
8. **Compare:** Students can compare two or three events side by side on time, location, category, cost, audience, availability, score, and score reasons.
9. **Reviews:** A student who registered or is otherwise eligible can submit one review after the event end time, including a 1–5 rating, optional text, and optional structured tags.
10. **Event states:** Published, canceled, full, completed, and archived states are visible. Canceled and archived events are excluded from the default upcoming feed.
11. **Reports:** Students can report inaccurate or inappropriate events/reviews. The report is visible to an administrator or moderator.

### Administration and quality — P1/P2

- Administrators can create, edit, approve, reject, cancel, archive, and flag events.
- Verified organizers may eventually manage their own events, subject to approval.
- The product records non-sensitive actions such as searches, views, saves, compare actions, registrations, reviews, and reports.
- The product works on desktop and mobile browsers with keyboard navigation, readable contrast, labels, loading states, empty states, and errors.

## 9. Screen Requirements

### Landing and sign-in

- Value proposition and tagline.
- Supported categories and example searches.
- OAuth sign-in control.
- College branding placeholder.

### Discover home

- Global search field with natural-language example.
- Category chips and quick filters.
- Recommended, upcoming, new, and popular sections.
- Event cards showing title, time, location, category, cost, organizer, EventRank, and explanation chips.
- Saved and registered shortcuts.

### Search results

- URL-persisted query and filters.
- Desktop filter sidebar and mobile filter drawer.
- Sort by recommended, soonest, newest, and most saved.
- Result count, active filter chips, clear filters, and empty-result suggestions.

### Event detail

- Title, category, organizer, verification/status, date/time, duration, location, audience, cost, capacity, accessibility, and last-updated date.
- EventRank score ring or badge.
- Expandable “Why this score?” panel.
- Save, RSVP/external registration, add-to-calendar if available, share/copy link, and report actions.
- Related events.

### Compare

- Two- or three-column comparison.
- Consistent rows for logistics, EventRank, score components, and registration status.
- Conflict warning for overlapping times.

### Saved and review views

- Saved, registered, and past tabs.
- Canceled/full/completed status updates.
- Review prompt after an event ends.
- Review rating, structured tags, optional comment, report, edit, and delete behavior.

## 10. EventRank and Recommendation Design

### What the score means

EventRank estimates how useful an event may be for a particular student at a particular time. It is not a guarantee, a popularity contest, or a replacement for the student’s own judgment.

The interface should keep three signals distinct:

- **EventRank:** Personalized or general recommendation fit.
- **Review rating:** Feedback from attendees.
- **Organizer verification:** Whether the event source is approved.

### Initial deterministic formula

| Component | Weight | Example signals |
|---|---:|---|
| Personal relevance | 30% | Interests, category preferences, search similarity |
| Practical fit | 25% | Availability, date/time, location, cost, audience, capacity |
| Trust and completeness | 20% | Verified organizer, complete logistics, recent confirmation |
| Freshness | 10% | Recently added or updated, appropriate distance from event date |
| Community signal | 10% | Saves, registrations, normalized review quality, capped popularity |
| Discovery/diversity | 5% | Avoiding repetitive categories or organizations |

Weights are configuration, not hard-coded UI logic. The score should return a `rank_version` so the team can calibrate behavior without hiding changes.

### Score explanation examples

- “Matches your interest in technology.”
- “Fits your Thursday evening availability.”
- “Free and beginner-friendly.”
- “Hosted by a verified campus organization.”
- “Recently added and actively updated.”
- “Highly relevant to your search for hands-on workshops.”

Explanations must be generated from real stored signals. Do not ask an LLM to invent reasons.

### AI/ML boundary

Use AI/ML for one focused job: semantic matching between student queries/preferences and event content.

- Generate event embeddings from title, summary, description, category, tags, audience, and organizer.
- Generate a query embedding for natural-language search.
- Combine semantic retrieval with Postgres full-text search and structured filters.
- Keep the final score deterministic and explainable.
- Keep keyword/full-text search as a fallback when an embedding service is unavailable.
- Do not infer sensitive characteristics or use an opaque AI score.
- Optional future features such as review summarization or tag suggestions remain outside the P0 cutline.

## 11. Trust, Privacy, and Security Requirements

- OAuth is used for identity; JWTs are used only in secure, server-managed sessions.
- Store only the minimum profile data needed for authentication and explicit personalization.
- Do not use sensitive demographic data in ranking.
- Enforce role-based permissions for students, organizers, moderators, and administrators.
- Scope every read/write operation by authenticated user ID and college ID.
- Validate and sanitize event descriptions and external links.
- Rate-limit review, report, RSVP, and search mutations.
- Allow one review per eligible student per event and open reviews only after the event ends.
- Provide event/review reporting and moderator takedown capability.
- Do not expose OAuth access tokens, cookies, private registrations, or saved-event lists.
- Never log secrets, tokens, or complete provider payloads.

## 12. Core Data Entities

| Entity | Required information |
|---|---|
| College | Name, slug, domain, timezone |
| User | OAuth subject, email, display name, role, college ID, timestamps |
| Preference profile | Interests, categories, availability, format, cost, personalization toggle |
| Organization | Name, type, description, owner/contact, verification status |
| Event | Title, summary, description, categories, tags, organizer, time, location, audience, cost, capacity, registration, accessibility, status, timestamps |
| Saved event | User ID, event ID, created timestamp; unique per user/event |
| RSVP/registration | User ID, event ID, status, source, timestamps |
| Review | User ID, event ID, rating, text, tags, moderation status, timestamps |
| Report | Reporter, target, reason, status, moderator action, timestamps |
| Interaction | Optional non-sensitive event such as view, save, compare, RSVP, registration click, review, report |

## 13. Success Criteria

### Product targets

- At least 80 realistic events across all initial categories.
- At least 90% of published events contain all required core fields.
- A test user can find a suitable event within two minutes.
- At least 75% of test users can explain why a result received its score.
- Recommendations show category diversity rather than only the most popular events.
- The full demo journey works from sign-in through save, compare, and review.

### Technical targets

- Search remains useful with semantic retrieval disabled.
- Warm search responses target a P95 under approximately one second for the seeded catalog.
- No known unauthorized cross-user or cross-college access path.
- Core views are responsive and keyboard-friendly.
- Every displayed score reason maps to an actual stored signal.

## 14. Assumptions and Open Decisions

### Assumptions

- The MVP serves one college in one primary timezone.
- A manually seeded or CSV-imported catalog is acceptable.
- One college-supported OAuth provider is available for the demo.
- Neon Postgres is the system of record.
- The team will prioritize a polished student experience over live integrations.

### Decisions to confirm during approval

1. OAuth provider: Google or Microsoft, based on what is easiest for the team.
2. College identity: fictional demo college or an approved real college brand.
3. Semantic model: lightweight sentence-transformer service or hosted embeddings.
4. Backend shape: Next.js server/API layer for speed, with FastAPI only for ML if needed.
5. Review identity: “Verified attendee” badge with optional display name.

---

# Part II — 24-Hour Implementation Plan

## 15. Recommended Technical Direction

### MVP architecture

Use a focused architecture that can be built, tested, and deployed quickly:

```text
Browser
   ↓
Next.js App Router + React UI
   ↓
Next.js server/API layer
   ↓
Neon Postgres (events, users, preferences, saves, reviews)
   ↓
Full-text search + optional pgvector semantic retrieval
```

### Stack

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS or an existing component system.
- **Server/API:** Next.js Server Components and Route Handlers for the primary MVP path.
- **Database:** Neon Postgres.
- **ORM:** Drizzle ORM with the Neon serverless driver, or Prisma if the team already has a working Prisma setup.
- **Authentication:** Auth.js/NextAuth with Google or Microsoft OAuth and JWT session strategy.
- **Validation:** Zod.
- **Search:** Postgres full-text search first; `pgvector` for embeddings if available.
- **ML option:** A small Python/FastAPI service or offline script using a sentence-transformer embedding model. It should not block the app if unavailable.
- **Testing:** Vitest/Jest, Playwright, and database integration tests where practical.
- **Deployment:** Vercel for Next.js and Neon for Postgres, or equivalent services already available to the team.

### Why this architecture

A separate frontend, Node backend, FastAPI service, and ML deployment would introduce unnecessary integration risk during a 24-hour event. The default plan keeps user-facing behavior in one Next.js application while preserving a clean boundary for Python/ML work. If the team already has FastAPI boilerplate, it can own embeddings and ranking endpoints without changing the product requirements.

## 16. Parallel Workstreams and Subagent Allocation

The implementation should be split into independent workstreams with explicit contracts. This allows multiple agents or team members to work in parallel without editing the same modules.

| Workstream | Responsibility | Primary outputs |
|---|---|---|
| A — Data and database | Neon setup, schema, migrations, seed data, validation | Tables, migrations, 80–120 events, seed scripts |
| B — Student experience | Layout, discovery feed, event cards, filters, details, compare, saved views | Responsive UI and core screens |
| C — Auth, search, and ranking | OAuth/JWT, preferences, full-text search, semantic retrieval boundary, score explanations | Protected APIs and ranking module |
| D — Quality and delivery | Tests, accessibility, deployment, demo data freeze, documentation | CI/checks, deployed URL, runbook, acceptance evidence |

### Coordination rules

- Agree on the database schema and API response shapes before parallel implementation.
- Keep ranking logic in a dedicated module rather than duplicating it in UI components or routes.
- Use feature branches or worktrees for independent implementation when available.
- Merge the smallest complete slices in this order: catalog → auth/preferences → search/ranking → save/compare/review → polish.
- Do not build organizer self-service or live ingestion until the student journey is stable.

## 17. Suggested Repository Layout

```text
eventrank/
├── app/
│   ├── page.tsx
│   ├── discover/page.tsx
│   ├── events/[eventId]/page.tsx
│   ├── saved/page.tsx
│   ├── profile/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/
│       ├── events/
│       ├── me/
│       └── metadata/
├── components/
│   ├── layout/
│   ├── events/
│   ├── search/
│   ├── recommendations/
│   └── profile/
├── lib/
│   ├── auth.ts
│   ├── db/client.ts
│   ├── db/schema.ts
│   ├── db/queries.ts
│   ├── search/query-parser.ts
│   ├── search/retrieval.ts
│   ├── search/ranking.ts
│   ├── validation/
│   └── analytics/
├── scripts/
│   ├── seed.ts
│   ├── validate-seed.ts
│   ├── generate-embeddings.py or .ts
│   └── evaluate-search.ts
├── data/
│   ├── seed-events.json
│   ├── seed-organizations.json
│   └── search-evaluation.json
├── drizzle/migrations/
├── tests/unit/
├── tests/integration/
├── tests/e2e/
└── README.md
```

Keep the ranking and retrieval logic in `lib/search`. Do not embed score calculations directly in React components.

## 18. Database and API Plan

### Database tables

Create the following core tables in Neon Postgres:

- `colleges`
- `users`
- `user_preferences`
- `organizations`
- `events`
- `saved_events`
- `registrations`
- `reviews`
- `reports`
- `event_interactions`

Important constraints and indexes:

- Unique OAuth provider/subject and user email within a college.
- Unique `(user_id, event_id)` for saved events and registrations.
- Index events by `(college_id, status, start_at)`.
- Full-text GIN index for the generated search document.
- Vector index for embeddings if Neon configuration supports it; exact vector scans are acceptable for the small demo catalog.
- Every application query must scope results by `college_id`.

### Initial API surface

| Endpoint | Purpose |
|---|---|
| `GET /api/events` | Search, filter, sort, paginate, and return score reasons |
| `GET /api/events/:id` | Event details, save state, conflicts, related events |
| `POST /api/events/:id/save` | Idempotent save |
| `DELETE /api/events/:id/save` | Remove save |
| `GET /api/me/saved` | Saved and registered events |
| `GET /api/me/preferences` | Read preferences |
| `PUT /api/me/preferences` | Update preferences |
| `POST /api/events/:id/register` | Internal RSVP when supported |
| `POST /api/events/:id/view` | Lightweight interaction tracking |
| `POST /api/events/:id/review` | Submit eligible post-event review |
| `GET /api/metadata/categories` | Categories and filter metadata |
| `GET /api/metadata/organizations` | Organizer metadata |

Use consistent errors: `400` malformed input, `401` unauthenticated, `403` unauthorized, `404` missing event, `422` validation failure, `429` rate limited, and `500` unexpected server error without stack traces.

## 19. Search, Ranking, and ML Implementation

### Retrieval pipeline

1. Parse simple intent deterministically: dates, time phrases, categories, formats, and “free” constraints.
2. Apply hard filters for college, status, date, category, location, format, cost, audience, and availability.
3. Retrieve candidates using Postgres full-text search.
4. Optionally retrieve candidates using vector similarity from event embeddings.
5. Union and de-duplicate the candidate sets.
6. Apply the deterministic EventRank formula.
7. Apply light diversity rules so one category or organization does not dominate.
8. Return results, component scores, `rank_version`, and two to four reason codes.

### ML scope

Recommended first ML feature: semantic search using event embeddings and query embeddings. A lightweight sentence-transformer model can run in Python/FastAPI or an offline enrichment script. If model hosting is not stable, use hosted embeddings or disable semantic retrieval without breaking keyword search.

Do not use an LLM to invent event facts, generate unsupported score explanations, or decide whether content should be published.

### Configuration

Keep ranking weights and reason templates in one configuration module. Add a small evaluation set of approximately ten representative queries, including:

- “hands-on AI workshop after 5pm”
- “free creative events this Friday evening”
- “volunteer opportunities this weekend”
- “career events for first-year students”
- “something social but not too crowded”

Manually inspect the top five results for each query before the demo.

## 20. Authentication and Authorization Flow

1. Student selects “Continue with Google” or the chosen OAuth provider.
2. Auth.js verifies the OAuth callback and state.
3. The application checks the configured verified-email and college-domain policy.
4. The local `users` record is upserted.
5. Auth.js creates a JWT-backed, HttpOnly, Secure, SameSite session cookie.
6. Server Components and Route Handlers read the verified session.
7. Every mutation checks the session, role, user ownership, and college scope.

Never store JWTs in local storage. Do not expose provider access tokens to the browser. Keep the college-domain policy configurable so the team can use a fictional demo college without building an unsafe production bypass.

## 21. Seed Data Plan

Seed a fictional college such as **Northbridge University** with:

- 12–16 organizations.
- 8–10 event categories.
- 80–120 events across 30–45 future days.
- Weekday mornings, afternoons, evenings, and weekends.
- Free and paid events.
- In-person, hybrid, and virtual formats.
- Overlapping events to demonstrate comparison and conflict warnings.
- At least 8–12 polished records for the live demo.

Example events:

- Applied AI Studio: Build a Campus Assistant.
- Design for Accessibility Workshop.
- Women in Technology and Allies Networking Night.
- Campus Jazz Under the Stars.
- Global Student Union Night Market.
- River Cleanup Saturday.
- Mindful Movement on the Quad.
- Founder Fireside: From Idea to Pilot.
- Undergraduate Research Expo.
- Documentary Night: Stories from the City.

The seed script must be idempotent, validate required fields, use deterministic slugs, generate search documents, and optionally generate embeddings. Mark records as synthetic sample data and never include real student credentials or personal data.

## 22. 24-Hour Execution Schedule

| Time | Data/backend | Student experience | Auth/search/ML | Quality/delivery |
|---|---|---|---|---|
| Hours 0–1 | Confirm schema and seed contract | Confirm screen map and visual direction | Confirm auth provider and score formula | Create checklist, environment template, and deploy target |
| Hours 1–4 | Neon, migrations, database client | App shell, navigation, card/detail shells | OAuth/JWT setup, session retrieval, basic full-text query | Lint/typecheck/test commands; early staging deploy |
| Hours 4–8 | Load initial organizations/events | Discover feed, search, filters, event detail | Query parsing, deterministic ranking, score reasons | Smoke tests and first deployed browse flow |
| Hours 8–12 | Complete 80–120-event dataset; saves/preferences tables | Onboarding, save button, saved view | Embeddings, semantic retrieval, hybrid ranking, fallback | Auth/save tests; representative search evaluation |
| Hours 12–16 | Conflicts, related events, interactions | Compare view, conflict warning, responsive/accessibility polish | Calibrate weights and reason templates | Integration tests; fix highest-impact defects |
| Hours 16–19 | Validate seed reset and data integrity | Finish review flow and edge states | Security/ownership checks; timeout fallback | E2E tests, keyboard/mobile checks, latency checks |
| Hours 19–22 | Freeze data and schema | Remove unstable features; final UI polish | Freeze rank version and model config | Production deploy, clean-browser OAuth, demo runbook |
| Hours 22–24 | No structural changes | Rehearse the complete journey | No ranking changes except blockers | Three timed rehearsals, final checks, presentation screenshots |

### If the team falls behind

Cut in this order: calendar export, related events, advanced facet counts, interaction analytics, and complex saved-calendar presentation. Do not cut authentication, event details, search/filters, saves, score explanations, seed-data quality, or deployment stability.

## 23. Testing and Verification Strategy

### Unit checks

- Query parsing for dates, categories, formats, and cost terms.
- Hard-filter application and cancellation/expiry handling.
- Ranking weights, normalization, tie-breaking, and reason generation.
- Preference matching and time-conflict detection.
- Save idempotency and seed-data validation.
- OAuth domain/email verification logic.

### Integration checks

- Migrations apply cleanly to Neon.
- Seed scripts are repeatable.
- Full-text search returns expected records.
- Vector search works when enabled and falls back cleanly when disabled.
- Users cannot access another user’s saved events or preferences.
- All event queries are college-scoped.

### End-to-end checks

1. Anonymous user opens the discover page.
2. User searches and applies filters.
3. User opens an event and reads score reasons.
4. Authenticated user saves the event.
5. Saved event appears in the saved view.
6. User changes preferences and sees recommendation order change.
7. Overlapping saved events show a conflict warning.
8. Eligible user submits a post-event review.

Perform one real OAuth smoke test manually because provider configuration is difficult to fully automate. Also test keyboard navigation, mobile viewports, empty states, API errors, and the clean-browser deployed demo.

## 24. Deployment and Environment Plan

### Deployment assumptions

- Next.js is deployed to Vercel or the team’s existing equivalent.
- Neon provides the production/demo database branch.
- One OAuth web application is configured with the deployed callback URL.
- Embeddings are generated offline or through a configured service.
- Migrations run before the final seed.

### Environment variables

```text
DATABASE_URL=
DIRECT_DATABASE_URL=
AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
COLLEGE_DOMAIN=
ENFORCE_COLLEGE_DOMAIN=
EMBEDDING_API_KEY=
EMBEDDING_MODEL=
SEMANTIC_SEARCH_ENABLED=
DEMO_NOW=
NEXT_PUBLIC_APP_URL=
```

Never commit secrets. Do not log cookies, access tokens, or provider payloads. Keep semantic search behind a feature flag so a provider failure cannot take down discovery.

## 25. Definition of Done

### Product behavior

- Anonymous users can browse current campus events.
- Exact and conceptual search queries produce useful results.
- Filters combine correctly and exclude nonmatching events.
- Event detail pages show complete logistics and registration actions.
- Authenticated users can save/unsave events and update preferences.
- Compare view works for two or three events.
- Each recommendation includes deterministic explanations.
- Eligible users can submit post-event feedback.

### Data and search

- Seed script is idempotent and produces the complete synthetic catalog.
- Events cover all planned categories and formats.
- Full-text search works independently.
- Semantic search works when enabled and degrades gracefully when unavailable.
- Ranking weights and `rank_version` are documented.

### Security and quality

- OAuth callback works with verified accounts.
- Sessions use secure HttpOnly cookies.
- Protected routes enforce authentication and ownership.
- No API secrets are exposed to the client.
- No cross-user or cross-college data access is possible.
- Core flows are responsive and keyboard-friendly.
- No critical console or deployment errors remain.

### Delivery

- A deployed URL is accessible from a clean browser.
- README/setup notes describe environment, migrations, seed, and demo steps.
- Demo data and ranking weights are frozen before rehearsal.
- The team can complete the entire demo in approximately 3–5 minutes.

## 26. Suggested Demo Flow

1. Open EventRank and show the campus-wide discovery promise.
2. Sign in with OAuth and select technology, entrepreneurship, evening, and low-cost preferences.
3. Search for **“hands-on AI workshop after 5pm.”**
4. Point out semantic relevance, filters, and explanation chips.
5. Open an event and show time, location, organizer, cost, registration, score, and “why this is recommended.”
6. Save the event and open another event that overlaps.
7. Compare the two events and show the conflict warning.
8. Change preferences to arts or live music and show the recommendation ordering change.
9. Show the review path for a completed event.
10. Close with the architecture: Next.js, Neon Postgres, OAuth/JWT, hybrid search, and explainable ranking.

## 27. Approval Checklist

Please confirm the following before implementation begins:

- [ ] The one-college, all-campus-event scope is approved.
- [ ] Functional prototype/MVP is the primary build target.
- [ ] Realistic seeded data is acceptable for the demo.
- [ ] Neon Postgres is approved as the database.
- [ ] OAuth with JWT-backed sessions is approved for authentication.
- [ ] The recommended Next.js-first architecture is acceptable, with FastAPI optional for ML.
- [ ] Semantic search/event matching is the first AI/ML feature.
- [ ] Deterministic, explainable scoring is preferred over a black-box recommender.
- [ ] Organizer portal, live integrations, payments, native apps, and notifications are deferred.
- [ ] Team name and member names will be added later.

### First implementation milestone after approval

Create the repository foundation, configure Neon and OAuth environment placeholders, write the initial schema/migrations, and seed the first event catalog before building UI polish. This creates a stable contract for parallel implementation work.
