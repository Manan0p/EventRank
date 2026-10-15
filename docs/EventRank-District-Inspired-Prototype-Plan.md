# EventRank — District-Inspired UI and Figma Prototype Implementation Plan

**Status:** Approved direction; ready for execution  
**Product:** EventRank  
**Audience:** Students at one college  
**Primary deliverables:** Responsive Vercel MVP + clickable Figma prototype link  
**Design reference:** District by Zomato, used for product patterns only  
**Scope:** Student-facing experience only; organizer tooling remains future scope

---

## 1. Decisions Confirmed

### Product and experience

- Design for **desktop and mobile equally**.
- Keep the current EventRank website scope:
  - Campus event discovery
  - Search and filters
  - Personalized recommendations
  - Explainable EventRank scores
  - Event details
  - Compare events
  - Save events
  - RSVP/register
  - Calendar export
  - Post-event reviews and reporting
- Do not add a payment checkout, ticket marketplace, or full organizer portal in this phase.
- Build the **student experience only**.
- Keep “List an Event” and organizer dashboards as future scope.
- Make the UI feel like a premium event-discovery product without copying District’s brand, layout, wording, imagery, or assets.

### Submission strategy

Submit both links when the rules allow it:

1. **Figma prototype link:** Shows the intended UX, screen flow, and interaction design in a controlled presentation format.
2. **Vercel deployment link:** Shows the working implementation, real interactions, seeded event data, and technical execution.

They are complementary, not interchangeable.

### Brand decision

Keep EventRank’s own identity rather than adopting a District-like identity.

Recommended direction:

- **Base:** EventRank navy and warm off-white surfaces.
- **Primary accent:** Lime for EventRank score, selected states, and high-confidence actions.
- **Secondary accents:** Electric blue and soft violet for category/context cues.
- **Tone:** Calm, editorial, premium, useful, and student-friendly.
- **Avoid:** Heavy black backgrounds everywhere, copied red/white marketplace conventions, identical card geometry, or entertainment-only visual language.

The product should feel familiar as an event-discovery platform but clearly identifiable as EventRank.

---

## 2. Research Findings from District

The plan is based on a review of District’s public homepage, event discovery/search, event detail page, and event-listing entry point:

- [District homepage](https://www.district.in/)
- [District event detail example](https://www.district.in/events/garba-ni-raat-20-dandiya-night-2026-oct17-2026-buy-tickets)
- [District list-your-event page](https://www.district.in/events/list-your-event)

### Patterns worth adapting

#### A. Location-first context

District establishes location and nearby content early. EventRank should adapt that into a campus context:

> **Northbridge University · Main Campus**

The user should always understand which campus and time context the feed represents.

#### B. For-you discovery

District uses a “For you” entry point alongside category exploration. EventRank should make personalized discovery the default without hiding the complete catalog.

#### C. Editorial content rails

District organizes content into sections such as nearby events, music, comedy, sports, theatre, and themed collections. EventRank should use student-relevant rails:

- Recommended for you
- Happening today
- This week on campus
- Technical and career picks
- Arts and culture
- Wellness and sports
- Free events
- New from student organizations

#### D. Image-led cards with practical metadata

District cards combine a strong visual with venue, date, time, and context. EventRank should preserve that scanability and add:

- EventRank score
- Match reason
- Save action
- Registration/capacity state

#### E. Detail page hierarchy

District’s detail page makes the event promise, schedule, venue, organizer, rules, price, and booking action easy to find. EventRank should use the same hierarchy for campus decisions, while replacing commerce-heavy ticketing with RSVP/register actions.

#### F. Persistent conversion action

District keeps booking close to the user. EventRank should use a sticky RSVP/save action on mobile and a sticky decision panel on desktop.

### Patterns we will not copy

- District’s logo, colors, typography, illustrations, images, icons, or copy.
- Exact page composition or card styling.
- Restaurant/movie/sports marketplace categories that do not fit the campus product.
- Ticket purchase and payment flows outside the approved EventRank scope.
- Distance/venue-first ranking that conflicts with student relevance.

---

## 3. Vercel Deployment vs Figma Prototype

These deliverables answer different questions.

### Vercel deployment

**Question it answers:** “Did the team build a working product?”

A Vercel URL is a live website. Judges can:

- Search events.
- Apply filters.
- Open event details.
- Inspect EventRank explanations.
- Save events.
- Compare events.
- RSVP/register in demo mode.
- Test responsive behavior in a browser.

It demonstrates implementation and technical execution. It may have loading states, environment limitations, authentication setup requirements, or prototype shortcuts.

### Figma prototype

**Question it answers:** “What is the intended end-to-end experience?”

A Figma prototype is a controlled, clickable design flow. Judges can:

- Follow the ideal journey without setup friction.
- See screens that may not yet be fully implemented.
- Review mobile and desktop layouts side by side.
- Understand navigation, hierarchy, and interaction intent.
- See the product before database/auth/network constraints are considered.

It demonstrates product thinking and UX quality. It is not a substitute for a working application.

### Recommended submission format

Use this hierarchy in the submission form or final slide:

```text
Primary prototype: [Figma prototype link]
Working MVP:      [Vercel deployment link]
Source code:      [GitHub repository link, if accepted]
Demo video:       [Optional 60–120 second walkthrough]
```

If the event asks for only one link:

- Use the **Figma link** when the rules explicitly say “prototype link” or emphasize design/prototyping.
- Use the **Vercel link** when the rules ask for a working website, deployed product, or live demo.
- If there is a description field, include both and label them clearly.

### Figma execution prerequisite

A real Figma URL must point to a Figma file owned by the team or shared with the team. The implementation plan assumes:

1. A Figma file is created in the team’s account.
2. Frames and components are built according to this plan.
3. Prototype connections are added for the main demo path.
4. Sharing is set to “Anyone with the link can view” or the event’s required setting.
5. The link is tested in an incognito browser before submission.

The codebase and Figma file should share the same product language and screen names, but they do not need to be technically linked.

---

## 4. Target Experience

### Positioning

EventRank should feel like:

> **A calm, intelligent campus district — a place to discover what is happening and choose what is worth your time.**

### Core experience principle

Use District’s **discovery energy** but keep EventRank’s **decision clarity**.

That means:

- More visual browsing than the current utility-heavy grid.
- Strong editorial sections and horizontal rails.
- Better event imagery and hierarchy.
- Persistent context: category, time, location, cost, and score.
- A visible explanation of why an event is recommended.

### Primary demo persona

**Maya, a second-year student** who:

- Likes technology, entrepreneurship, and creative events.
- Usually attends events after classes.
- Has limited time and a small budget.
- Wants to discover events beyond the clubs already in her social circle.

### Primary demo journey

```text
Open EventRank
  → confirm Northbridge campus
  → view personalized For You feed
  → search “free hands-on AI workshop this week”
  → browse visually rich results
  → open event detail
  → understand EventRank score and reasons
  → compare against a conflicting event
  → save or RSVP
  → view My RSVPs / calendar export
  → return later to review the event
```

### Secondary journeys

- Browse all events by category.
- Find free events happening this week.
- Find something social after 6 PM.
- Compare a technical event with a career event.
- View previously saved events.
- Review a completed event.

---

## 5. Information Architecture

### Desktop navigation

```text
EventRank logo
For You
Explore
Categories
Saved
My RSVPs
Search
Preferences / profile
```

### Mobile navigation

Use a four- or five-item bottom navigation bar:

```text
For You  |  Explore  |  Saved  |  My RSVPs  |  Profile
```

If the screen becomes crowded, move Profile into a top-right avatar menu and keep four bottom-nav items.

### Route map

| Route | Purpose | Prototype priority |
|---|---|---:|
| `/` | For You personalized home | P0 |
| `/explore` | Complete catalog and search | P0 |
| `/events/[id]` | Event detail and decision panel | P0 |
| `/categories/[slug]` | Category landing/results | P0 |
| `/saved` | Saved events | P0 |
| `/rsvps` | Registered events and upcoming plan | P0 |
| `/compare` | Side-by-side decision view | P0 |
| `/review/[id]` | Post-event review flow | P1 |
| `/preferences` | Interests, availability, format, cost | P0 |
| `/organizer` | Organizer submission/dashboard | Future |

### Content hierarchy for For You

1. Campus/location context.
2. Search field.
3. Hero/editorial feature.
4. Recommended for you rail.
5. Quick category chips.
6. Happening today rail.
7. This week on campus rail.
8. Free events rail.
9. Category-specific rails.
10. Student feedback or “worth knowing” callout.

The page should not force the user through onboarding before they can browse. Preferences improve the feed but are optional.

---

## 6. Screen-by-Screen Design Specification

The Figma file and the code implementation should use the same frame names. Each screen below has a desktop frame and a mobile frame unless noted otherwise.

### 6.1 Welcome and campus context

**Desktop:**

- Brand lockup at top left.
- Campus selector at top right: `Northbridge University`.
- Short value proposition: “Find the moments that move you forward.”
- Three supporting benefits:
  - Discover across campus.
  - Understand why it fits.
  - Choose with confidence.
- Primary action: `Explore events`.
- Secondary action: `Personalize my feed`.

**Mobile:**

- Compact logo and campus selector.
- Single-column hero.
- Large visual event collage or editorial image block.
- Primary CTA above the fold.

**Prototype interaction:**

- `Explore events` → For You.
- `Personalize my feed` → onboarding.
- Campus selector → campus sheet with one active campus and a future-campus placeholder.

### 6.2 Preference onboarding

Use three short steps instead of a long form.

**Step 1 — What are you into?**

- Technology
- Career
- Entrepreneurship
- Arts & culture
- Sports
- Wellness
- Community
- Academic and research

**Step 2 — What fits your routine?**

- Morning
- Afternoon
- Evening
- Weekday
- Weekend
- In person
- Hybrid
- Virtual

**Step 3 — What should we prioritize?**

- Free events
- Beginner-friendly
- Networking
- Learning value
- Social energy
- Quiet/low-key

**Prototype interaction:**

- Multi-select chips.
- Progress indicator.
- Skip option.
- `See my feed` → For You with updated score reasons.

### 6.3 For You home

This is the primary District-inspired screen, but it should retain EventRank’s decision layer.

**Header:**

- Campus context.
- Search field: `Search events, interests, or goals…`.
- Saved and profile access.

**Hero module:**

- A featured event with a strong image/gradient.
- Event title, category, date/time, and location.
- EventRank badge.
- One concise reason: `Strong match for your technology + evening preferences`.
- CTA: `View event`.

**Content rails:**

- `Picked for you`
- `Happening today`
- `This week on campus`
- `Free to attend`
- `Explore by interest`

**Event card anatomy:**

```text
Cover image / editorial visual
Save icon
Category label
Event title
Date + time
Venue/location
EventRank score
Reason chip
Registration/capacity state
```

### 6.4 Explore/search results

**Desktop:**

- Wide search field with query visible.
- Filter sidebar or horizontal filter bar.
- Sort control: Recommended, Soonest, Highest rated, Most reviewed.
- Result count.
- Two-column or three-column visual card grid.
- Optional “list view” for comparison-heavy browsing.

**Mobile:**

- Search field at top.
- Sticky filter button.
- Horizontal filter chips.
- One-column cards or two-column compact cards.
- Bottom compare tray when events are selected.

**Filters:**

- Date: Today, This week, Weekend, Custom.
- Time: Morning, Afternoon, Evening.
- Category.
- Format: In person, Hybrid, Virtual.
- Cost: Free, Paid, Any.
- Audience.
- Capacity/status.

**Empty state:**

Show a useful recovery path:

> “Nothing matches that combination yet. Try removing one filter or explore what is happening this week.”

### 6.5 Category landing

Each category gets a visually distinct but structurally consistent page.

**Example:** Technology

- Category header and short description.
- Featured technology event.
- Upcoming technology events.
- Beginner-friendly picks.
- Related categories: Career, Entrepreneurship, Academic.
- Filter and sort controls.

Category pages should feel editorial, not like a raw database query.

### 6.6 Event detail

This is the most important screen after For You.

**Desktop layout:**

- Large cover image on the left/top.
- Main information column.
- Sticky decision panel on the right.

**Mobile layout:**

- Full-width cover image.
- Event title and metadata.
- Score panel.
- Detail sections.
- Sticky bottom action bar.

**Content order:**

1. Event image and category.
2. Title.
3. Date/time.
4. Venue/location.
5. EventRank panel.
6. Primary action: RSVP/Register.
7. Secondary actions: Save, Compare, Share.
8. About.
9. Schedule/timeline or agenda.
10. Things to know.
11. Organizer.
12. Student reviews.
13. Related events.

**EventRank panel:**

```text
EventRank 92/100
Strong fit for you

✓ Matches your interest in technology
✓ Fits your evening availability
✓ Free and beginner-friendly
✓ Verified campus organizer

Score details
Relevance       29/30
Practical fit   22/25
Trust           18/20
Community        7/10
```

**Sticky action panel:**

- `RSVP / Register`
- `Save`
- `Compare`

Keep the action label honest. Do not call it `Buy tickets` unless the product actually implements ticket commerce.

### 6.7 RSVP/register flow

This remains within the current planned scope.

**Screen/modal:**

- Event title and date/time.
- Registration type: Internal RSVP or External registration.
- Audience/requirements reminder.
- Capacity state.
- Primary action: `Confirm RSVP` or `Continue to registration`.
- Clear note when the destination is external.

**Confirmation:**

- Success state.
- Add to calendar button.
- View My RSVPs button.
- Share/copy event link.

No payment, ticket inventory, coupons, seat maps, refunds, or checkout in this phase.

### 6.8 Compare view

**Desktop:**

- Two- or three-column comparison.
- Fixed row labels.
- Highlight the best fit per row without hiding the alternatives.

**Mobile:**

- Horizontal scroll for event columns.
- Sticky row labels or stacked comparison sections.

**Rows:**

- EventRank.
- Why it fits.
- Date/time.
- Time conflict.
- Location.
- Format.
- Cost.
- Audience.
- Capacity/registration.
- Community rating.

**Decision summary:**

At the bottom, provide a non-authoritative summary:

> “Event A is the stronger fit for your preferences. Event B offers more networking and a later start.”

### 6.9 Saved events

- Upcoming saved events grouped by date.
- Score and reason visible on each card.
- Conflict indicator.
- Register/RSVP shortcut.
- Remove-save action.
- Export `.ics` action.

### 6.10 My RSVPs

- Upcoming registered events.
- Status: Registered, Waitlisted, Canceled, Completed.
- Calendar export.
- Event detail shortcut.
- Review prompt for completed events.

### 6.11 Review flow

- 1–5 rating.
- Structured tags:
  - Useful
  - Welcoming
  - Well organized
  - Worth the time
  - Would recommend
- Optional note.
- Anonymous/verified-attendee explanation.
- Report and moderation notice.

### 6.12 Preferences/profile

- Interests.
- Categories.
- Availability.
- Format.
- Cost preference.
- Personalization toggle.
- Reset recommendations.
- Sign out.

---

## 7. Responsive Layout System

The implementation should not be a desktop page squeezed into a mobile viewport. Build two intentional compositions around the same content model.

### Breakpoints

| Name | Width | Composition |
|---|---:|---|
| Mobile | 360–767px | Single column, bottom navigation, sticky action bar |
| Tablet | 768–1199px | Two-column content where useful, compact nav |
| Desktop | 1200px+ | Editorial rails, multi-column grid, sticky detail panel |

### Desktop rules

- Maximum content width: approximately 1280px.
- Main page gutters: 48–64px.
- Hero uses a wide visual and a supporting context panel.
- Rails show four cards at a time where space permits.
- Event detail uses a two-column content/decision layout.
- Filters can stay visible in a sidebar on Explore.
- Compare tray is fixed near the bottom without hiding content.

### Mobile rules

- Horizontal content rails with snap scrolling.
- Cards prioritize image, title, date/time, score, and save.
- Filters open as a bottom sheet or full-screen sheet.
- Event detail uses a sticky bottom action bar.
- Compare uses horizontal event columns or stacked comparison cards.
- Bottom navigation remains visible except when a modal or keyboard is open.
- Touch targets should be at least 44px.

### Content behavior

- Never truncate event titles so aggressively that the event becomes ambiguous.
- Keep date/time visible before long descriptions.
- Keep EventRank score visible on every card.
- Use line clamping only for summaries, not decision-critical logistics.
- Preserve filter state in the URL on Explore.

---

## 8. Visual Design System

### Brand palette

| Token | Value | Use |
|---|---|---|
| `ink-950` | `#161D2E` | Hero backgrounds, strong headings |
| `ink-900` | `#20283C` | Dark cards and panels |
| `ink-800` | `#151820` | Main text |
| `ink-500` | `#586170` | Secondary text |
| `ink-300` | `#7B8492` | Muted metadata |
| `surface-0` | `#FBFBFC` | App background |
| `surface-1` | `#FFFFFF` | Cards and panels |
| `surface-2` | `#F4F6FB` | Inputs and soft sections |
| `line` | `#E2E6ED` | Borders and dividers |
| `lime` | `#C5ED3C` | EventRank score, active states, primary emphasis |
| `blue` | `#5B7CF0` | Search, links, technology/context cues |
| `violet` | `#8C75DC` | Arts/culture and secondary emphasis |
| `peach` | `#F7D9C9` | Warm editorial accents |

### Identity recommendation

Keep the current navy/lime/blue/violet identity because:

1. It is already present in the working app and deck.
2. Lime naturally communicates a positive score or “good fit.”
3. Navy gives the product a credible, premium base.
4. Blue/violet can distinguish categories without relying on one marketplace color.
5. It avoids the risk of looking like a District clone.

### Typography

- **Display:** Space Grotesk or a similar geometric display face for high-impact headings.
- **Body:** DM Sans or Aptos for readable UI text.
- **Data/score:** Use the display face with tabular-number treatment where possible.
- **Heading style:** Sentence case, confident, compact; avoid excessive all-caps.
- **Kickers:** Small uppercase labels with generous tracking for sections and context.

### Shape and depth

- Card radius: 16–24px for feature modules; 12–16px for compact cards.
- Borders: subtle, not heavy.
- Shadows: soft and low elevation.
- Score badge: rounded pill or ring, not a generic star-rating badge.
- Use image overlays/gradients only to support legibility.

### Imagery

Use synthetic or properly licensed imagery only. For the prototype:

- Use abstract editorial gradients or generated/approved placeholder imagery.
- Create consistent visual families per category.
- Never copy District’s CDN assets, images, logos, or event descriptions.
- Add accessible alt text and an image fallback state.

### Iconography

- Use one consistent outline icon set.
- Keep icons secondary to text labels.
- Use icons for save, search, filter, calendar, compare, share, location, and score explanation.
- Never use color alone to communicate status.

---

## 9. Component Inventory

The code and Figma component names should match as closely as practical.

### Foundations

- `BrandMark`
- `Button / Primary`
- `Button / Secondary`
- `Button / Ghost`
- `IconButton`
- `Badge / Category`
- `Badge / Status`
- `Chip / Filter`
- `Chip / Preference`
- `Divider`
- `Skeleton`
- `Toast`

### Navigation

- `DesktopHeader`
- `MobileHeader`
- `CampusSelector`
- `BottomNavigation`
- `ProfileMenu`
- `Breadcrumbs`

### Discovery

- `SearchBar`
- `SearchSuggestion`
- `HeroEventCard`
- `EventRail`
- `EventCard / Grid`
- `EventCard / Compact`
- `EventCard / List`
- `CategoryChipRow`
- `SectionHeader`
- `FilterBar`
- `FilterSheet`
- `SortMenu`
- `EmptyResults`

### Decision support

- `EventRankBadge`
- `EventRankPanel`
- `ScoreBreakdown`
- `ReasonChip`
- `CompareTray`
- `CompareTable`
- `ConflictWarning`
- `RelatedEvents`

### Actions and account

- `SaveButton`
- `RsvpButton`
- `RegistrationSheet`
- `RegistrationConfirmation`
- `CalendarExportButton`
- `ReviewDialog`
- `ReportDialog`
- `PreferenceWizard`
- `PreferenceEditor`

### Figma variants

Every important component should include variants for:

- Default
- Hover
- Pressed
- Selected
- Disabled
- Loading
- Error where applicable
- Mobile and desktop where layout changes materially

---

## 10. Figma File Structure and Prototype Plan

### Figma pages

Create one organized Figma file with these pages:

1. `00 — Cover & notes`
2. `01 — Foundations`
3. `02 — Components`
4. `03 — Desktop screens`
5. `04 — Mobile screens`
6. `05 — Prototype flow`
7. `06 — Submission assets`

### Frame naming

Use stable names so the team can discuss code and design without ambiguity:

```text
Desktop / For You / Default
Desktop / Explore / Search Results
Desktop / Event Detail / Applied AI Studio
Desktop / Compare / Two Events
Desktop / Saved / Upcoming
Desktop / My RSVPs / Confirmation
Mobile / For You / Default
Mobile / Explore / Filters Open
Mobile / Event Detail / Sticky CTA
Mobile / RSVP / Confirmation
Mobile / Review / Completed Event
```

### Figma prototype connections

Build the minimum judge-friendly flow first:

```text
Welcome
  → Preferences
  → For You
  → Search results
  → Event detail
  → Compare
  → RSVP confirmation
  → My RSVPs
```

Add these secondary connections:

- For You → category page.
- Event detail → Save state.
- Saved → Event detail.
- Completed event → Review.
- Profile → Edit preferences.
- Search empty state → Clear filters.

### Prototype behavior guidelines

- Use Smart Animate only where it clarifies a transition; do not animate every card.
- Use horizontal slide transitions for bottom sheets and filters.
- Use dissolve or instant transitions for search result state changes.
- Use a sticky action bar prototype on mobile detail.
- Use realistic event names from the seeded catalog.
- Keep prototype hotspots large enough for a judge using a trackpad or phone.

### Figma prototype content

The prototype should contain realistic sample content:

- Applied AI Studio: Build a Campus Assistant.
- Women in Technology & Allies Networking Night.
- Global Student Union Night Market.
- Campus Jazz Under the Stars.
- River Cleanup Saturday.

Use the same score examples as the application so the judges see a consistent product:

```text
EventRank 92/100
Matches your interest in technology
Fits your evening availability
Free and beginner-friendly
Verified campus organizer
```

### Figma delivery checklist

- Prototype starts at the Welcome or For You frame.
- Every primary button in the demo path has a destination.
- No dead-end screen in the main journey.
- Desktop and mobile pages are both present.
- Text is readable at presentation zoom.
- File is named `EventRank — Campus Event Discovery`.
- Cover frame contains team name, members, and submission context.
- Share permission works in an incognito browser.
- Prototype link is copied into the final slide, README, and submission form.

---

## 11. Codebase Implementation Plan

The existing codebase already contains the domain catalog, score logic, API routes, and a functional UI. This should be treated as a visual/product refactor, not a greenfield rewrite.

### Phase 0 — Protect current behavior

Before changing the UI:

- Preserve `lib/events.ts` as the single source of truth for event data and scoring.
- Preserve the current API response shapes.
- Preserve demo mode and seeded catalog behavior.
- Preserve save, RSVP, review, report, ICS, and preference endpoints.
- Capture a screenshot and run the current production build.
- Note the existing user-visible flow as a fallback.

### Phase 1 — Establish the new shell

Refactor the current large client component into clear UI boundaries where safe:

```text
components/
  app-shell/
    desktop-header.tsx
    mobile-header.tsx
    bottom-navigation.tsx
    campus-selector.tsx
  discovery/
    hero-event-card.tsx
    event-rail.tsx
    event-card.tsx
    search-bar.tsx
    filter-bar.tsx
  event-detail/
    event-detail-page.tsx
    event-rank-panel.tsx
    sticky-event-actions.tsx
  decision/
    compare-tray.tsx
    compare-dialog.tsx
    conflict-warning.tsx
  account/
    preference-wizard.tsx
    preference-dialog.tsx
    review-dialog.tsx
```

Do not split files solely for the sake of splitting. Extract components when it improves responsive behavior, state ownership, or reuse between Figma-matching screens.

### Phase 2 — Change the For You page

Replace the current flat discovery emphasis with a content hierarchy:

1. Desktop/mobile header.
2. Campus/location context.
3. Search bar.
4. Featured hero event.
5. `Picked for you` rail.
6. Category chips.
7. `Happening today` rail.
8. `This week on campus` rail.
9. `Free to attend` rail.
10. Footer/callout.

Use the existing catalog and ranking functions to populate rails. Do not hard-code independent copies of event data in components.

### Phase 3 — Add visual event imagery

Extend the `Event` shape with a safe optional visual field if needed:

```ts
type Event = {
  // existing fields
  imageUrl?: string;
  imageKey?: string;
  accent?: string;
};
```

Recommended initial strategy:

- Use local/generated category art or CSS gradient placeholders.
- Store an `imageKey` instead of copying external URLs into business logic.
- Add an image fallback so the app remains usable if an image fails.
- Do not block the UI refactor on a media-sourcing pipeline.

### Phase 4 — Build event detail as a dedicated route/view

The existing detail modal is useful for rapid browsing, but the District-inspired experience needs a dedicated detail composition:

- Keep modal quick view as an optional fast-preview interaction.
- Add `/events/[id]` as the canonical shareable detail URL.
- Move the full detail content into the route.
- Keep the action bar sticky on mobile.
- Keep the score panel sticky on desktop.

### Phase 5 — Align navigation and state

Add or stabilize:

- For You.
- Explore.
- Saved.
- My RSVPs.
- Profile/preferences.

Use URL query parameters for Explore search/filter state. Use local state plus API synchronization for demo/production fallback. Avoid making the Figma structure depend on unimplemented organizer routes.

### Phase 6 — Preserve and improve decision features

- Keep EventRank score visible in cards and details.
- Make score explanations more visually prominent.
- Keep comparison as a bottom tray/desktop panel.
- Keep conflict warnings clear but not alarmist.
- Keep registration language as RSVP/register.
- Keep reviews available for completed events.

### Phase 7 — Responsive hardening

Test every P0 screen at:

- 390 × 844 mobile.
- 768 × 1024 tablet.
- 1440 × 900 desktop.

Check:

- Header/nav transitions.
- Horizontal rails.
- Filter sheet.
- Detail sticky action.
- Compare tray.
- Long event titles.
- Empty states.
- Loading states.
- Keyboard navigation.
- Focus trapping inside dialogs.

---

## 12. Data, API, and Interaction Mapping

The visual redesign must not create a disconnected mock experience. Every important prototype action should map to a real or explicitly simulated capability.

| UI action | Existing or planned source | Demo behavior |
|---|---|---|
| Load For You | `eventCatalog` + `searchEvents`/ranking | Seeded local catalog |
| Search | `/api/events` or domain module | Keyword/synonym fallback; semantic seam later |
| Category browse | `/api/metadata/categories` + catalog | Category rails and results |
| Open event | `/api/events/[id]` | Dedicated detail page or modal preview |
| Score explanation | `rankEvent` and `scoreReasons` | Deterministic reasons |
| Save | `/api/events/[id]/save` | Demo store/local fallback; Neon when configured |
| Saved list | `/api/me/saved` | User-scoped saved IDs |
| RSVP/register | `/api/events/[id]/register` | Demo registration or Neon row |
| My RSVPs | registrations persistence | Upcoming status cards |
| Calendar export | `lib/ics.ts` | Download `.ics` |
| Review | `/api/events/[id]/review` | Demo store/Neon review lifecycle |
| Report | `/api/reports` | Moderation report submission |
| Preferences | `/api/me/preferences` | Demo persistence/Neon preferences |

### State rules

- Loading state is visible during initial catalog hydration.
- Error state never hides already loaded local content unnecessarily.
- Save and RSVP actions are optimistic only when the API result can be reconciled.
- Local storage remains a fallback, not the only production state source.
- The prototype uses the same event IDs and names as the app.

### Product honesty rules

- Do not display “verified attendee” unless the eligibility rule is satisfied.
- Do not show “tickets” when the action is only RSVP.
- Do not claim live personalized ML if the current build is using deterministic matching.
- Do not claim measured impact until a real pilot produces evidence.
- Do not imply organizer analytics exist before implementing them.

---

## 13. Implementation Workstreams

### Workstream A — Product and interaction design

**Owner:** Product/design lead  
**Outputs:**

- Final IA.
- Figma foundations and components.
- Desktop and mobile frame set.
- Prototype connections.
- Annotated decision points.
- Submission-ready Figma link.

### Workstream B — Frontend shell and discovery

**Owner:** Frontend lead  
**Outputs:**

- Responsive app shell.
- Desktop header and mobile bottom navigation.
- For You rails.
- Explore/search composition.
- Reusable event cards.
- Image/gradient treatment.

### Workstream C — Event detail and decision support

**Owner:** Product/frontend engineer  
**Outputs:**

- Dedicated event detail view.
- EventRank panel.
- Sticky RSVP/save actions.
- Compare tray/table.
- Conflict warning.
- Related events.

### Workstream D — Data/API integration

**Owner:** Backend/platform lead  
**Outputs:**

- Stable event/list/detail API contract.
- Saved/RSVP/preferences synchronization.
- Neon user upsert before production mutations.
- Review/report behavior.
- Demo fallback behavior.

### Workstream E — QA and submission

**Owner:** QA/demo lead  
**Outputs:**

- Responsive test matrix.
- Browser smoke test.
- Figma incognito-link check.
- Vercel clean-browser check.
- Final presentation links.
- Demo runbook.

---

## 14. Delivery Sequence

### Sprint 1 — Design lock

1. Confirm EventRank visual identity.
2. Create Figma foundations.
3. Create desktop/mobile shell frames.
4. Validate the main click path with the team.
5. Freeze navigation names and event card fields.

**Exit criteria:** No unresolved disagreement about the primary journey or navigation.

### Sprint 2 — Discovery redesign

1. Implement responsive shell.
2. Replace flat grid emphasis with rails.
3. Add hero feature event.
4. Implement category chips/rails.
5. Add image/gradient treatment.
6. Match Figma spacing and typography.

**Exit criteria:** For You and Explore are visually coherent on 390px and 1440px widths.

### Sprint 3 — Detail and decision flow

1. Implement canonical event detail route.
2. Add score panel and reasons.
3. Add sticky RSVP/save actions.
4. Add compare tray and compare view.
5. Add registration confirmation.
6. Add Saved and My RSVPs views.

**Exit criteria:** The primary prototype flow is complete in code.

### Sprint 4 — Figma prototype and alignment

1. Build final mobile frames.
2. Build final desktop frames.
3. Connect primary prototype flow.
4. Add micro-interactions and transitions.
5. Add annotations for EventRank logic.
6. Compare Figma against Vercel screenshots.

**Exit criteria:** Figma and the working site tell the same story and use the same names/content.

### Sprint 5 — Production/demo hardening

1. Test Vercel in a clean browser.
2. Check API fallbacks.
3. Confirm no secrets are committed.
4. Test Figma link in incognito.
5. Capture final screenshots.
6. Update deck and README with both links.

**Exit criteria:** A judge can open either link and understand the product without assistance.

---

## 15. Acceptance Criteria

### Product experience

- A new student can discover events without creating an account.
- The home page makes the campus and current context clear.
- The experience supports both visual browsing and intentional search.
- Event cards show date/time, location, category, score, and a save affordance.
- EventRank reasons are visible before or immediately after opening details.
- A student can compare two events and identify a schedule conflict.
- RSVP/register language matches the actual capability.
- Saved and RSVP views are easy to find.
- A completed event can enter a review flow.

### Responsive behavior

- Desktop has an editorial, multi-section composition.
- Mobile has bottom navigation and a sticky event action bar.
- Filters are easy to use on both form factors.
- No critical action is hidden behind hover-only behavior.
- Dialogs and sheets are keyboard accessible.

### Prototype quality

- Figma includes desktop and mobile frames.
- The primary click path has no dead ends.
- Prototype starts at a logical frame.
- Realistic EventRank content appears throughout.
- The Figma link is viewable without edit access.

### Technical quality

- Existing API contracts remain stable unless intentionally versioned.
- `npm run lint`, non-incremental typecheck, tests, and production build are run after integration.
- Vercel deployment works without relying on local storage alone for production users.
- OAuth and Neon errors have user-safe fallbacks.
- No copied District assets or proprietary content are included.

---

## 16. Testing Plan

### Visual QA

For each P0 screen, verify:

- Correct hierarchy and spacing.
- Consistent typography.
- Correct score badge and reason chips.
- Correct image fallback.
- Correct selected/hover/pressed states.
- No horizontal overflow except intentional rails/compare columns.

### Responsive QA matrix

| Screen | Mobile 390px | Tablet 768px | Desktop 1440px |
|---|---:|---:|---:|
| For You | Required | Required | Required |
| Explore results | Required | Required | Required |
| Event detail | Required | Required | Required |
| RSVP confirmation | Required | Optional | Required |
| Saved | Required | Required | Required |
| Compare | Required | Required | Required |
| Preferences | Required | Optional | Required |

### Interaction QA

- Search submits and updates results.
- Search suggestions or example queries work.
- Filter sheet opens/closes correctly.
- Category selection updates content.
- Save state survives refresh in demo mode.
- RSVP state updates the event and My RSVPs.
- Calendar export downloads a valid `.ics` file.
- Compare selection caps at three events.
- Conflict warning appears for overlapping events.
- Review is blocked before an eligible completed event.
- Report submission returns an understandable success/error state.

### Accessibility QA

- Keyboard navigation works through header, rails, cards, dialogs, and sticky actions.
- Focus is visible.
- Dialog focus is trapped and restored.
- Buttons have accessible names.
- Images have useful alt text or are marked decorative.
- Color contrast meets baseline WCAG expectations.
- Score and status are not communicated by color alone.

### Link QA

#### Figma

- Open link while signed out of Figma.
- Start prototype from the cover/start frame.
- Complete the primary flow without edit access.
- Check desktop and mobile frames.

#### Vercel

- Open in a clean browser.
- Test without OAuth credentials if demo mode is intended.
- Test the primary search query.
- Test event detail, compare, save, RSVP, and review affordances.
- Confirm environment variables do not appear in the UI or logs.

---

## 17. Submission Package

### Required assets

1. **PDF presentation:** 5–6 slides.
2. **Figma prototype link:** Primary design/prototype link where requested.
3. **Vercel deployment link:** Working MVP.
4. **Repository link:** If accepted by the event.
5. **Optional demo video:** 60–120 seconds showing the primary journey.

### Slide/link placement

Add a final footer or QR block to the prototype/execution slide:

```text
Explore the prototype: [Figma URL]
Try the working MVP: [Vercel URL]
```

Use short URLs or QR codes only after testing them from a phone. Keep the full URLs in the submission form and README.

### Suggested submission description

> EventRank is a student-first campus event discovery platform inspired by modern event discovery experiences. It combines personalized browsing, transparent EventRank scores, practical event details, comparison, RSVP, and community reviews so students can decide what is worth their time. The Figma prototype demonstrates the responsive product flow, while the Vercel deployment demonstrates the working MVP.

---

## 18. Future Scope — Explicitly Deferred

These should not be added to the current student-only prototype unless the core flow is complete:

- Organizer “List an Event” dashboard.
- Admin approval queue UI.
- Paid ticket checkout.
- Seat maps and ticket inventory.
- Payment refunds or coupon logic.
- Cross-campus marketplace.
- Live external event ingestion.
- Push/email reminders.
- Social graph and friend attendance.
- Advanced ML learning-to-rank.
- Public organizer analytics.

The next product phase can introduce organizer submission after validating student discovery and RSVP behavior.

---

## 19. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| UI becomes a District clone | Brand/legal/product risk | Use District only for patterns; keep EventRank identity, copy, score, and campus context distinct |
| Visual polish hides weak decision support | Product differentiation is lost | Keep EventRank score/reasons on cards and details |
| Figma and code drift | Judges see contradictory products | Share screen names, sample events, score values, and navigation map |
| Prototype scope expands into ticketing | Delivery risk | Keep RSVP/register only; no payment or seat inventory |
| Mobile is treated as a compressed desktop | Usability risk | Design mobile-specific nav, rails, filters, and sticky actions |
| Images become a sourcing blocker | Timeline risk | Start with local/category gradient art and add media later |
| Figma link requires account access | Submission risk | Test “anyone with link can view” in incognito before submission |
| Neon/OAuth configuration fails during demo | Demo risk | Preserve explicit demo mode and seeded catalog fallback |
| Save state differs between browser and server | Trust risk | Finish API synchronization before calling deployment production-ready |

---

## 20. Recommended Next Execution Step

Start with a **design lock sprint**, not a full code rewrite:

1. Create the Figma file and pages.
2. Build the For You desktop and mobile frames.
3. Build one event card, one hero card, one score panel, and one sticky action bar.
4. Connect the main Figma flow through EventRank’s five demo events.
5. Review the design against the existing application.
6. Then refactor the codebase to match the locked design.

### First implementation slice

The first slice should be considered complete when these exist in both Figma and code:

- Desktop For You.
- Mobile For You.
- Desktop Event Detail.
- Mobile Event Detail.
- EventRank panel.
- Search bar.
- Event card.
- Save button.
- RSVP CTA.
- Working navigation between For You, Explore, Saved, and Event Detail.

This slice gives the team a visible, reviewable product direction before spending time on secondary screens.
