/**
 * GET /api/events/:id — single event + score reasons; 404 when unknown.
 *
 * Stored reviews feed back into the community signal: rating/reviewCount
 * are recomputed from the reviews table (Neon) or demo store (demo mode),
 * then rankEvent re-runs so score + scoreReasons reflect real feedback.
 * Canceled/full/completed records ARE returned with their status visible;
 * only unknown ids 404.
 */

import { NextRequest } from "next/server";

import {
  EVENT_RANK_VERSION,
  getEventById,
  rankEvent,
  type Event,
} from "@/lib/events";
import { getDb } from "@/lib/db";
import { reviews } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { findReviewsForEvent } from "../../_lib/demo-store";
import { internalError, notFound } from "../../_lib/http";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const event = getEventById(params.id);
  if (!event) {
    return notFound("Event not found.");
  }

  try {
    const db = getDb();
    let ratings: number[] = [];
    if (db) {
      const rows = await db
        .select({ rating: reviews.rating })
        .from(reviews)
        .where(eq(reviews.eventId, event.id));
      ratings = rows.map((row) => row.rating);
    } else {
      ratings = findReviewsForEvent(event.id).map((review) => review.rating);
    }

    let shaped: Event = event;
    if (ratings.length) {
      const reviewCount = event.reviewCount + ratings.length;
      const rating =
        (event.rating * event.reviewCount +
          ratings.reduce((sum, value) => sum + value, 0)) /
        reviewCount;
      const withFeedback: Event = {
        ...event,
        rating: Math.round(rating * 10) / 10,
        reviewCount,
      };
      const ranked = rankEvent(withFeedback);
      shaped = { ...withFeedback, score: ranked.score, scoreReasons: ranked.reasons };
    }

    return Response.json({
      event: {
        ...shaped,
        rank_version: EVENT_RANK_VERSION,
      },
      rank_version: EVENT_RANK_VERSION,
    });
  } catch {
    return internalError();
  }
}
