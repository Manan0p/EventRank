/**
 * /api/events/:id/review — reviews for one event.
 *
 * POST: submit a review (one per user per event). Eligibility: 403 unless
 *   the event has ended AND (the user registered for it OR the demo
 *   fallback applies). Second submit returns the existing review with
 *   created:false. Validates rating 1–5 plus optional title/body.
 * PATCH: edit your own review (same shape as POST body, partial allowed).
 * DELETE: remove your own review.
 */

import { NextRequest } from "next/server";

import { getEventById, isEventPast } from "@/lib/events";
import { getDb } from "@/lib/db";
import { registrations, reviews } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

import { authenticate } from "../../../_lib/session";
import {
  addReview,
  deleteReview,
  findRegistration,
  findReview,
  updateReview,
} from "../../../_lib/demo-store";
import { checkRateLimit, rateLimitedResponse } from "../../../_lib/rate-limit";
import {
  badRequest,
  forbidden,
  internalError,
  isPlainObject,
  notFound,
  readJsonBody,
  validationError,
} from "../../../_lib/http";

type Params = { params: { id: string } };

function parseReviewInput(value: unknown) {
  if (!isPlainObject(value)) return { ok: false as const };
  const { rating, title, body: text } = value as {
    rating?: unknown;
    title?: unknown;
    body?: unknown;
  };
  if (rating !== undefined) {
    if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return { ok: false as const, error: "Rating must be an integer from 1 to 5." };
    }
  }
  if (title !== undefined && (typeof title !== "string" || title.length > 120)) {
    return { ok: false as const, error: "Title must be a string up to 120 characters." };
  }
  if (text !== undefined && (typeof text !== "string" || text.length > 2000)) {
    return { ok: false as const, error: "Review text must be a string up to 2000 characters." };
  }
  return {
    ok: true as const,
    rating: typeof rating === "number" ? rating : undefined,
    title: typeof title === "string" && title.trim() ? title.trim() : undefined,
    body: typeof text === "string" && text.trim() ? text.trim() : undefined,
  };
}

async function checkEligibility(
  db: ReturnType<typeof getDb>,
  userId: string,
  isDemo: boolean,
  eventId: string,
  endAt: string,
): Promise<Response | null> {
  if (!isEventPast({ endAt })) {
    return forbidden("Reviews open after the event ends.");
  }
  if (isDemo) return null;
  if (db) {
    const rows = await db
      .select({ eventId: registrations.eventId })
      .from(registrations)
      .where(
        and(
          eq(registrations.userId, userId),
          eq(registrations.eventId, eventId),
        ),
      );
    if (!rows.length) {
      return forbidden("Register for this event before reviewing it.");
    }
    return null;
  }
  if (!findRegistration(userId, eventId)) {
    return forbidden("Register for this event before reviewing it.");
  }
  return null;
}

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await authenticate();
  if ("response" in auth) return auth.response;
  if (!checkRateLimit(`review:${auth.user.userId}`, 10)) return rateLimitedResponse();

  const event = getEventById(params.id);
  if (!event) return notFound("Event not found.");

  const db = getDb();
  const blocked = await checkEligibility(
    db,
    auth.user.userId,
    auth.user.isDemo,
    event.id,
    event.endAt,
  );
  if (blocked) return blocked;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const input = parseReviewInput(body.value);
  if (!input.ok) {
    return "error" in input && input.error
      ? validationError(input.error)
      : badRequest("Invalid review.");
  }
  if (input.rating === undefined) return validationError("Rating is required.");

  try {
    if (db) {
      const rows = await db
        .insert(reviews)
        .values({
          userId: auth.user.userId,
          eventId: event.id,
          collegeId: auth.user.collegeId,
          rating: input.rating,
          title: input.title ?? null,
          body: input.body ?? null,
        })
        .onConflictDoNothing()
        .returning();
      if (!rows.length) {
        return Response.json(
          { created: false, eventId: event.id, message: "You already reviewed this event." },
          { status: 200 },
        );
      }
      return Response.json({ created: true, eventId: event.id, review: rows[0] }, { status: 201 });
    }
    const { created, review } = addReview(auth.user.userId, event.id, {
      rating: input.rating,
      ...(input.title ? { title: input.title } : {}),
      ...(input.body ? { body: input.body } : {}),
    });
    return Response.json(
      { created, eventId: event.id, review },
      { status: created ? 201 : 200 },
    );
  } catch {
    return internalError();
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authenticate();
  if ("response" in auth) return auth.response;
  if (!checkRateLimit(`review:${auth.user.userId}`, 10)) return rateLimitedResponse();

  const event = getEventById(params.id);
  if (!event) return notFound("Event not found.");

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const input = parseReviewInput(body.value);
  if (!input.ok) {
    return "error" in input && input.error
      ? validationError(input.error)
      : badRequest("Invalid review.");
  }
  if (input.rating === undefined && input.title === undefined && input.body === undefined) {
    return validationError("No valid review fields.");
  }

  try {
    const db = getDb();
    if (db) {
      const rows = await db
        .update(reviews)
        .set({
          ...(input.rating !== undefined ? { rating: input.rating } : {}),
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.body !== undefined ? { body: input.body } : {}),
        })
        .where(
          and(
            eq(reviews.userId, auth.user.userId),
            eq(reviews.eventId, event.id),
          ),
        )
        .returning();
      if (!rows.length) return notFound("No review to update.");
      return Response.json({ updated: true, eventId: event.id, review: rows[0] });
    }
    const updated = updateReview(auth.user.userId, event.id, {
      ...(input.rating !== undefined ? { rating: input.rating } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.body !== undefined ? { body: input.body } : {}),
    });
    if (!updated) return notFound("No review to update.");
    return Response.json({ updated: true, eventId: event.id, review: updated });
  } catch {
    return internalError();
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await authenticate();
  if ("response" in auth) return auth.response;
  if (!checkRateLimit(`review:${auth.user.userId}`, 10)) return rateLimitedResponse();

  const event = getEventById(params.id);
  if (!event) return notFound("Event not found.");

  try {
    const db = getDb();
    if (db) {
      const rows = await db
        .delete(reviews)
        .where(
          and(
            eq(reviews.userId, auth.user.userId),
            eq(reviews.eventId, event.id),
          ),
        )
        .returning({ eventId: reviews.eventId });
      if (!rows.length) return notFound("No review to delete.");
      return Response.json({ deleted: true, eventId: event.id });
    }
    const removed = deleteReview(auth.user.userId, event.id);
    if (!removed) return notFound("No review to delete.");
    return Response.json({ deleted: true, eventId: event.id });
  } catch {
    return internalError();
  }
}
