/**
 * GET /api/events — college-scoped catalog feed.
 *
 * Query params: query, category, free, format, dateFrom, dateTo, sort,
 * limit, offset. Scoring/shaping come only from lib/events.ts; the feed
 * excludes canceled/archived records by default per the API contract.
 */

import { NextRequest } from "next/server";

import {
  EVENT_RANK_VERSION,
  searchEvents,
  type Event,
  type EventStatus,
} from "@/lib/events";

import {
  badRequest,
  parseDateParam,
  parseLimitOffset,
  parseShortString,
  parseTriStateBoolean,
} from "../_lib/http";

const HIDDEN_STATUSES: ReadonlySet<EventStatus> = new Set([
  "canceled",
  "archived",
]);

const ALLOWED_SORTS = new Set([
  "recommended",
  "soonest",
  "latest",
  "highest-rated",
  "most-reviewed",
  "title",
]);

function splitList(raw: string | undefined) {
  if (!raw) return undefined;
  const values = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return values.length ? values : undefined;
}

function toFeedItem(event: Event) {
  return {
    ...event,
    rank_version: EVENT_RANK_VERSION,
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const free = parseTriStateBoolean(searchParams.get("free"), "free");
  if (!free.ok) return free.response;
  const dateFrom = parseDateParam(searchParams.get("dateFrom"), "dateFrom");
  if (!dateFrom.ok) return dateFrom.response;
  const dateTo = parseDateParam(searchParams.get("dateTo"), "dateTo");
  if (!dateTo.ok) return dateTo.response;
  const paging = parseLimitOffset(searchParams);
  if (!paging.ok) return paging.response;

  const rawSort = parseShortString(searchParams.get("sort"));
  if (rawSort && !ALLOWED_SORTS.has(rawSort.toLowerCase())) {
    return badRequest("Invalid sort.");
  }

  const events = searchEvents({
    query: parseShortString(searchParams.get("query")),
    category: splitList(
      searchParams.get("category") ?? searchParams.get("categories") ?? undefined,
    ),
    free: free.value,
    format: splitList(
      searchParams.get("format") ?? searchParams.get("formats") ?? undefined,
    ),
    dateFrom: dateFrom.value,
    dateTo: dateTo.value,
    sort: rawSort,
  });

  const visible = events.filter(
    (event) => !HIDDEN_STATUSES.has(event.status),
  );

  const total = visible.length;
  const page = visible.slice(paging.offset, paging.offset + paging.limit);

  return Response.json({
    events: page.map(toFeedItem),
    rank_version: EVENT_RANK_VERSION,
    total,
    limit: paging.limit,
    offset: paging.offset,
  });
}
