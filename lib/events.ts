import { seedEvents, type SeedEvent } from "../data/seed-events";

export type EventStatus = "published" | "canceled" | "full" | "completed" | "archived";

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
  semanticScore?: number;
  semanticSimilarity?: number;
  diversityPenalty?: number;
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
  rank_version: string;
  components: EventRankComponents;
  reasons: string[];
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
  location?: string;
  audience?: string;
  startHour?: number;
  endHour?: number;
}

export interface EventSearchOptions extends EventSearchFilters, EventRankContext {
  query?: string;
  filters?: EventSearchFilters;
  upcomingOnly?: boolean;
  featuredOnly?: boolean;
  sort?: string;
  sortBy?: string;
  limit?: number;
  offset?: number;
  events?: readonly Event[];
  semanticScorer?: (event: Event, query: string) => number | null | undefined;
  semanticAdapter?: { score(event: Event, query: string): number | null | undefined };
}

export const DEMO_NOW = "2026-10-10T09:00:00-04:00";

const aliases: Record<string, string[]> = {
  ai: ["artificial", "intelligence", "machine", "learning", "ml"],
  tech: ["technology", "technical", "coding", "software", "engineering"],
  technology: ["tech", "technical", "coding", "software", "engineering"],
  coding: ["code", "programming", "developer", "software", "technology"],
  workshop: ["lab", "studio", "clinic", "training", "hands-on"],
  career: ["internship", "resume", "job", "professional", "networking"],
  creative: ["arts", "art", "culture", "music", "poetry", "design", "film"],
  arts: ["art", "creative", "culture", "music", "poetry", "design", "film"],
  culture: ["cultural", "arts", "music", "community"],
  volunteer: ["service", "cleanup", "community", "sustainability"],
  service: ["volunteer", "community", "sustainability", "cleanup"],
  wellness: ["health", "mindfulness", "stress", "sleep", "movement"],
  sports: ["sport", "soccer", "climbing", "fitness", "athletics"],
  competition: ["challenge", "hack", "hackathon", "debate", "showcase", "pitch"],
  social: ["community", "networking", "cafe", "brunch", "market", "friends"],
};

const stopWords = new Set(["a", "an", "and", "are", "at", "be", "by", "for", "from", "in", "is", "me", "of", "on", "or", "the", "to", "with", "event", "events", "this", "week", "today", "tomorrow", "free", "evening", "morning", "afternoon", "weekend", "hybrid", "virtual", "online"]);

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function parseDate(value: DateInput | undefined) {
  if (value === undefined || value === null) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: unknown, removeStops = false) {
  return normalizeText(value).split(" ").filter((token) => token && (!removeStops || !stopWords.has(token)));
}

function tokenMatches(text: string, token: string) {
  const source = new Set(tokens(text));
  const variants = new Set([token, ...(aliases[token] ?? [])]);
  return [...variants].some((variant) => [...source].some((candidate) => candidate === variant || candidate.startsWith(variant) || variant.startsWith(candidate)));
}

function eventText(event: Event) {
  return [event.title, event.category, event.organizer, event.summary, event.description, event.location, event.format, event.audience, ...event.tags].join(" ");
}

function matchScore(event: Event, query: string) {
  const queryTokens = tokens(query, true);
  if (!queryTokens.length) return 0;
  let score = 0;
  for (const token of queryTokens) {
    const title = tokenMatches(event.title, token);
    const tags = tokenMatches(event.tags.join(" "), token);
    const all = tokenMatches(eventText(event), token);
    if (title) score += 1;
    else if (tags) score += 0.9;
    else if (all) score += 0.55;
  }
  return score / queryTokens.length;
}

function categoryMatches(eventCategory: string, requested: string) {
  const eventValue = normalizeText(eventCategory);
  const requestedValue = normalizeText(requested);
  return !requestedValue || requestedValue === "all" || requestedValue === "all events" || eventValue === requestedValue || eventValue.includes(requestedValue) || requestedValue.includes(eventValue);
}

function formatMatches(eventFormat: string, requested: string) {
  const eventValue = normalizeText(eventFormat).replace(/\s/g, "");
  const requestedValue = normalizeText(requested).replace(/\s/g, "");
  if (!requestedValue || requestedValue === "anyformat") return true;
  const accepted: Record<string, string[]> = { inperson: ["inperson", "onsite", "oncampus"], hybrid: ["hybrid", "mixed"], virtual: ["virtual", "online", "remote"] };
  return (accepted[requestedValue] ?? [requestedValue]).includes(eventValue);
}

function eventHour(value: string) {
  const date = parseDate(value);
  return date ? date.getHours() : null;
}

function eventDate(value: string) {
  return value.slice(0, 10);
}

export function isFreeEvent(event: Pick<Event, "priceLabel">) {
  return /free|no cost|no fee|complimentary|\$0/i.test(event.priceLabel);
}

export function isEventPast(event: Pick<Event, "endAt">, now: DateInput = DEMO_NOW) {
  const end = parseDate(event.endAt);
  const reference = parseDate(now);
  return Boolean(end && reference && end.getTime() < reference.getTime());
}

export function isEventUpcoming(event: Pick<Event, "endAt">, now: DateInput = DEMO_NOW) {
  return !isEventPast(event, now);
}

export function eventsOverlap(first: Pick<Event, "startAt" | "endAt">, second: Pick<Event, "startAt" | "endAt">) {
  const firstStart = parseDate(first.startAt)?.getTime();
  const firstEnd = parseDate(first.endAt)?.getTime();
  const secondStart = parseDate(second.startAt)?.getTime();
  const secondEnd = parseDate(second.endAt)?.getTime();
  return [firstStart, firstEnd, secondStart, secondEnd].every((value) => typeof value === "number") && firstStart! < secondEnd! && secondStart! < firstEnd!;
}

function practicalFit(event: Event, context: EventRankContext, now: Date) {
  let score = 0.68;
  if (isEventPast(event, now)) score -= 0.18;
  if (isFreeEvent(event)) score += context.freeOnly ? 0.2 : 0.06;
  if (context.freeOnly && !isFreeEvent(event)) score -= 0.24;
  if (context.preferredFormats?.length) score += context.preferredFormats.some((format) => formatMatches(event.format, format)) ? 0.16 : -0.1;
  const hour = eventHour(event.startAt);
  if (hour !== null && context.availableStartHour !== undefined) score += hour >= context.availableStartHour ? 0.08 : -0.1;
  if (hour !== null && context.availableEndHour !== undefined) score += hour <= context.availableEndHour ? 0.04 : -0.08;
  if (/full|waitlist/i.test(event.capacityStatus)) score -= 0.18;
  return clamp(score);
}

function trustScore(event: Event) {
  const fields = [event.title, event.category, event.organizer, event.summary, event.description, event.startAt, event.endAt, event.location, event.format, event.priceLabel, event.audience, event.capacityStatus];
  return clamp(fields.filter((field) => String(field ?? "").trim()).length / fields.length * 0.96 + (event.reviewCount > 0 ? 0.04 : 0));
}

function freshnessScore(event: Event, now: Date) {
  const start = parseDate(event.startAt);
  if (!start) return 0.45;
  const days = (start.getTime() - now.getTime()) / 86_400_000;
  if (days < 0) return 0.35;
  if (days <= 14) return 0.96;
  if (days <= 30) return 0.86;
  return 0.72;
}

function preferenceTerms(context: EventRankContext) {
  return [...new Set([...(context.interests ?? []), ...(context.preferences ?? []), ...(context.categories ?? []), ...(context.preferredCategories ?? [])].map(normalizeText).filter(Boolean))];
}

function relevanceScore(event: Event, context: EventRankContext) {
  const query = context.query?.trim();
  const queryScore = query ? matchScore(event, query) : 0;
  const preferenceScore = preferenceTerms(context).length ? matchScore(event, preferenceTerms(context).join(" ")) : 0.66;
  let value = query ? queryScore : preferenceScore;
  const semantic = context.semanticScore ?? context.semanticSimilarity;
  if (typeof semantic === "number" && Number.isFinite(semantic)) value = value * 0.65 + clamp(semantic) * 0.35;
  return clamp(value);
}

function buildReasons(event: Event, context: EventRankContext, components: EventRankComponents) {
  const reasons: string[] = [];
  const terms = preferenceTerms(context);
  if (context.query && matchScore(event, context.query) > 0) reasons.push(`Matches your search for “${context.query}”.`);
  else if (terms.find((term) => tokenMatches(eventText(event), term))) reasons.push(`Matches your interest in ${terms.find((term) => tokenMatches(eventText(event), term))}.`);
  if (context.freeOnly && isFreeEvent(event)) reasons.push("Free for Northbridge students.");
  else if (isFreeEvent(event)) reasons.push("Free and easy to try.");
  if (context.preferredFormats?.some((format) => formatMatches(event.format, format))) reasons.push(`Available ${event.format.toLowerCase()}.`);
  if (event.rating >= 4.6 && event.reviewCount >= 15) reasons.push(`Highly rated by ${event.reviewCount} students.`);
  if (event.featured) reasons.push("Curated pick for the Northbridge community.");
  if (!isEventPast(event, context.now ?? DEMO_NOW) && components.freshness >= 0.85) reasons.push("Upcoming with details ready to plan around.");
  if (reasons.length < 2) reasons.push(`Hosted by ${event.organizer}.`);
  if (reasons.length < 2) reasons.push("Complete event information for a confident choice.");
  return reasons.slice(0, 4);
}

export function rankEvent(event: Event, context: EventRankContext = {}): EventRankBreakdown {
  const now = parseDate(context.now ?? DEMO_NOW) ?? parseDate(DEMO_NOW)!;
  const components: EventRankComponents = {
    relevance: relevanceScore(event, context),
    practicalFit: practicalFit(event, context, now),
    trust: trustScore(event),
    freshness: freshnessScore(event, now),
    community: clamp((clamp(event.rating / 5) * 0.7) + (clamp(event.reviewCount / 60) * 0.3)),
    discovery: clamp(event.featured ? 0.86 : 0.62),
  };
  const weighted = components.relevance * EVENT_RANK_WEIGHTS.relevance +
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
    reasons: buildReasons(event, context, components),
  };
}

export const calculateEventRank = (event: Event, context: EventRankContext = {}) => rankEvent(event, context).score;
export const getScoreReasons = (event: Event, context: EventRankContext = {}) => rankEvent(event, context).reasons;
export const explainScore = getScoreReasons;
export const getScoreExplanation = getScoreReasons;

function buildEvent(seed: SeedEvent): Event {
  const event = {
    ...seed,
    status: seed.status ?? "published",
    tags: [...seed.tags],
    score: 0,
    scoreReasons: [] as string[],
  } as Event;
  const ranked = rankEvent(event);
  return { ...event, score: ranked.score, scoreReasons: ranked.reasons };
}

export const eventCatalog: Event[] = seedEvents.map(buildEvent);

export function getEventById(id: string | number, events: readonly Event[] = eventCatalog) {
  const key = String(id).trim().toLowerCase();
  return events.find((event) => event.id.toLowerCase() === key);
}

export function getCategories(events: readonly Pick<Event, "category">[] = eventCatalog) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const event of events) {
    const value = String(event.category ?? "").trim();
    const key = normalizeText(value);
    if (value && !seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }
  return result;
}

export function getFormats(events: readonly Pick<Event, "format">[] = eventCatalog) {
  return [...new Set(events.map((event) => String(event.format ?? "").trim()).filter(Boolean))];
}

function asArray(value: string | readonly string[] | undefined) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return value ? [String(value)] : [];
}

function passesDate(event: Event, from?: DateInput, to?: DateInput) {
  const start = parseDate(event.startAt);
  const end = parseDate(event.endAt);
  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  if (!start || !end) return false;
  if (fromDate && end.getTime() < fromDate.getTime()) return false;
  if (toDate && start.getTime() > toDate.getTime()) return false;
  if (typeof from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(from) && eventDate(event.endAt) < from) return false;
  if (typeof to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(to) && eventDate(event.startAt) > to) return false;
  return true;
}

export function filterEvents(first: readonly Event[] | EventSearchFilters = eventCatalog, second: EventSearchFilters | readonly Event[] = {}) {
  const firstIsEvents = Array.isArray(first);
  const secondIsEvents = Array.isArray(second);
  const events = (firstIsEvents ? first : secondIsEvents ? second : eventCatalog) as readonly Event[];
  const filters = (firstIsEvents ? (secondIsEvents ? {} : second) : first) as EventSearchFilters;
  const categories = asArray(filters.category ?? filters.categories);
  const formats = asArray(filters.format ?? filters.formats);
  const freeOnly = filters.free === true || filters.freeOnly === true;
  return events.filter((event) => {
    if (categories.length && !categories.some((category) => categoryMatches(event.category, category))) return false;
    if (freeOnly && !isFreeEvent(event)) return false;
    if (filters.free === false && isFreeEvent(event)) return false;
    if (formats.length && !formats.some((format) => formatMatches(event.format, format))) return false;
    if (filters.location && !tokenMatches(event.location, normalizeText(filters.location))) return false;
    if (filters.audience && !matchScore(event, filters.audience)) return false;
    if (!passesDate(event, filters.dateFrom ?? filters.from, filters.dateTo ?? filters.to)) return false;
    if (filters.startHour !== undefined && (eventHour(event.startAt) ?? -1) < filters.startHour) return false;
    if (filters.endHour !== undefined && (eventHour(event.startAt) ?? 99) >= filters.endHour) return false;
    return true;
  });
}

function inferredWindow(query: string, now: DateInput) {
  const date = parseDate(now) ?? parseDate(DEMO_NOW)!;
  const today = date.toISOString().slice(0, 10);
  const day = date.getDay();
  if (/this\s+weekend|weekend/i.test(query)) {
    const saturday = new Date(date);
    saturday.setDate(date.getDate() + (day === 0 ? 6 : 6 - day));
    return { from: saturday.toISOString().slice(0, 10), to: new Date(saturday.getTime() + 86_400_000).toISOString().slice(0, 10) };
  }
  if (/today/i.test(query)) return { from: today, to: today };
  return {};
}

function inferredHours(query: string) {
  const result: { startHour?: number; endHour?: number } = {};
  if (/evening|tonight/i.test(query)) result.startHour = 17;
  if (/morning/i.test(query)) result.endHour = 12;
  if (/afternoon/i.test(query)) { result.startHour = 12; result.endHour = 17; }
  const after = query.match(/after\s+(\d{1,2})\s*(am|pm)?/i);
  if (after) { let hour = Number(after[1]); if (after[2]?.toLowerCase() === "pm" && hour < 12) hour += 12; result.startHour = hour; }
  return result;
}

export function searchEvents(query?: string, options?: EventSearchOptions): Event[];
export function searchEvents(options?: EventSearchOptions): Event[];
export function searchEvents(queryOrOptions: string | EventSearchOptions = "", maybeOptions: EventSearchOptions = {}) {
  const options = typeof queryOrOptions === "string" ? maybeOptions : queryOrOptions;
  const query = typeof queryOrOptions === "string" ? queryOrOptions : options.query ?? "";
  const source = options.events ?? eventCatalog;
  const dateWindow = inferredWindow(query, options.now ?? DEMO_NOW);
  const hours = inferredHours(query);
  const freeFromQuery = /\bfree\b|no\s+cost/i.test(query);
  const normalizedQuery = normalizeText(query);
  const requestedCategories = asArray(options.category ?? options.categories);
  const requestedFormats = asArray(options.format ?? options.formats);
  const filtered = source.filter((event) => {
    if (requestedCategories.length && !requestedCategories.some((category) => categoryMatches(event.category, category))) return false;
    if ((options.free || options.freeOnly || freeFromQuery) && !isFreeEvent(event)) return false;
    if (options.free === false && isFreeEvent(event)) return false;
    if (requestedFormats.length && !requestedFormats.some((format) => formatMatches(event.format, format))) return false;
    if (options.location && !tokenMatches(event.location, normalizeText(options.location))) return false;
    if (options.audience && !matchScore(event, options.audience)) return false;
    if (!passesDate(event, options.dateFrom ?? options.from ?? dateWindow.from, options.dateTo ?? options.to ?? dateWindow.to)) return false;
    if (options.upcomingOnly && !isEventUpcoming(event, options.now ?? DEMO_NOW)) return false;
    if (options.featuredOnly && !event.featured) return false;
    const startHour = options.startHour ?? hours.startHour;
    const endHour = options.endHour ?? hours.endHour;
    if (startHour !== undefined && (eventHour(event.startAt) ?? -1) < startHour) return false;
    if (endHour !== undefined && (eventHour(event.startAt) ?? 99) >= endHour) return false;
    if (normalizedQuery && matchScore(event, query) === 0) return false;
    return true;
  }).map((event) => {
    let semanticScore: number | undefined;
    if (query && options.semanticScorer) semanticScore = Number(options.semanticScorer(event, query));
    if (query && options.semanticAdapter) semanticScore = Number(options.semanticAdapter.score(event, query));
    const ranking = rankEvent(event, { ...options, query: query || undefined, semanticScore: Number.isFinite(semanticScore) ? semanticScore : undefined });
    return { event: { ...event, score: ranking.score, scoreReasons: ranking.reasons }, ranking, match: matchScore(event, query) };
  });
  const sort = String(options.sortBy ?? options.sort ?? "recommended").toLowerCase();
  filtered.sort((a, b) => {
    if (sort === "soonest" || sort === "date") return (parseDate(a.event.startAt)?.getTime() ?? 0) - (parseDate(b.event.startAt)?.getTime() ?? 0);
    if (sort === "latest" || sort === "newest") return (parseDate(b.event.startAt)?.getTime() ?? 0) - (parseDate(a.event.startAt)?.getTime() ?? 0);
    if (sort.includes("rated") || sort === "rating") return b.event.rating - a.event.rating;
    if (sort.includes("review") || sort === "popular") return b.event.reviewCount - a.event.reviewCount;
    if (sort === "title" || sort === "alphabetical") return a.event.title.localeCompare(b.event.title);
    return b.ranking.score - a.ranking.score || b.match - a.match;
  });
  const offset = Math.max(0, Math.floor(options.offset ?? 0));
  const limit = options.limit === undefined ? filtered.length : Math.max(0, Math.floor(options.limit));
  return filtered.slice(offset, offset + limit).map((item) => item.event);
}

export function getRelatedEvents(event: Event, events: readonly Event[] = eventCatalog, context: EventRankContext = {}, limit = 3) {
  const category = normalizeText(event.category);
  return events
    .filter((candidate) => candidate.id !== event.id && candidate.status !== "canceled" && candidate.status !== "archived")
    .map((candidate) => {
      const sameCategory = normalizeText(candidate.category) === category ? 0.4 : 0;
      const sharedTags = candidate.tags.filter((tag) => event.tags.some((other) => normalizeText(other) === normalizeText(tag))).length * 0.08;
      const ranked = rankEvent(candidate, context);
      return { candidate, value: sameCategory + sharedTags + ranked.score / 1000 };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}
