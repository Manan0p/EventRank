/**
 * Demo-mode fallback storage for registrations and reviews.
 *
 * Used only when `getDb()` returns null. In Neon mode the routes write to the
 * `registrations` / `reviews` tables instead. State is process-local, matching
 * the demo guarantees of `InMemoryPersistenceStore`.
 */

export interface StoredRegistration {
  eventId: string;
  status: string;
  createdAt: string;
}

export interface StoredReview {
  eventId: string;
  rating: number;
  title?: string;
  body?: string;
  createdAt: string;
}

export interface StoredReport {
  eventId: string | null;
  reviewId: string | null;
  reason: string;
  details?: string;
  createdAt: string;
}

const demoRegistrations = new Map<string, Map<string, StoredRegistration>>();
const demoReviews = new Map<string, Map<string, StoredReview>>();
const demoReports: StoredReport[] = [];

function userMap(
  store: Map<string, Map<string, StoredRegistration>>,
  userId: string,
): Map<string, StoredRegistration>;
function userMap(
  store: Map<string, Map<string, StoredReview>>,
  userId: string,
): Map<string, StoredReview>;
function userMap<T>(
  store: Map<string, Map<string, T>>,
  userId: string,
): Map<string, T> {
  const key = userId.trim() || "demo-student";
  let entries = store.get(key);
  if (!entries) {
    entries = new Map<string, T>();
    store.set(key, entries);
  }
  return entries;
}

export function findRegistration(userId: string, eventId: string) {
  return userMap(demoRegistrations, userId).get(eventId) ?? null;
}

export function addRegistration(userId: string, eventId: string, status = "registered") {
  const entries = userMap(demoRegistrations, userId);
  const existing = entries.get(eventId);
  if (existing) return { created: false as const, registration: existing };
  const registration: StoredRegistration = {
    eventId,
    status,
    createdAt: new Date().toISOString(),
  };
  entries.set(eventId, registration);
  return { created: true as const, registration };
}

export function findReview(userId: string, eventId: string) {
  return userMap(demoReviews, userId).get(eventId) ?? null;
}

/** All demo reviews for an event across users (for rating recompute). */
export function findReviewsForEvent(eventId: string): StoredReview[] {
  const result: StoredReview[] = [];
  for (const entries of demoReviews.values()) {
    const review = entries.get(eventId);
    if (review) result.push(review);
  }
  return result;
}

export function addReview(
  userId: string,
  eventId: string,
  input: { rating: number; title?: string; body?: string },
) {
  const entries = userMap(demoReviews, userId);
  const existing = entries.get(eventId);
  if (existing) return { created: false as const, review: existing };
  const review: StoredReview = {
    eventId,
    rating: input.rating,
    ...(input.title ? { title: input.title } : {}),
    ...(input.body ? { body: input.body } : {}),
    createdAt: new Date().toISOString(),
  };
  entries.set(eventId, review);
  return { created: true as const, review };
}

export function updateReview(
  userId: string,
  eventId: string,
  input: { rating?: number; title?: string; body?: string },
) {
  const entries = userMap(demoReviews, userId);
  const existing = entries.get(eventId);
  if (!existing) return null;
  const updated: StoredReview = {
    ...existing,
    ...(input.rating !== undefined ? { rating: input.rating } : {}),
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.body !== undefined ? { body: input.body } : {}),
  };
  entries.set(eventId, updated);
  return updated;
}

export function deleteReview(userId: string, eventId: string) {
  return userMap(demoReviews, userId).delete(eventId);
}

/** Test/demo reset hook; not used by route handlers. */
export function resetDemoStore() {
  demoRegistrations.clear();
  demoReviews.clear();
  demoReports.length = 0;
}

/** Append a report to the demo in-memory log; always returns the stored record. */
export function addReport(
  userId: string,
  input: { eventId?: string; reviewId?: string; reason: string; details?: string },
) {
  const report: StoredReport & { reporterUserId: string } = {
    reporterUserId: userId.trim() || "demo-student",
    eventId: input.eventId ?? null,
    reviewId: input.reviewId ?? null,
    reason: input.reason,
    ...(input.details ? { details: input.details } : {}),
    createdAt: new Date().toISOString(),
  };
  demoReports.push(report);
  return report;
}
