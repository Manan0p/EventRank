/**
 * POST /api/events/:id/save — idempotent save.
 * DELETE /api/events/:id/save — remove save.
 *
 * Demo mode (no DATABASE_URL): persists to the in-memory
 * InMemoryPersistenceStore via lib/persistence.ts. Neon mode: writes the
 * saved_events row (unique user/event). 401 without a session unless OAuth
 * is unconfigured, in which case the explicit demo session applies.
 */

import { NextRequest } from "next/server";

import { getEventById } from "@/lib/events";
import { getDb } from "@/lib/db";
import { savedEvents } from "@/lib/db/schema";
import { getPersistenceStore } from "@/lib/persistence";
import { and, eq } from "drizzle-orm";

import { authenticate } from "../../../_lib/session";
import { checkRateLimit, rateLimitedResponse } from "../../../_lib/rate-limit";
import { internalError, notFound } from "../../../_lib/http";

type Params = { params: { id: string } };

export async function POST(_request: NextRequest, { params }: Params) {
  const auth = await authenticate();
  if ("response" in auth) return auth.response;
  if (!checkRateLimit(`save:${auth.user.userId}`)) return rateLimitedResponse();

  const event = getEventById(params.id);
  if (!event) return notFound("Event not found.");

  try {
    const db = getDb();
    if (db) {
      await db
        .insert(savedEvents)
        .values({
          userId: auth.user.userId,
          eventId: event.id,
          collegeId: auth.user.collegeId,
        })
        .onConflictDoNothing();
    } else {
      getPersistenceStore().setSavedEvent(auth.user.userId, event.id, true);
    }
    return Response.json({ saved: true, eventId: event.id });
  } catch {
    return internalError();
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await authenticate();
  if ("response" in auth) return auth.response;
  if (!checkRateLimit(`save:${auth.user.userId}`)) return rateLimitedResponse();

  const event = getEventById(params.id);
  if (!event) return notFound("Event not found.");

  try {
    const db = getDb();
    if (db) {
      await db
        .delete(savedEvents)
        .where(
          and(
            eq(savedEvents.userId, auth.user.userId),
            eq(savedEvents.eventId, event.id),
          ),
        );
    } else {
      getPersistenceStore().setSavedEvent(auth.user.userId, event.id, false);
    }
    return Response.json({ saved: false, eventId: event.id });
  } catch {
    return internalError();
  }
}
