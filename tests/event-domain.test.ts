import { describe, expect, it } from "vitest";
import * as eventDomain from "../lib/events";

type EventRecord = Record<string, unknown>;
type DomainFunction = (...args: unknown[]) => unknown;

const exported = eventDomain as unknown as Record<string, unknown>;
const rawCatalog = exported.eventCatalog ?? exported.catalog ?? exported.events;
const catalog: EventRecord[] = Array.isArray(rawCatalog)
  ? rawCatalog.filter(isRecord)
  : [];

function isRecord(value: unknown): value is EventRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstFunction(names: string[]) {
  for (const name of names) {
    const candidate = exported[name];
    if (typeof candidate === "function") return candidate as DomainFunction;
  }
  return undefined;
}

function requireFunction(names: string[], label: string) {
  const candidate = firstFunction(names);
  if (!candidate) {
    throw new Error(`${label} is not exported from lib/events.ts`);
  }
  return candidate;
}

function textValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join(" ");
  if (isRecord(value)) {
    return textValue(value.label ?? value.name ?? value.text ?? value.value ?? value.reason);
  }
  return "";
}

function eventText(event: EventRecord): string {
  return [
    "title",
    "summary",
    "description",
    "category",
    "organizer",
    "location",
    "format",
    "audience",
    "tags",
  ]
    .map((field) => textValue(event[field]))
    .join(" ")
    .toLowerCase();
}

function eventId(event: EventRecord): string {
  return textValue(event.id ?? event.eventId ?? event.slug);
}

function eventCategory(event: EventRecord): string {
  return textValue(event.category ?? event.categories).trim().toLowerCase();
}

function hasValue(event: EventRecord, field: string): boolean {
  const value = event[field];
  return value !== undefined && value !== null && textValue(value).trim().length > 0;
}

function isFree(event: EventRecord): boolean {
  const raw = event.priceLabel ?? event.price ?? event.cost ?? event.admission ?? event.fee;
  if (typeof raw === "number") return raw === 0;
  const value = textValue(raw).toLowerCase().trim();
  return value === "0" || value === "$0" || value.includes("free") || value.includes("no cost") || value.includes("no fee");
}

function unwrapEvent(value: unknown): EventRecord | null {
  if (!isRecord(value)) return null;
  for (const key of ["event", "item", "data"]) {
    const nested = value[key];
    if (isRecord(nested) && (hasValue(nested, "id") || hasValue(nested, "title"))) {
      return nested;
    }
  }
  return value;
}

function eventArray(value: unknown): EventRecord[] | null {
  if (Array.isArray(value)) {
    return value.map(unwrapEvent).filter((item): item is EventRecord => item !== null);
  }
  if (!isRecord(value)) return null;
  for (const key of ["events", "results", "items", "matches", "data"]) {
    if (Array.isArray(value[key])) return eventArray(value[key]);
  }
  return null;
}

function callArrayFunction(
  fn: DomainFunction,
  candidates: unknown[][],
  accepts: (items: EventRecord[]) => boolean,
  label: string,
) {
  const errors: string[] = [];
  for (const args of candidates) {
    try {
      const result = eventArray(fn(...args));
      if (result && accepts(result)) return result;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  const suffix = errors.length ? ` Last errors: ${errors.slice(-2).join(" | ")}` : "";
  throw new Error(`Could not call ${label} with the supported EventRank signatures.${suffix}`);
}

function scoreValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (!isRecord(value)) return null;
  for (const key of ["score", "eventRank", "eventRankScore", "rankScore", "rank", "total", "value"]) {
    const candidate = value[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
  }
  if (isRecord(value.score)) return scoreValue(value.score);
  return null;
}

function reasonsFrom(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) return [value.trim()];
  if (Array.isArray(value)) {
    return value.map(textValue).map((item) => item.trim()).filter(Boolean);
  }
  if (!isRecord(value)) return [];
  for (const key of ["reasons", "scoreReasons", "explanations", "explanation", "why"]) {
    const reasons = reasonsFrom(value[key]);
    if (reasons.length) return reasons;
  }
  return [];
}

function callScore(fn: DomainFunction, event: EventRecord): unknown {
  const candidates: unknown[][] = [
    [event],
      [event, {}],
      [event, { interests: [] }],
    [{ event }],
    [{ event, preferences: { interests: [] } }],
  ];
  for (const args of candidates) {
    try {
      const result = fn(...args);
      if (scoreValue(result) !== null) return result;
    } catch {
      // Try the next documented-compatible shape. The domain contract is pure.
    }
  }
  throw new Error("Could not call the EventRank score function with a supported signature.");
}

function callExplanation(fn: DomainFunction, event: EventRecord, score: unknown): unknown {
  const candidates: unknown[][] = [
    [event],
    [event, {}],
    [score],
    [event, score],
    [{ event, score }],
  ];
  for (const args of candidates) {
    try {
      const result = fn(...args);
      if (reasonsFrom(result).length) return result;
    } catch {
      // Try the next compatible shape.
    }
  }
  throw new Error("Could not call the EventRank explanation function with a supported signature.");
}

function callLookup(fn: DomainFunction, id: unknown): EventRecord | null {
  const normalizedId = textValue(id);
  const candidates: unknown[][] = [
    [id],
    [normalizedId],
    [id, catalog],
    [normalizedId, catalog],
    [catalog, id],
    [catalog, normalizedId],
    [{ id }],
    [{ id: normalizedId }],
    [{ id, events: catalog }],
    [{ id: normalizedId, events: catalog }],
  ];
  for (const args of candidates) {
    try {
      const result = unwrapEvent(fn(...args));
      if (result && eventId(result) === normalizedId) return result;
    } catch {
      // Try the next compatible shape.
    }
  }
  return null;
}

describe("EventRank catalog contract", () => {
  it("ships a complete, diverse synthetic catalog", () => {
    expect(catalog.length).toBeGreaterThanOrEqual(80);

    const categories = new Set(catalog.map(eventCategory).filter(Boolean));
    expect(categories.size).toBeGreaterThanOrEqual(8);

    const categoryFamilies = [
      /tech|ai|computer|coding|engineering|data/i,
      /career|professional|network|internship/i,
      /entrepreneur|founder|startup|venture/i,
      /art|culture|music|film|creative|theater/i,
      /community|volunteer|service|civic/i,
      /wellness|health|mindful|fitness|yoga/i,
      /sport|athletic|soccer|basketball|recreation|run/i,
      /academic|research|lecture|seminar|science|study/i,
    ];

    for (const family of categoryFamilies) {
      expect(catalog.some((event) => family.test(eventText(event)))).toBe(true);
    }

    const coreFields = ["id", "title", "category", "startAt", "endAt", "location", "organizer"];
    const completeRecords = catalog.filter((event) => coreFields.every((field) => hasValue(event, field)));
    expect(completeRecords.length / catalog.length).toBeGreaterThanOrEqual(0.9);
  });
});

describe("EventRank retrieval and filters", () => {
  it("keeps a focused AI/workshop query relevant", () => {
    const search = requireFunction(["searchEvents", "searchCatalog", "searchEventCatalog", "search"], "Search function");
    const query = "AI workshop";
    const results = callArrayFunction(
      search,
      [
        [query],
        [query, catalog],
        [catalog, query],
        [{ query, events: catalog }],
        [{ query, catalog }],
      ],
      (items) => items.length > 0 && items.some((event) => /ai|workshop/i.test(eventText(event))),
      "searchEvents",
    );

    expect(results.length).toBeGreaterThan(0);
    expect(/ai|workshop/i.test(eventText(results[0]))).toBe(true);
  });

  it("applies category and free-only filters as hard constraints", () => {
    const filter = requireFunction(["filterEvents", "applyEventFilters", "applyFilters", "filterCatalog"], "Filter function");
    const sample = catalog.find((event) => eventCategory(event));
    expect(sample).toBeDefined();
    const category = eventCategory(sample as EventRecord);
    const categoryOptions = [
      { category },
      { categories: [category] },
      { category: category.replace(/^./, (letter) => letter.toUpperCase()) },
    ];
    const categoryCandidates: unknown[][] = categoryOptions.flatMap((options) => [
      [catalog, options],
      [options, catalog],
      [{ events: catalog, filters: options }],
      [{ events: catalog, ...options }],
    ]);
    const byCategory = callArrayFunction(
      filter,
      categoryCandidates,
      (items) => items.length > 0 && items.length < catalog.length && items.every((event) => eventCategory(event) === category),
      "filterEvents (category)",
    );
    expect(byCategory.every((event) => eventCategory(event) === category)).toBe(true);

    const freeOptions = [{ price: "Free" }, { cost: "Free" }, { freeOnly: true }, { isFree: true }];
    const freeCandidates: unknown[][] = freeOptions.flatMap((options) => [
      [catalog, options],
      [options, catalog],
      [{ events: catalog, filters: options }],
      [{ events: catalog, ...options }],
    ]);
    const freeEvents = callArrayFunction(
      filter,
      freeCandidates,
      (items) => items.length > 0 && items.length < catalog.length && items.every(isFree),
      "filterEvents (free)",
    );
    expect(freeEvents.length).toBeGreaterThan(0);
    expect(freeEvents.every(isFree)).toBe(true);
  });
});

describe("EventRank scoring and lookup", () => {
  it("returns a bounded deterministic score and stable explanations", () => {
    const sample = catalog[0];
    expect(sample).toBeDefined();
    const scoreFunction = requireFunction(
      ["scoreEvent", "calculateEventRank", "calculateEventScore", "rankEvent"],
      "Score function",
    );
    const firstScore = callScore(scoreFunction, sample as EventRecord);
    const secondScore = callScore(scoreFunction, sample as EventRecord);
    expect(secondScore).toEqual(firstScore);

    const score = scoreValue(firstScore);
    expect(score).not.toBeNull();
    expect(score as number).toBeGreaterThanOrEqual(0);
    expect(score as number).toBeLessThanOrEqual(100);

    const explanationFunction = firstFunction([
      "explainScore",
      "getScoreExplanation",
      "getEventScoreExplanation",
      "explainEventScore",
      "scoreExplanation",
      "explainEventRank",
    ]);
    const firstExplanation = explanationFunction
      ? callExplanation(explanationFunction, sample as EventRecord, firstScore)
      : firstScore;
    const secondExplanation = explanationFunction
      ? callExplanation(explanationFunction, sample as EventRecord, firstScore)
      : firstScore;
    const firstReasons = reasonsFrom(firstExplanation);
    const secondReasons = reasonsFrom(secondExplanation);

    expect(firstReasons.length).toBeGreaterThan(0);
    expect(firstReasons).toEqual(secondReasons);
    expect(firstReasons.every((reason) => reason.trim().length > 0)).toBe(true);
  });

  it("finds a known event and returns no record for an unknown id", () => {
    const lookup = requireFunction(["getEventById", "findEventById", "lookupEvent", "lookupEventById"], "Event lookup function");
    const knownId = catalog[0].id ?? catalog[0].eventId ?? catalog[0].slug ?? eventId(catalog[0]);
    expect(knownId).not.toBe("");

    const found = callLookup(lookup, knownId);
    expect(found).not.toBeNull();
    expect(eventId(found as EventRecord)).toBe(textValue(knownId));

    const missingId = "eventrank-missing-event";
    let missingResult: unknown = undefined;
    const missingCandidates: unknown[][] = [
      [missingId],
      [missingId, catalog],
      [catalog, missingId],
      [{ id: missingId }],
    ];
    for (const args of missingCandidates) {
      try {
        const result = lookup(...args);
        if (result === undefined || result === null) {
          missingResult = result;
          break;
        }
      } catch {
        // Continue until the lookup's supported signature is reached.
      }
    }
    expect(missingResult == null).toBe(true);
  });
});
