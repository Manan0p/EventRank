import { describe, expect, it } from "vitest";

import {
  addRegistration,
  addReport,
  addReview,
  deleteReview,
  findRegistration,
  findReview,
  findReviewsForEvent,
  resetDemoStore,
  updateReview,
} from "../app/api/_lib/demo-store";
import {
  badRequest,
  errorResponse,
  forbidden,
  internalError,
  isPlainObject,
  notFound,
  parseDateParam,
  parseLimitOffset,
  parseShortString,
  parseTriStateBoolean,
  readJsonBody,
  unauthenticated,
  validationError,
} from "../app/api/_lib/http";
import {
  checkRateLimit,
  rateLimitedResponse,
} from "../app/api/_lib/rate-limit";
import {
  buildIcsCalendar,
  buildIcsEvent,
  escapeIcsText,
  formatIcsDate,
} from "../lib/ics";
import {
  DEFAULT_PREFERENCES,
  InMemoryPersistenceStore,
} from "../lib/persistence";

async function readErrorBody(response: Response) {
  return (await response.json()) as {
    error: { code: string; message: string };
  };
}

function uniqueKey(prefix: string) {
  return `${prefix}:${Date.now()}:${Math.floor(Math.random() * 1_000_000)}`;
}

describe("API error envelope", () => {
  it("returns { error: { code, message } } with the matching status", async () => {
    const cases: Array<{
      response: Response;
      status: number;
      code: string;
      message: string;
    }> = [
      { response: badRequest("Bad input."), status: 400, code: "bad_request", message: "Bad input." },
      { response: unauthenticated(), status: 401, code: "unauthenticated", message: "Sign in to continue." },
      { response: forbidden("Nope."), status: 403, code: "forbidden", message: "Nope." },
      { response: notFound("Missing."), status: 404, code: "not_found", message: "Missing." },
      { response: validationError("Invalid."), status: 422, code: "validation_error", message: "Invalid." },
      { response: internalError(), status: 500, code: "internal_error", message: "Something went wrong." },
      { response: rateLimitedResponse(), status: 429, code: "rate_limited", message: "Too many requests. Please try again shortly." },
    ];
    for (const entry of cases) {
      expect(entry.response.status).toBe(entry.status);
      const body = await readErrorBody(entry.response);
      expect(body.error.code).toBe(entry.code);
      expect(body.error.message).toBe(entry.message);
    }
  });

  it("builds custom envelopes through errorResponse", async () => {
    const response = errorResponse(400, "bad_request", "Custom.");
    expect(response.status).toBe(400);
    expect(await readErrorBody(response)).toEqual({
      error: { code: "bad_request", message: "Custom." },
    });
  });
});

describe("limit/offset validation", () => {
  it("defaults to limit 20 and offset 0", () => {
    const parsed = parseLimitOffset(new URLSearchParams());
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.limit).toBe(20);
      expect(parsed.offset).toBe(0);
    }
  });

  it("accepts in-range paging values", () => {
    const parsed = parseLimitOffset(new URLSearchParams("limit=10&offset=40"));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.limit).toBe(10);
      expect(parsed.offset).toBe(40);
    }
  });

  it("rejects out-of-range or malformed limits with a 400", async () => {
    for (const raw of ["0", "101", "-1", "1.5", "abc", ""]) {
      const parsed = parseLimitOffset(new URLSearchParams(`limit=${raw}`));
      expect(parsed.ok).toBe(false);
      if (!parsed.ok) expect(parsed.response.status).toBe(400);
    }
    const malformedOffset = parseLimitOffset(new URLSearchParams("offset=nope"));
    expect(malformedOffset.ok).toBe(false);
    if (!malformedOffset.ok) {
      expect(malformedOffset.response.status).toBe(400);
      expect((await readErrorBody(malformedOffset.response)).error.code).toBe("bad_request");
    }
  });
});

describe("tri-state boolean parsing", () => {
  it("treats missing and empty values as undefined", () => {
    expect(parseTriStateBoolean(null, "free")).toEqual({ ok: true, value: undefined });
    expect(parseTriStateBoolean("", "free")).toEqual({ ok: true, value: undefined });
  });

  it("parses true/false variants case-insensitively", () => {
    expect(parseTriStateBoolean("true", "free")).toEqual({ ok: true, value: true });
    expect(parseTriStateBoolean("1", "free")).toEqual({ ok: true, value: true });
    expect(parseTriStateBoolean(" TRUE ", "free")).toEqual({ ok: true, value: true });
    expect(parseTriStateBoolean("false", "free")).toEqual({ ok: true, value: false });
    expect(parseTriStateBoolean("0", "free")).toEqual({ ok: true, value: false });
    expect(parseTriStateBoolean(" False ", "free")).toEqual({ ok: true, value: false });
  });

  it("rejects anything else with a named 400", async () => {
    const parsed = parseTriStateBoolean("yes", "free");
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.response.status).toBe(400);
      const body = await readErrorBody(parsed.response);
      expect(body.error.message).toBe("Invalid free.");
    }
  });
});

describe("query and body helpers", () => {
  it("parses date params and rejects garbage", () => {
    expect(parseDateParam(null, "dateFrom")).toEqual({ ok: true, value: undefined });
    const valid = parseDateParam("2026-10-10", "dateFrom");
    expect(valid.ok).toBe(true);
    const invalid = parseDateParam("not-a-date", "dateFrom");
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.response.status).toBe(400);
  });

  it("trims short strings and drops empty or oversized values", () => {
    expect(parseShortString(null)).toBe(undefined);
    expect(parseShortString("   ")).toBe(undefined);
    expect(parseShortString("  jazz  ")).toBe("jazz");
    expect(parseShortString("x".repeat(201))).toBe(undefined);
    expect(parseShortString("x".repeat(200))).toBe("x".repeat(200));
  });

  it("detects plain objects", () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject("x")).toBe(false);
  });

  it("reads JSON bodies and turns malformed payloads into a 400", async () => {
    const valid = await readJsonBody(
      new Request("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ rating: 5 }),
      }),
    );
    expect(valid.ok).toBe(true);
    if (valid.ok) expect(valid.value).toEqual({ rating: 5 });

    const empty = await readJsonBody(new Request("http://localhost/api", { method: "POST" }));
    expect(empty.ok).toBe(true);

    const malformed = await readJsonBody(
      new Request("http://localhost/api", { method: "POST", body: "{nope" }),
    );
    expect(malformed.ok).toBe(false);
    if (!malformed.ok) expect(malformed.response.status).toBe(400);
  });
});

describe("rate limiter", () => {
  it("allows up to the limit then denies within the window", () => {
    const key = uniqueKey("contract-limit");
    expect(checkRateLimit(key, 2, 60_000)).toBe(true);
    expect(checkRateLimit(key, 2, 60_000)).toBe(true);
    expect(checkRateLimit(key, 2, 60_000)).toBe(false);
  });

  it("isolates buckets per key", () => {
    const first = uniqueKey("contract-a");
    const second = uniqueKey("contract-b");
    expect(checkRateLimit(first, 1, 60_000)).toBe(true);
    expect(checkRateLimit(first, 1, 60_000)).toBe(false);
    expect(checkRateLimit(second, 1, 60_000)).toBe(true);
  });

  it("refills after the window passes", async () => {
    const key = uniqueKey("contract-window");
    expect(checkRateLimit(key, 1, 20)).toBe(true);
    expect(checkRateLimit(key, 1, 20)).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(checkRateLimit(key, 1, 20)).toBe(true);
  });
});

describe("demo-store save/review/report round-trips", () => {
  it("registers idempotently per user and event", () => {
    resetDemoStore();
    const user = uniqueKey("user");
    const first = addRegistration(user, "evt-a");
    expect(first.created).toBe(true);
    expect(first.registration.eventId).toBe("evt-a");
    const second = addRegistration(user, "evt-a");
    expect(second.created).toBe(false);
    expect(findRegistration(user, "evt-a")).not.toBe(null);
    expect(findRegistration(user, "evt-unknown")).toBe(null);
  });

  it("supports the full review lifecycle", () => {
    resetDemoStore();
    const user = uniqueKey("user");
    const created = addReview(user, "evt-a", { rating: 5, title: "Great", body: "Loved it." });
    expect(created.created).toBe(true);
    expect(findReview(user, "evt-a")?.rating).toBe(5);

    const duplicate = addReview(user, "evt-a", { rating: 2 });
    expect(duplicate.created).toBe(false);

    const updated = updateReview(user, "evt-a", { rating: 4 });
    expect(updated?.rating).toBe(4);
    expect(updateReview(user, "evt-missing", { rating: 4 })).toBe(null);

    expect(findReviewsForEvent("evt-a").length).toBe(1);
    expect(deleteReview(user, "evt-a")).toBe(true);
    expect(findReview(user, "evt-a")).toBe(null);
    expect(deleteReview(user, "evt-a")).toBe(false);
  });

  it("logs reports and clears everything on reset", () => {
    resetDemoStore();
    const user = uniqueKey("user");
    addRegistration(user, "evt-a");
    addReview(user, "evt-a", { rating: 3 });
    const report = addReport(user, { eventId: "evt-a", reason: "spam" });
    expect(report.eventId).toBe("evt-a");
    expect(report.reason).toBe("spam");
    resetDemoStore();
    expect(findRegistration(user, "evt-a")).toBe(null);
    expect(findReview(user, "evt-a")).toBe(null);
    expect(findReviewsForEvent("evt-a")).toEqual([]);
  });
});

describe("in-memory persistence store", () => {
  it("scopes saved events per user", () => {
    const store = new InMemoryPersistenceStore();
    store.setSavedEvent("u1", "evt-a", true);
    expect(store.isEventSaved("u1", "evt-a")).toBe(true);
    expect(store.isEventSaved("u2", "evt-a")).toBe(false);
    expect(store.getSavedEventIds("u1")).toEqual(["evt-a"]);
    store.setSavedEvent("u1", "evt-a", false);
    expect(store.getSavedEventIds("u1")).toEqual([]);
  });

  it("round-trips preference patches over defaults", () => {
    const store = new InMemoryPersistenceStore();
    expect(store.getPreferences("u1")).toEqual(DEFAULT_PREFERENCES);
    const saved = store.savePreferences("u1", {
      interests: ["AI", "AI", " music "],
      cost: "free",
      personalizationEnabled: false,
    });
    expect(saved.interests).toEqual(["AI", "music"]);
    expect(saved.cost).toBe("free");
    expect(store.getPreferences("u1").personalizationEnabled).toBe(false);
  });
});

describe("ICS builder", () => {
  it("formats UTC timestamps and rejects bad dates", () => {
    expect(formatIcsDate("2026-10-15T18:00:00-04:00")).toBe("20261015T220000Z");
    expect(formatIcsDate("not-a-date")).toBe(null);
  });

  it("escapes text per RFC 5545", () => {
    expect(escapeIcsText("a;b,c\\d\ne")).toBe("a\\;b\\,c\\\\d\\ne");
  });

  it("builds a well-formed VEVENT and returns null for bad dates", () => {
    const block = buildIcsEvent({
      id: "evt-a",
      title: "Applied AI Studio",
      description: "Build things.",
      location: "Room 101",
      startAt: "2026-10-15T18:00:00-04:00",
      endAt: "2026-10-15T20:00:00-04:00",
    });
    expect(block).not.toBe(null);
    const lines = (block as string).split("\r\n");
    expect(lines[0]).toBe("BEGIN:VEVENT");
    expect(lines[lines.length - 1]).toBe("END:VEVENT");
    expect(block).toContain("UID:evt-a");
    expect(block).toContain("DTSTART:20261015T220000Z");
    expect(block).toContain("DTEND:20261016T000000Z");
    expect(block).toContain("SUMMARY:Applied AI Studio");

    expect(
      buildIcsEvent({
        id: "evt-bad",
        title: "Bad",
        startAt: "nope",
        endAt: "2026-10-15T20:00:00-04:00",
      }),
    ).toBe(null);
  });

  it("folds long lines and wraps events in a VCALENDAR envelope", () => {
    const calendar = buildIcsCalendar([
      {
        id: "evt-long",
        title: "A".repeat(100),
        startAt: "2026-10-15T18:00:00-04:00",
        endAt: "2026-10-15T20:00:00-04:00",
      },
      { id: "evt-bad", title: "Bad", startAt: "nope", endAt: "also-bad" },
    ]);
    expect(calendar.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(calendar.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(calendar).toContain("PRODID:-//EventRank//Campus Events//EN");
    expect(calendar).toContain("\r\n ");
    expect(calendar).toContain("BEGIN:VEVENT");
    expect(calendar).not.toContain("evt-bad");
  });
});
