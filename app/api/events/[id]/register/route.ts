/**
 * POST /api/events/:id/register — internal RSVP (idempotent).
 *
 * Blocks past events (403 "Event completed"). Full events register with
 * status "waitlisted" instead of "registered". Demo mode persists to the
 * process-local demo store; Neon mode writes the registrations row.
 */

import { NextRequest } from "next/server";

import { getEventById, isEventPast } from "@/lib/events";
import { getDb } from "@/lib/db";
import { registrations } from "@/lib/db/schema";

import { authenticate } from "../../../_lib/session";
import { addRegistration } from "../../../_lib/demo-store";
import { checkRateLimit, rateLimitedResponse } from "../../../_lib/rate-limit";
import { forbidden, internalError, notFound } from "../../../_lib/http";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await authenticate();
  if ("response" in auth) return auth.response;
  if (!checkRateLimit(`register:${auth.user.userId}`)) return rateLimitedResponse();

  const event = getEventById(params.id);
  if (!event) return notFound("Event not found.");
  if (isEventPast({ endAt: event.endAt })) {
    return forbidden("Event completed. Registration is closed.");
  }

  const status = event.status === "full" ? "waitlisted" : "registered";

  try {
    const db = getDb();
    if (db) {
      await db
        .insert(registrations)
        .values({
          userId: auth.user.userId,
          eventId: event.id,
          collegeId: auth.user.collegeId,
          status,
        })
        .onConflictDoNothing();
      return Response.json({
        registered: true,
        status,
        eventId: event.id,
        created: true,
      });
    }
    const { created, registration } = addRegistration(auth.user.userId, event.id, status);
    return Response.json({
      registered: true,
      status,
      eventId: event.id,
      created,
      registration,
    });
  } catch {
    return internalError();
  }
}
