# EventRank — HackShift Online Round Submission and Prototype Plan

**Problem statement:** PS 3 — EventRank: Discover What’s Worth Attending  
**Required submission:** 5–6 slide PDF  
**Recommended supporting artifact:** Public Vercel deployment as the working MVP/prototype  
**Optional artifact:** Figma prototype link, only if time permits or the submission form explicitly requests one

---

## 1. Direct Answer: Is the Deployment Enough?

### Yes — with one important distinction

The deployed EventRank website can serve as a **working prototype/MVP** for this submission. The wording says:

> “Prototype/wireframes, if available”

That makes a prototype or wireframe optional, and it does not state that a Figma link is mandatory. The only mandatory artifact is:

- PDF format
- 5–6 slides

The Vercel deployment is stronger than a static wireframe for demonstrating:

- Event discovery
- Search and filters
- EventRank score explanations
- Event detail pages
- Compare behavior
- Save behavior
- RSVP/register flow
- Responsive UI
- Technical implementation

### What the deployment is not

It should be described accurately as:

> **A functional prototype/MVP using realistic seeded campus data.**

Do not describe it as a production ticketing platform or a live campus-wide deployment unless live database, authentication, and event ingestion are actually configured.

### Recommended decision

Do **not** block submission on creating a Figma prototype. Prioritize:

1. A polished 5–6 slide PDF.
2. A stable, publicly accessible Vercel deployment.
3. Screenshots of the working product inside the PDF.
4. A short, tested deployment link or QR code on Slide 6.

Create a separate Figma file only if the team has enough time and the event form explicitly asks for a “prototype link,” “Figma link,” or design file.

---

## 2. Submission Artifact Strategy

### Primary artifact — PDF

The PDF is the official submission. It must stand alone because judges may not open external links during initial screening.

The PDF should communicate:

- The selected problem statement.
- The student problem and target users.
- The EventRank solution.
- The key features.
- Innovation and differentiation.
- Technology and implementation approach.
- Impact and scalability.
- Prototype evidence.
- The 24-hour execution plan.

### Supporting artifact — Vercel deployment

The deployment demonstrates that the team built more than a concept. It should be linked from the submission form and referenced on Slide 6.

Recommended label:

> **Working MVP:** `https://[eventrank-vercel-url]`

If a QR code is used, it must point to the deployment and be tested from a phone.

### Optional artifact — Figma

Figma is useful for showing intended UX, but it is not required by the stated guidelines. Do not create a rushed Figma file that contradicts the working deployment.

If created, label it clearly:

> **Clickable design prototype:** `https://figma.com/...`  
> **Working implementation:** `https://[eventrank-vercel-url]`

The two links answer different questions; neither replaces the required PDF.

### Optional artifact — short demo video

If the form permits a video, record a 60–120 second walkthrough of:

1. For You feed.
2. Search for “free hands-on AI workshop this week.”
3. EventRank explanation panel.
4. Compare two events.
5. Save or RSVP.
6. Review path for a completed event.

Do not make the video the only evidence of the prototype.

---

## 3. Final Six-Slide PDF Plan

The current `docs/EventRank-Hackathon-Pitch.pptx` is a good starting point, but it must be exported to PDF and checked against the exact HackShift structure.

### Slide 1 — Team & Idea

**Required content:**

- Team name.
- Team members.
- Problem statement: `PS 3 — EventRank: Discover What’s Worth Attending`.
- One-line solution.

**Recommended final wording:**

> EventRank helps students discover, evaluate, compare, and review campus events using personalized relevance, practical context, transparent scoring, and community feedback.

**Visual:**

- EventRank logo/name.
- Short product promise: `Discover what’s worth attending.`
- One polished product screenshot or hero composition.

### Slide 2 — Problem

**Required content:**

- Students encounter many event announcements.
- Information is fragmented across groups, email, posters, social media, and club channels.
- Promotional descriptions do not reliably explain value, fit, time commitment, or quality.
- Students cannot easily compare events competing for the same time.

**Target users:**

- First-year students exploring campus.
- Busy students prioritizing limited time.
- Students pursuing career, technical, cultural, social, sports, wellness, or academic goals.

**Visual:**

Use a simple “announcement overload → uncertain decision” diagram. Avoid unsupported statistics unless the team has real research evidence.

### Slide 3 — Proposed Solution

**Required content:**

- Centralized all-campus event discovery.
- Personalized feed and natural-language search.
- EventRank score with visible reasons.
- Side-by-side comparison.
- Save, RSVP/register, calendar export, and post-event review.

**User journey:**

```text
Set interests → Discover → Evaluate → Compare → RSVP/save → Attend → Review
```

**Visual:**

Use two or three real application screenshots:

- For You page.
- Event detail/EventRank panel.
- Compare or Saved view.

### Slide 4 — Technology

**Required content:**

- Next.js and React frontend.
- Next.js API route layer.
- Neon Postgres with Drizzle schema.
- OAuth + JWT-ready authentication.
- Deterministic EventRank ranking engine.
- Keyword search with semantic-search/ML extension point.
- Demo fallback using realistic seeded data.

**Architecture:**

```text
Student browser
      ↓
Next.js / React UI
      ↓
API routes + validation + session boundary
      ↓
EventRank search/ranking layer
      ↓
Neon Postgres
      ↘ optional semantic retrieval / ML service
```

**AI/ML honesty:**

State that semantic matching is the planned/optional ML layer and that the current recommendation score remains deterministic and explainable. Do not claim a trained machine-learning model if the deployed demo uses seeded deterministic ranking.

### Slide 5 — Innovation & Impact

**USP:**

- Relevance over popularity.
- Explainable recommendations.
- Community feedback loop.
- Comparison and time-conflict awareness.
- Better discovery for smaller clubs and less-promoted events.

**Expected impact:**

- Less search fatigue for students.
- Faster event decisions.
- More informed participation.
- Better feedback for organizers.

**Scalability:**

```text
One college → Multiple colleges → Campus event intelligence layer
```

The schema already includes college scope, while the catalog and ranking logic are separated from the UI.

**Business/implementation potential:**

- Campus licensing or institution partnerships.
- Organizer event submission and verification.
- Analytics for departments and clubs.
- Calendar and campus-system integrations.

These should be described as future potential, not as features already completed.

### Slide 6 — Prototype & 24-Hour Execution

**Required content:**

- Prototype evidence.
- Implementation plan.
- What the team aims to build in the 24-hour round.

**Recommended layout:**

Left side:

- Three screenshots from the live MVP.
- Short labels: `For You`, `Event detail`, `Compare & RSVP`.

Right side:

```text
00–04  Foundation: schema, auth, app shell
04–10  Discovery: catalog, search, details
10–16  Decision tools: ranking, compare, save, review
16–21  Polish: responsive UI, testing, deployment
21–24  Demo: freeze, rehearse, submit
```

Footer:

```text
Working MVP: [Vercel URL]
Prototype/demo: [optional Figma or demo-video URL]
```

If no Figma file exists, use the Vercel URL as the prototype/demo link and make the screenshots prominent.

---

## 4. What Must Be True Before Submission

### PDF requirements

- Exactly 5 or 6 slides.
- PDF opens correctly on a different device.
- No placeholder team name/member text remains.
- Problem statement is explicitly labeled `PS 3`.
- Screenshots are large enough to understand.
- No external link is required to understand the solution.
- All claims distinguish built features from future scope.

### Vercel requirements

- Deployment is publicly accessible without an account if demo mode is intended.
- Homepage loads successfully.
- A judge can search without credentials.
- At least one seeded event detail URL works.
- Search query produces relevant events.
- Compare interaction works.
- Save/RSVP behavior is clearly labeled as demo/MVP behavior if persistence is not fully production-backed.
- No `.env.local`, OAuth secret, database URL, or private credentials are exposed.
- Mobile and desktop layouts are usable.

### Prototype evidence requirements

At minimum, capture these screenshots from the deployment:

1. For You homepage with rails.
2. Search results for `AI workshop` or `free events this weekend`.
3. Event detail with EventRank score and reasons.
4. Compare view with two events.
5. Saved or RSVP confirmation state.

The PDF only needs three strong screenshots on Slide 6; the rest can support the live demo or video.

---

## 5. Recommended Judge Demo Flow

Target duration: 2–3 minutes if a live demo is requested.

1. Open the For You feed and explain that it aggregates all campus categories.
2. Search for `free hands-on AI workshop this week`.
3. Open `Applied AI Studio: Build a Campus Assistant`.
4. Show the EventRank score and reasons:
   - Interest match.
   - Practical/time fit.
   - Free and beginner-friendly.
   - Verified/complete event information.
5. Add it to compare with another overlapping event.
6. Show the conflict and score/logistics comparison.
7. Save or RSVP.
8. Close with the deterministic ranking + Neon/Postgres architecture.

### Demo fallback

If the Vercel deployment has a problem:

- Use the screenshots embedded in the PDF.
- Use the local prototype only if the event allows it.
- Use a short demo video if available.
- Do not attempt an untested live database/OAuth flow during judging.

---

## 6. Figma Decision Tree

### Do not create Figma if:

- The submission form only requires a PDF.
- The Vercel deployment is stable.
- There is limited time.
- The team cannot guarantee a public Figma link.
- Figma would show a different product than the live app.

### Create Figma if:

- The organizers explicitly ask for a prototype link.
- The judges strongly value wireframes or interaction design.
- The team can create desktop and mobile frames quickly.
- The Figma prototype can reuse the same event content and user journey.

### If Figma is created

Keep it lightweight:

1. For You desktop.
2. For You mobile.
3. Explore/search results.
4. Event detail desktop.
5. Event detail mobile.
6. Compare.
7. RSVP confirmation.
8. Saved/My RSVPs.

Connect only the main flow. Do not spend time designing organizer screens, payments, or advanced administration.

---

## 7. Final Submission Checklist

### Content

- [ ] PS 3 is named exactly.
- [ ] Team name added.
- [ ] Team members added.
- [ ] One-line solution is clear.
- [ ] Target students are named.
- [ ] Existing gap is explained.
- [ ] Key features are visible.
- [ ] Innovation is differentiated from a generic event calendar.
- [ ] Tech stack and architecture are understandable.
- [ ] Impact and scalability are framed honestly.
- [ ] 24-hour plan is included.

### Artifacts

- [ ] PPTX exported to PDF.
- [ ] PDF contains exactly 5–6 slides.
- [ ] PDF opened on another device.
- [ ] Vercel URL tested in an incognito browser.
- [ ] QR code tested from a phone, if used.
- [ ] Optional Figma link tested in incognito, if created.
- [ ] Screenshots match the deployed product.
- [ ] No secret values appear in the PDF, links, or screenshots.

### Recommended link block

```text
Working MVP: https://[vercel-url]
Source code: https://[github-url]
Figma prototype: https://[optional-figma-url]
```

If the form allows only one external link, submit the Vercel deployment and include the screenshots in the PDF. If the form specifically asks for a prototype link, submit the Vercel deployment as the working prototype unless a Figma link is explicitly required.

---

## 8. Final Recommendation

For this HackShift online round, the strongest and fastest submission package is:

1. **A polished 6-slide PDF** as the official submission.
2. **The Vercel EventRank deployment** as the functional prototype/MVP.
3. **Three to five deployment screenshots** embedded in Slide 6.
4. **An optional QR code/link** to the deployment.
5. **No Figma dependency** unless the organizers explicitly request one.

This gives the judges both product clarity and implementation evidence while keeping the team focused on the actual PS 3 requirements instead of spending valuable time building a second, disconnected prototype platform.
