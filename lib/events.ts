import { seedEvents, type SeedEvent } from "../data/seed-events";

/** Lifecycle state. Default feed/search exclude `canceled` and `archived`. */
export type EventStatus = "published" | "canceled" | "full" | "completed" | "archived";

/** The UI/API-facing event shape. All dates are ISO strings with an offset. */
export interface Event {
  id: string;
  title: string;
  category: string;
  organizer: string;
  summary: string;
  description: string;
  startAt: string;
  endAt: string;
  dateLabel: string;
  timeLabel: string;
  location: string;
  format: string;
  priceLabel: string;
  audience: string;
  tags: string[];
  score: number;
  rating: number;
  reviewCount: number;
  scoreReasons: string[];
  capacityStatus: string;
  featured: boolean;
  status: EventStatus;
}

export type DateInput = Date | string | number;

export const EVENT_RANK_VERSION = "eventrank-v1";

/**
 * Kept in one place so a later calibration can change ranking without touching
 * React components or route handlers. Values sum to 1.
 */
export const EVENT_RANK_WEIGHTS = Object.freeze({
  relevance: 0.3,
  practicalFit: 0.25,
  trust: 0.2,
  freshness: 0.1,
  community: 0.1,
  discovery: 0.05,
});

export interface EventRankContext {
  query?: string;
  interests?: readonly string[];
  preferences?: readonly string[];
  categories?: readonly string[];
  preferredCategories?: readonly string[];
  preferredFormats?: readonly string[];
  freeOnly?: boolean;
  availableStartHour?: number;
  availableEndHour?: number;
  now?: DateInput;
  /** Optional 0–1 score returned by a future pgvector/FastAPI adapter. */
  semanticScore?: number;
  /** Alias accepted for callers that name the value semantic similarity. */
  semanticSimilarity?: number;
  /** 0–1 penalty supplied by a diversity-aware caller. */
  diversityPenalty?: number;
  /** Categories already shown in a feed; repeated categories receive a small penalty. */
  previousCategories?: readonly string[];
}

export interface EventRankComponents {
  relevance: number;
  practicalFit: number;
  trust: number;
  freshness: number;
  community: number;
  discovery: number;
}

export interface EventRankBreakdown {
  score: number;
  rankVersion: string;
  /** API-friendly alias matching the PRD response naming. */
  rank_version: string;
  components: EventRankComponents;
  reasons: string[];
}

/**
 * Synchronous seam for optional semantic retrieval. Implementations can call a
 * local embedding service or pgvector/FastAPI endpoint before handing the score
 * to `searchEvents`; keyword matching remains the reliable fallback.
 */
export type SemanticScorer = (event: Event, query: string) => number | null | undefined;

export interface SemanticSearchAdapter {
  score(event: Event, query: string): number | null | undefined;
}

export interface EventDateWindow {
  from?: DateInput;
  to?: DateInput;
}

export interface EventSearchFilters {
  category?: string | readonly string[];
  categories?: readonly string[];
  free?: boolean;
  freeOnly?: boolean;
  format?: string | readonly string[];
  formats?: readonly string[];
  dateFrom?: DateInput;
  dateTo?: DateInput;
  from?: DateInput;
  to?: DateInput;
  dateWindow?: EventDateWindow;
  dateRange?: EventDateWindow;
  location?: string;
  audience?: string;
  startHour?: number;
  endHour?: number;
}

export type EventSort =
  | "recommended"
  | "soonest"
  | "latest"
  | "highest-rated"
  | "most-reviewed"
  | "title";

export interface EventSearchOptions extends EventSearchFilters {
  query?: string;
  filters?: EventSearchFilters;
  preferences?: readonly string[];
  interests?: readonly string[];
  preferredCategories?: readonly string[];
  preferredFormats?: readonly string[];
  now?: DateInput;
  upcomingOnly?: boolean;
  featuredOnly?: boolean;
  /**
   * Personalization rank context (client preferences or GET /api/events query
   * params): boost events starting at/after this hour (e.g. 17 for weekday
   * evenings). Ranking-only signal — never a hard filter.
   */
  availableStartHour?: number;
  /** Ranking-only counterpart: boost events starting at/before this hour. */
  availableEndHour?: number;
  sort?: EventSort | string;
  sortBy?: EventSort | string;
  limit?: number;
  offset?: number;
  /** Useful for unit tests and API adapters; defaults to the deterministic catalog. */
  events?: readonly Event[];
  semanticScorer?: SemanticScorer;
  semanticAdapter?: SemanticSearchAdapter;
}

export const DEMO_NOW = "2026-10-10T09:00:00-04:00";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "me",
  "of",
  "on",
  "or",
  "please",
  "the",
  "to",
  "with",
]);

const QUERY_CONTROL_WORDS = new Set([
  "afternoon",
  "after",
  "am",
  "any",
  "at",
  "before",
  "day",
  "days",
  "evening",
  "event",
  "events",
  "free",
  "friday",
  "hybrid",
  "in",
  "monday",
  "morning",
  "night",
  "online",
  "on",
  "pm",
  "saturday",
  "sunday",
  "this",
  "thursday",
  "today",
  "tomorrow",
  "tuesday",
  "virtual",
  "wednesday",
  "week",
  "weekday",
  "weekend",
]);

const TOKEN_ALIASES: Record<string, readonly string[]> = {
  ai: ["artificial", "intelligence", "machine", "learning", "ml"],
  ml: ["machine", "learning", "ai", "artificial", "intelligence"],
  tech: ["technology", "technical", "coding", "software", "engineering"],
  technical: ["technology", "tech", "coding", "software", "engineering"],
  technology: ["tech", "technical", "coding", "software", "engineering"],
  coding: ["code", "programming", "developer", "software", "technology"],
  code: ["coding", "programming", "developer", "software"],
  workshop: ["lab", "studio", "clinic", "training", "primer", "hands-on"],
  lab: ["workshop", "studio", "clinic", "training", "primer"],
  career: ["internship", "resume", "job", "professional", "networking", "work"],
  internship: ["career", "placement", "job", "resume", "professional"],
  creative: ["arts", "art", "culture", "music", "poetry", "design", "film"],
  art: ["arts", "creative", "culture", "music", "poetry", "design", "film"],
  arts: ["art", "creative", "culture", "music", "poetry", "design", "film"],
  cultural: ["culture", "arts", "music", "food", "stories"],
  culture: ["cultural", "arts", "music", "community"],
  volunteer: ["service", "cleanup", "pantry", "community", "sustainability"],
  volunteering: ["service", "cleanup", "pantry", "community"],
  service: ["volunteer", "community", "sustainability", "cleanup"],
  wellness: ["health", "mindfulness", "stress", "sleep", "movement", "recovery"],
  health: ["wellness", "mindfulness", "stress", "sleep", "movement", "recovery"],
  sports: ["sport", "soccer", "climbing", "fitness", "athletics", "ultimate"],
  sport: ["sports", "soccer", "climbing", "fitness", "athletics", "ultimate"],
  competition: ["challenge", "hack", "hackathon", "debate", "showcase", "pitch"],
  competitions: ["challenge", "hack", "hackathon", "debate", "showcase", "pitch"],
  social: ["community", "networking", "café", "cafe", "brunch", "market", "friends"],
  beginner: ["beginner-friendly", "intro", "introduction", "primer", "no experience"],
  beginners: ["beginner", "beginner-friendly", "intro", "introduction", "primer"],
};

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

function parseDate(value: DateInput | undefined): Date | null {
  if (value === undefined || value === null) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateBoundary(value: DateInput | undefined, endOfDay = false): Date | null {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const suffix = endOfDay ? "T23:59:59.999" : "T00:00:00.000";
    return parseDate(`${value}${suffix}`);
  }
  return parseDate(value);
}

function calendarDate(value: DateInput): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const date = parseDate(value) ?? parseDate(DEMO_NOW)!;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftCalendarDate(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function calendarDayOfWeek(value: string): number {
  return new Date(`${value}T12:00:00Z`).getUTCDay();
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeToken(value: unknown): string {
  return normalizeText(value).replace(/\s+/g, "");
}

function tokenize(value: unknown, removeStopWords = false): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token && (!removeStopWords || !STOP_WORDS.has(token)));
}

function stemToken(token: string): string {
  if (token.length > 6 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 5 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith("ed")) return token.slice(0, -2);
  if (token.length > 4 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function tokenVariants(token: string): string[] {
  const normalized = normalizeToken(token);
  const values = new Set<string>([normalized, stemToken(normalized)]);
  for (const alias of TOKEN_ALIASES[normalized] ?? []) {
    const normalizedAlias = normalizeToken(alias);
    values.add(normalizedAlias);
    values.add(stemToken(normalizedAlias));
  }
  return [...values].filter(Boolean);
}

function hasToken(textTokens: Set<string>, variant: string): boolean {
  if (textTokens.has(variant)) return true;
  if (variant.length < 4) return false;
  for (const candidate of textTokens) {
    if (candidate.startsWith(variant) || variant.startsWith(candidate)) return true;
  }
  return false;
}

function hasTerm(text: string, term: string): boolean {
  const tokens = new Set(tokenize(text));
  return tokenVariants(term).some((variant) => hasToken(tokens, variant));
}

function eventSearchFields(event: Event): Array<{ value: string; weight: number }> {
  return [
    { value: event.title, weight: 5 },
    { value: event.tags.join(" "), weight: 4 },
    { value: `${event.category} ${event.summary}`, weight: 3 },
    { value: `${event.organizer} ${event.audience}`, weight: 2 },
    { value: `${event.description} ${event.location} ${event.format} ${event.priceLabel}`, weight: 1 },
  ];
}

function eventSearchText(event: Event): string {
  return eventSearchFields(event).map(({ value }) => value).join(" ");
}

interface TextMatch {
  matchedCount: number;
  tokenCount: number;
  ratio: number;
  weightedRatio: number;
  matchedTokens: string[];
}

function scoreTextMatch(event: Event, phrase: string): TextMatch {
  const tokens = tokenize(phrase, true).filter((token) => token.length > 1);
  if (!tokens.length) {
    return { matchedCount: 0, tokenCount: 0, ratio: 0, weightedRatio: 0, matchedTokens: [] };
  }

  const fields = eventSearchFields(event).map(({ value, weight }) => ({
    tokens: new Set(tokenize(value)),
    weight,
  }));
  let totalWeight = 0;
  let matchedWeight = 0;
  const matchedTokens: string[] = [];

  for (const token of tokens) {
    const variants = tokenVariants(token);
    const bestWeight = fields.reduce((best, field) => {
      return variants.some((variant) => hasToken(field.tokens, variant)) ? Math.max(best, field.weight) : best;
    }, 0);
    totalWeight += 5;
    if (bestWeight) {
      matchedWeight += bestWeight;
      matchedTokens.push(token);
    }
  }

  return {
    matchedCount: matchedTokens.length,
    tokenCount: tokens.length,
    ratio: matchedTokens.length / tokens.length,
    weightedRatio: totalWeight ? matchedWeight / totalWeight : 0,
    matchedTokens,
  };
}

function isQueryControlToken(token: string): boolean {
  if (QUERY_CONTROL_WORDS.has(token)) return true;
  if (/^\d{1,2}$/.test(token)) return true;
  return false;
}

function extractSearchPhrase(query: string): string {
  return tokenize(query)
    .filter((token) => !isQueryControlToken(token))
    .join(" ");
}

function uniqueStrings(values: readonly string[] | undefined): string[] {
  if (!values) return [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const clean = String(value).trim();
    const key = normalizeText(clean);
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(clean);
    }
  }
  return result;
}

function preferenceTerms(context: EventRankContext): string[] {
  return uniqueStrings([
    ...(context.interests ?? []),
    ...(context.preferences ?? []),
    ...(context.categories ?? []),
    ...(context.preferredCategories ?? []),
  ]);
}

function formatMatches(eventFormat: string, requested: string): boolean {
  const eventValue = normalizeText(eventFormat).replace(/\s+/g, "");
  const requestedValue = normalizeText(requested).replace(/\s+/g, "");
  if (!requestedValue || requestedValue === "anyformat") return true;
  const aliases: Record<string, string[]> = {
    inperson: ["inperson", "onsite", "oncampus", "campus"],
    hybrid: ["hybrid", "mixed", "inpersononline"],
    virtual: ["virtual", "online", "remote"],
  };
  const accepted = aliases[requestedValue] ?? [requestedValue];
  return accepted.includes(eventValue);
}

function categoryMatches(eventCategory: string, requested: string): boolean {
  const eventValue = normalizeText(eventCategory);
  const requestedValue = normalizeText(requested);
  if (!requestedValue || requestedValue === "all" || requestedValue === "allevents") return true;
  // Structured category filters are hard constraints. Keep useful prefix/phrase
  // matching (e.g. "arts" -> "arts & culture") without letting semantic
  // aliases such as "social" -> "community" leak into a filtered result.
  return eventValue === requestedValue || eventValue.includes(requestedValue) || requestedValue.includes(eventValue);
}

export function isFreeEvent(event: Pick<Event, "priceLabel">): boolean {
  const price = normalizeText(event.priceLabel);
  return price.includes("free") || price.includes("no cost") || price.includes("no charge") || price.includes("complimentary") || price.includes("$0");
}

function eventHour(value: string): number | null {
  const match = value.match(/T(\d{2}):/);
  if (match) return Number(match[1]);
  const date = parseDate(value);
  return date ? date.getHours() : null;
}

function eventDateRange(event: Pick<Event, "startAt" | "endAt">): { start: Date; end: Date } | null {
  const start = parseDate(event.startAt);
  const end = parseDate(event.endAt);
  if (!start || !end) return null;
  return { start, end };
}

export function isEventPast(event: Pick<Event, "endAt">, now: DateInput = DEMO_NOW): boolean {
  const end = parseDate(event.endAt);
  const reference = parseDate(now);
  return Boolean(end && reference && end.getTime() < reference.getTime());
}

export function isEventUpcoming(event: Pick<Event, "startAt" | "endAt">, now: DateInput = DEMO_NOW): boolean {
  const range = eventDateRange(event);
  const reference = parseDate(now);
  return Boolean(range && reference && range.end.getTime() >= reference.getTime());
}

export function eventsOverlap(
  first: Pick<Event, "startAt" | "endAt">,
  second: Pick<Event, "startAt" | "endAt">,
): boolean {
  const firstRange = eventDateRange(first);
  const secondRange = eventDateRange(second);
  if (!firstRange || !secondRange) return false;
  return firstRange.start < secondRange.end && secondRange.start < firstRange.end;
}

function communityScore(event: Event): number {
  // Review volume is deliberately saturated: popularity cannot overwhelm fit.
  const reviewVolume = clamp(Math.min(Math.max(event.reviewCount, 0), 60) / 60);
  const reviewQuality = clamp(Math.max(event.rating, 0) / 5);
  return clamp(reviewQuality * 0.7 + reviewVolume * 0.3);
}

function freshnessScore(event: Event, now: Date): number {
  const start = parseDate(event.startAt);
  if (!start) return 0.45;
  const daysUntil = (start.getTime() - now.getTime()) / 86_400_000;
  if (daysUntil < -1) return 0.28;
  if (daysUntil < 0) return 0.42;
  if (daysUntil <= 14) return 0.96;
  if (daysUntil <= 30) return 0.88;
  if (daysUntil <= 60) return 0.76;
  return 0.64;
}

function practicalFit(event: Event, context: EventRankContext, now: Date): number {
  let score = 0.68;
  const range = eventDateRange(event);
  if (range && range.end.getTime() < now.getTime()) score -= 0.18;
  if (isFreeEvent(event)) score += context.freeOnly ? 0.2 : 0.06;
  if (context.freeOnly && !isFreeEvent(event)) score -= 0.24;

  const preferredFormats = uniqueStrings(context.preferredFormats);
  if (preferredFormats.length) {
    score += preferredFormats.some((format) => formatMatches(event.format, format)) ? 0.16 : -0.1;
  } else if (normalizeText(event.format).includes("hybrid") || normalizeText(event.format).includes("virtual")) {
    score += 0.03;
  }

  const startHour = eventHour(event.startAt);
  if (startHour !== null && context.availableStartHour !== undefined) {
    score += startHour >= context.availableStartHour ? 0.07 : -0.09;
  }
  if (startHour !== null && context.availableEndHour !== undefined) {
    score += startHour <= context.availableEndHour ? 0.04 : -0.08;
  }

  const capacity = normalizeText(event.capacityStatus);
  if (capacity.includes("full") || capacity.includes("waitlist")) score -= 0.18;
  else if (capacity.includes("open")) score += 0.05;
  return clamp(score);
}

function trustScore(event: Event): number {
  const requiredValues = [
    event.title,
    event.category,
    event.organizer,
    event.summary,
    event.description,
    event.startAt,
    event.endAt,
    event.location,
    event.format,
    event.priceLabel,
    event.audience,
    event.capacityStatus,
  ];
  const completeness = requiredValues.filter((value) => String(value ?? "").trim()).length / requiredValues.length;
  const hasCommunityEvidence = event.reviewCount > 0 && event.rating > 0 ? 0.04 : 0;
  return clamp(completeness * 0.96 + hasCommunityEvidence);
}

function relevanceScore(event: Event, context: EventRankContext): number {
  const query = context.query?.trim() ?? "";
  const terms = preferenceTerms(context);
  const queryMatch = query ? scoreTextMatch(event, extractSearchPhrase(query) || query) : null;
  const interestMatch = terms.length ? scoreTextMatch(event, terms.join(" ")) : null;
  const lexical = queryMatch?.ratio ? queryMatch.ratio * 0.72 + queryMatch.weightedRatio * 0.28 : 0;
  const interests = interestMatch?.ratio ? interestMatch.ratio * 0.65 + interestMatch.weightedRatio * 0.35 : 0;
  const preferenceSignal = terms.length ? interests : 0.66;

  let relevance = query ? lexical : preferenceSignal;
  const semantic = context.semanticScore ?? context.semanticSimilarity;
  if (query && typeof semantic === "number" && Number.isFinite(semantic)) {
    relevance = lexical * 0.65 + clamp(semantic) * 0.35;
  }
  if (query && !lexical && typeof semantic !== "number") relevance = 0.24;
  if (!query && terms.length && !interests) relevance = 0.28;
  return clamp(relevance);
}

function discoveryScore(event: Event, context: EventRankContext): number {
  let score = event.featured ? 0.86 : 0.62;
  const previous = context.previousCategories ?? [];
  if (previous.some((category) => categoryMatches(event.category, category))) score -= 0.1;
  if (typeof context.diversityPenalty === "number") score -= clamp(context.diversityPenalty) * 0.55;
  return clamp(score);
}

function matchingPreference(event: Event, context: EventRankContext): string | undefined {
  const terms = preferenceTerms(context);
  return terms.find((term) => hasTerm(eventSearchText(event), term));
}

function buildScoreReasons(
  event: Event,
  context: EventRankContext,
  components: EventRankComponents,
): string[] {
  const reasons: string[] = [];
  const query = context.query?.trim();
  const queryMatch = query ? scoreTextMatch(event, extractSearchPhrase(query) || query) : null;
  const preference = matchingPreference(event, context);

  if (query && queryMatch && queryMatch.matchedCount > 0) {
    reasons.push(`Matches your search for “${query}”.`);
  } else if (preference) {
    reasons.push(`Matches your interest in ${preference}.`);
  }
  if (context.freeOnly && isFreeEvent(event)) reasons.push("Free for Northbridge students.");
  else if (isFreeEvent(event) && components.practicalFit >= 0.72) reasons.push("Free and easy to try.");
  if (context.preferredFormats?.length && context.preferredFormats.some((format) => formatMatches(event.format, format))) {
    reasons.push(`Available ${event.format.toLowerCase()}.`);
  }
  if (event.rating >= 4.6 && event.reviewCount >= 15) {
    reasons.push(`Highly rated by ${event.reviewCount} students.`);
  }
  if (event.featured) reasons.push("Curated pick for the Northbridge community.");
  if (!isEventPast(event, context.now ?? DEMO_NOW) && components.freshness >= 0.88) {
    reasons.push("Upcoming with details ready to plan around.");
  }
  const capacity = normalizeText(event.capacityStatus);
  if (capacity.includes("open") && !capacity.includes("full")) reasons.push("Open capacity is available.");

  if (reasons.length < 2 && event.organizer) reasons.push(`Hosted by ${event.organizer}.`);
  if (reasons.length < 2) reasons.push("Complete event information for a confident choice.");
  if (reasons.length < 2) reasons.push("Relevant to the Northbridge campus community.");
  return reasons.slice(0, 4);
}

export function rankEvent(event: Event, context: EventRankContext = {}): EventRankBreakdown {
  const now = parseDate(context.now ?? DEMO_NOW) ?? parseDate(DEMO_NOW)!;
  const components: EventRankComponents = {
    relevance: relevanceScore(event, context),
    practicalFit: practicalFit(event, context, now),
    trust: trustScore(event),
    freshness: freshnessScore(event, now),
    community: communityScore(event),
    discovery: discoveryScore(event, context),
  };
  const weighted =
    components.relevance * EVENT_RANK_WEIGHTS.relevance +
    components.practicalFit * EVENT_RANK_WEIGHTS.practicalFit +
    components.trust * EVENT_RANK_WEIGHTS.trust +
    components.freshness * EVENT_RANK_WEIGHTS.freshness +
    components.community * EVENT_RANK_WEIGHTS.community +
    components.discovery * EVENT_RANK_WEIGHTS.discovery;
  const score = Math.round(clamp(weighted) * 100);
  return {
    score,
    rankVersion: EVENT_RANK_VERSION,
    rank_version: EVENT_RANK_VERSION,
    components,
    reasons: buildScoreReasons(event, context, components),
  };
}

/** Return the deterministic 0–100 EventRank score for an event. */
export function calculateEventRank(event: Event, context: EventRankContext = {}): number {
  return rankEvent(event, context).score;
}

export function getScoreReasons(event: Event, context: EventRankContext = {}): string[] {
  return rankEvent(event, context).reasons;
}

/** Compatibility aliases for route handlers and test harnesses that prefer a verb-first name. */
export const explainScore = getScoreReasons;
export const getScoreExplanation = getScoreReasons;

function buildEvent(seed: SeedEvent): Event {
  const event: Event = {
    ...seed,
    tags: [...seed.tags],
    score: 0,
    scoreReasons: [],
    status: seed.status ?? "published",
  };
  const ranked = rankEvent(event);
  return { ...event, score: ranked.score, scoreReasons: ranked.reasons };
}

/** Deterministic synthetic Northbridge University catalog used by the demo. */
export const eventCatalog: Event[] = seedEvents.map(buildEvent);

export function getEventById(id: string | number, events: readonly Event[] = eventCatalog): Event | undefined {
  const key = String(id).trim().toLowerCase();
  return events.find((event) => event.id.toLowerCase() === key);
}

/**
 * Related events for the EventDetail dialog: same category OR at least one
 * shared tag (case-insensitive), excluding the event itself, ranked by
 * `rankEvent` with the caller's context. Pure client-side; capped at `max`.
 */
export function getRelatedEvents(
  event: Pick<Event, "id" | "category" | "tags">,
  events: readonly Event[] = eventCatalog,
  context: EventRankContext = {},
  max = 3,
): Event[] {
  const selfId = String(event.id).toLowerCase();
  const selfCategory = String(event.category ?? "").trim().toLowerCase();
  const selfTags = new Set(
    (event.tags ?? []).map((tag) => String(tag).trim().toLowerCase()).filter(Boolean),
  );
  const candidates = events.filter((candidate) => {
    if (String(candidate.id).toLowerCase() === selfId) return false;
    if (selfCategory && String(candidate.category ?? "").trim().toLowerCase() === selfCategory) {
      return true;
    }
    return (candidate.tags ?? []).some((tag) =>
      selfTags.has(String(tag).trim().toLowerCase()),
    );
  });
  return candidates
    .map((candidate, index) => ({
      event: candidate,
      score: rankEvent(candidate, context).score,
      index,
    }))
    .sort((first, second) => second.score - first.score || first.index - second.index)
    .slice(0, Math.max(0, max))
    .map(({ event: related }) => related);
}

export function getCategories(events: readonly Pick<Event, "category">[] = eventCatalog): string[] {
  const seen = new Set<string>();
  const categories: string[] = [];
  for (const event of events) {
    const category = String(event.category ?? "").trim();
    const key = normalizeText(category);
    if (category && !seen.has(key)) {
      seen.add(key);
      categories.push(category);
    }
  }
  return categories;
}

export function getFormats(events: readonly Pick<Event, "format">[] = eventCatalog): string[] {
  const seen = new Set<string>();
  const formats: string[] = [];
  for (const event of events) {
    const format = String(event.format ?? "").trim();
    const key = normalizeText(format);
    if (format && !seen.has(key)) {
      seen.add(key);
      formats.push(format);
    }
  }
  return formats;
}

/** Apply structured filters without requiring callers to also provide a search query. */
export function filterEvents(
  first: readonly Event[] | EventSearchFilters = eventCatalog,
  second: EventSearchFilters | readonly Event[] = {},
): Event[] {
  const firstIsEvents = Array.isArray(first);
  const secondIsEvents = Array.isArray(second);
  const events = (firstIsEvents ? first : secondIsEvents ? second : eventCatalog) as readonly Event[];
  const filters = (firstIsEvents ? (secondIsEvents ? {} : second) : first) as EventSearchFilters;
  const categoryValues = asStringArray(filters.category ?? filters.categories);
  const formatValues = asStringArray(filters.format ?? filters.formats);
  const freeOnly = filters.free === true || filters.freeOnly === true;

  return events.filter((event) => {
    if (categoryValues.length && !categoryValues.some((category) => categoryMatches(event.category, category))) return false;
    if (freeOnly && !isFreeEvent(event)) return false;
    if (filters.free === false && isFreeEvent(event)) return false;
    if (formatValues.length && !formatValues.some((format) => formatMatches(event.format, format))) return false;
    if (filters.location && !hasTerm(event.location, filters.location)) return false;
    if (filters.audience && !scoreTextMatch(event, filters.audience).matchedCount) return false;
    return true;
  });
}

function asStringArray(value: string | readonly string[] | undefined): string[] {
  if (Array.isArray(value)) return value.map(String);
  return value ? [String(value)] : [];
}

function inferredDateWindow(query: string, now: DateInput): EventDateWindow {
  const normalized = normalizeText(query);
  const today = calendarDate(now);

  if (/\btoday\b/.test(normalized)) return { from: today, to: today };
  if (/\btomorrow\b/.test(normalized)) {
    const tomorrow = shiftCalendarDate(today, 1);
    return { from: tomorrow, to: tomorrow };
  }
  if (/\bthis\s+weekend\b|\bweekend\b/.test(normalized)) {
    const day = calendarDayOfWeek(today);
    const saturday = shiftCalendarDate(today, day === 0 ? -1 : 6 - day);
    return { from: saturday, to: shiftCalendarDate(saturday, 1) };
  }
  if (/\bthis\s+week\b/.test(normalized)) {
    const day = calendarDayOfWeek(today);
    const monday = shiftCalendarDate(today, day === 0 ? -6 : 1 - day);
    return { from: monday, to: shiftCalendarDate(monday, 6) };
  }

  const weekdayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const requestedDay = weekdayNames.findIndex((day) => new RegExp(`\\b${day}\\b`).test(normalized));
  if (requestedDay >= 0) {
    const daysAhead = (requestedDay - calendarDayOfWeek(today) + 7) % 7;
    const target = shiftCalendarDate(today, daysAhead);
    return { from: target, to: target };
  }
  return {};
}

function inferredTimeWindow(query: string): { startHour?: number; endHour?: number } {
  const normalized = normalizeText(query);
  const result: { startHour?: number; endHour?: number } = {};
  if (/\bevening\b|\btonight\b/.test(normalized)) result.startHour = 17;
  else if (/\bafternoon\b/.test(normalized)) {
    result.startHour = 12;
    result.endHour = 17;
  } else if (/\bmorning\b/.test(normalized)) {
    result.endHour = 12;
  }

  const afterMatch = normalized.match(/\bafter\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (afterMatch) {
    let hour = Number(afterMatch[1]);
    if (afterMatch[3] === "pm" && hour < 12) hour += 12;
    if (afterMatch[3] === "am" && hour === 12) hour = 0;
    result.startHour = hour;
  }
  const beforeMatch = normalized.match(/\bbefore\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (beforeMatch) {
    let hour = Number(beforeMatch[1]);
    if (beforeMatch[3] === "pm" && hour < 12) hour += 12;
    if (beforeMatch[3] === "am" && hour === 12) hour = 0;
    result.endHour = hour;
  }
  return result;
}

function inferredFormat(query: string): string | undefined {
  const normalized = normalizeText(query);
  if (/\bonline\b|\bvirtual\b|\bremote\b/.test(normalized)) return "Virtual";
  if (/\bhybrid\b|\bin person and online\b/.test(normalized)) return "Hybrid";
  if (/\bin person\b|\bon campus\b|\bonsite\b/.test(normalized)) return "In person";
  return undefined;
}

function eventInDateWindow(event: Event, window: EventDateWindow): boolean {
  const range = eventDateRange(event);
  if (!range) return false;
  const fromCalendar = typeof window.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(window.from) ? window.from : undefined;
  const toCalendar = typeof window.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(window.to) ? window.to : undefined;
  if (fromCalendar && event.endAt.slice(0, 10) < fromCalendar) return false;
  if (toCalendar && event.startAt.slice(0, 10) > toCalendar) return false;
  const from = parseDateBoundary(window.from, false);
  const to = parseDateBoundary(window.to, true);
  if (!fromCalendar && from && range.end.getTime() < from.getTime()) return false;
  if (!toCalendar && to && range.start.getTime() > to.getTime()) return false;
  return true;
}

function eventInHourWindow(event: Event, startHour?: number, endHour?: number): boolean {
  const hour = eventHour(event.startAt);
  if (hour === null) return false;
  if (startHour !== undefined && hour < startHour) return false;
  if (endHour !== undefined && hour >= endHour) return false;
  return true;
}

function sortValue(value: string | undefined): string {
  return normalizeText(value).replace(/\s+/g, "-");
}

function sortEvents(
  values: Array<{ event: Event; ranked: EventRankBreakdown; match: TextMatch; index: number }>,
  sort: string | undefined,
): typeof values {
  const normalized = sortValue(sort ?? "recommended");
  return values.sort((first, second) => {
    if (normalized === "soonest" || normalized === "date") {
      return (parseDate(first.event.startAt)?.getTime() ?? Number.MAX_SAFE_INTEGER) - (parseDate(second.event.startAt)?.getTime() ?? Number.MAX_SAFE_INTEGER) || first.index - second.index;
    }
    if (normalized === "latest" || normalized === "newest") {
      return (parseDate(second.event.startAt)?.getTime() ?? 0) - (parseDate(first.event.startAt)?.getTime() ?? 0) || first.index - second.index;
    }
    if (normalized === "highest-rated" || normalized === "rating" || normalized === "rated") {
      return second.event.rating - first.event.rating || second.event.reviewCount - first.event.reviewCount || first.index - second.index;
    }
    if (normalized === "most-reviewed" || normalized === "reviews" || normalized === "popular") {
      return second.event.reviewCount - first.event.reviewCount || second.event.rating - first.event.rating || first.index - second.index;
    }
    if (normalized === "title" || normalized === "alphabetical") {
      return first.event.title.localeCompare(second.event.title) || first.index - second.index;
    }
    return second.ranked.score - first.ranked.score || second.match.weightedRatio - first.match.weightedRatio || (parseDate(first.event.startAt)?.getTime() ?? Number.MAX_SAFE_INTEGER) - (parseDate(second.event.startAt)?.getTime() ?? Number.MAX_SAFE_INTEGER) || first.index - second.index;
  });
}

/**
 * Case-insensitive catalog search with lightweight synonym matching and hard
 * structured filters. It accepts either `searchEvents("AI workshop", opts)` or
 * `searchEvents({ query: "AI workshop", free: true })` for route-handler use.
 */
export function searchEvents(query?: string, options?: EventSearchOptions): Event[];
export function searchEvents(options?: EventSearchOptions): Event[];
export function searchEvents(
  queryOrOptions: string | EventSearchOptions = "",
  maybeOptions: EventSearchOptions = {},
): Event[] {
  const options: EventSearchOptions = typeof queryOrOptions === "string" ? maybeOptions : queryOrOptions;
  const query = typeof queryOrOptions === "string" ? queryOrOptions : options.query ?? "";
  const nested = options.filters ?? {};
  const filters: EventSearchFilters = { ...options, ...nested };
  const source = options.events ?? eventCatalog;
  const referenceNowInput = options.now ?? DEMO_NOW;
  const referenceNow = parseDate(referenceNowInput) ?? parseDate(DEMO_NOW)!;
  const inferredDates = inferredDateWindow(query, referenceNowInput);
  const inferredTimes = inferredTimeWindow(query);
  const phrase = extractSearchPhrase(query);
  const hasMeaningfulQuery = Boolean(phrase.trim());
  const queryFree = /\bfree\b|\bno\s+cost\b|\bcomplimentary\b/.test(normalizeText(query));
  const queryFormat = inferredFormat(query);
  const requestedCategories = asStringArray(filters.category ?? filters.categories);
  const requestedFormats = asStringArray(filters.format ?? filters.formats);
  const dateWindow: EventDateWindow = {
    from: filters.dateFrom ?? filters.from ?? filters.dateWindow?.from ?? filters.dateRange?.from ?? inferredDates.from,
    to: filters.dateTo ?? filters.to ?? filters.dateWindow?.to ?? filters.dateRange?.to ?? inferredDates.to,
  };
  const formats = requestedFormats.length ? requestedFormats : queryFormat ? [queryFormat] : [];
  const categoryValues = requestedCategories.length ? requestedCategories : [];
  const freeOnly = filters.free === true || filters.freeOnly === true || queryFree;
  const requestedStartHour = filters.startHour ?? inferredTimes.startHour;
  const requestedEndHour = filters.endHour ?? inferredTimes.endHour;
  const contextBase: EventRankContext = {
    query: hasMeaningfulQuery ? query : undefined,
    interests: options.interests ?? options.preferences,
    preferredCategories: options.preferredCategories,
    preferredFormats: options.preferredFormats,
    freeOnly,
    availableStartHour: options.availableStartHour,
    availableEndHour: options.availableEndHour,
    now: options.now ?? DEMO_NOW,
  };

  const rankedValues = source.reduce<Array<{ event: Event; ranked: EventRankBreakdown; match: TextMatch; index: number }>>((result, event, index) => {
    if (categoryValues.length && !categoryValues.some((category) => categoryMatches(event.category, category))) return result;
    if (freeOnly && !isFreeEvent(event)) return result;
    if (filters.free === false && isFreeEvent(event)) return result;
    if (formats.length && !formats.some((format) => formatMatches(event.format, format))) return result;
    if (filters.location && !hasTerm(event.location, filters.location)) return result;
    if (filters.audience && !scoreTextMatch(event, filters.audience).matchedCount) return result;
    if ((dateWindow.from !== undefined || dateWindow.to !== undefined) && !eventInDateWindow(event, dateWindow)) return result;
    if (options.upcomingOnly && !isEventUpcoming(event, options.now ?? DEMO_NOW)) return result;
    if (options.featuredOnly && !event.featured) return result;
    if ((requestedStartHour !== undefined || requestedEndHour !== undefined) && !eventInHourWindow(event, requestedStartHour, requestedEndHour)) return result;

    const match = scoreTextMatch(event, phrase || query);
    if (hasMeaningfulQuery && match.matchedCount === 0) return result;

    let semanticScore: number | undefined;
    if (query && options.semanticScorer) {
      try {
        const score = options.semanticScorer(event, query);
        if (typeof score === "number" && Number.isFinite(score)) semanticScore = clamp(score);
      } catch {
        // Optional semantic retrieval must never take down keyword search.
      }
    } else if (query && options.semanticAdapter) {
      try {
        const score = options.semanticAdapter.score(event, query);
        if (typeof score === "number" && Number.isFinite(score)) semanticScore = clamp(score);
      } catch {
        // Fallback to deterministic lexical matching when the adapter is unavailable.
      }
    }
    const ranked = rankEvent(event, { ...contextBase, semanticScore });
    result.push({ event: { ...event, score: ranked.score, scoreReasons: ranked.reasons }, ranked, match, index });
    return result;
  }, []);

  const sorted = sortEvents(rankedValues, options.sortBy ?? options.sort);
  const offset = Math.max(0, Math.floor(options.offset ?? 0));
  const limit = options.limit === undefined ? sorted.length : Math.max(0, Math.floor(options.limit));
  return sorted.slice(offset, offset + limit).map(({ event }) => event);
}
