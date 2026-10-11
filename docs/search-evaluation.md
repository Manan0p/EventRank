# Search evaluation — EventRank v1 (eventrank-v1)

Method: each PRD query run through `searchEvents(query)` at the default demo
clock (`DEMO_NOW = 2026-10-10T09:00:00-04:00`), catalog of 96 records.
Top-5 titles recorded 2026-10-10. Ranking weights frozen — no changes made.

## 1. "hands-on AI workshop after 5pm" — 32 hits, top RELEVANT
1. Applied AI Studio: Build a Campus Assistant (Technology, Thu Oct 15 6:00 PM, Free, 85)
2. Code & Cocoa: Intro to Web Accessibility (Clubs, 80)
3. Poetry & Printmaking Evening (Arts & culture, 78)
4. Women in Technology & Allies Networking Night (Career, 76)
5. Creative Coding & Projection Lab (Arts & culture, 75)

## 2. "free creative events this Friday evening" — 1 hit, top RELEVANT
1. Creative Coding & Projection Lab (Arts & culture, Fri Oct 16 6:30 PM, Free, 94)

## 3. "volunteer opportunities this weekend" — 1 hit, top RELEVANT
1. Campus Food Drive Kickoff (Community service, Sat Oct 10 10:00 AM, Free, 74)

## 4. "career events for first-year students" — 96 hits, top RELEVANT
1. Women in Technology & Allies Networking Night (Career, 89)
2. First-Year Late Night Breakfast (Social, 87)
3. Cloud Careers Office Hours (Career, 87)
4. Money Moves for Students (Career, 81)
5. Open Source First Contribution (Technology, 80)

## 5. "something social but not too crowded" — 85 hits, top BORDERLINE (flagged)
1. Salsa Basics on the Quad (Arts & culture, 69)
2. Cloud Careers Office Hours (Career, 69)
3. Resume Studio: Make Your Work Legible (Career, 69)
4. Women in Technology & Allies Networking Night (Career, 68)
5. Pick-Up Soccer Under the Lights (Sports, 68)

FLAG: every token except "social" is a stop/control word, so the query
reduces to a near-unranked "social" match. The top result is social-adjacent
(a social dance) but the ranking carries almost no signal (scores 68–69) and
nothing reflects "not too crowded". Vague natural-language queries of this
shape are the known weak spot; weights frozen, reported only.

## 6. "AI workshop" — 96 hits, top RELEVANT
1. Applied AI Studio: Build a Campus Assistant (Technology, 92)
2. Creative Coding & Projection Lab (Arts & culture, 90)
3. Design for Accessibility Workshop (Academic, 90)
4. Women in Technology & Allies Networking Night (Career, 90)
5. Sleep, Stress & Study Skills Clinic (Wellness, 89)

## 7. "free events this weekend" — 2 hits, top RELEVANT
1. Autumn Makers Market (Social, Sat Oct 10 2:00 PM, Free, 85)
2. Campus Food Drive Kickoff (Community service, Sat Oct 10 10:00 AM, Free, 83)

## 8. "yoga" — 0 hits, NO RESULTS (flagged)
FLAG: "yoga" matches no record. Nearest content is the Wellness family
(Mindful Movement on the Quad, Wellness Walk, Mindful Study Hall). The token
has no alias entry (wellness aliases cover health/mindfulness/stress/sleep,
not yoga), so an exact-term miss returns an empty set rather than the nearest
wellness neighbors. Weights frozen, reported only.

## 9. "hackathon" — 2 hits, top RELEVANT
1. Hack the Weekend: Team Mixer (Competitions, 88)
2. Northbridge Circuit Hack (Competitions, 86)

## 10. "jazz" — 1 hit, top RELEVANT
1. Campus Jazz Under the Stars (Arts & culture, Sat Oct 17 7:00 PM, 91)

## Summary
- Relevant top result: 8 of 10 queries.
- Flagged: #5 "something social but not too crowded" (borderline, weak-signal
  match) and #8 "yoga" (zero results, missing alias coverage).
- No ranking weights changed (frozen per task scope).
