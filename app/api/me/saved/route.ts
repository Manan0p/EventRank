/**
 * GET /api/me/saved — saved + registered event ids for the signed-in user.
 *
 * Demo mode: reads the in-memory PersistenceStore + demo registrations.
 * Neon mode: reads saved_events + registrations for this user/college.
 */

import { getDb } from "@/lib/db";
import { registrations, savedEvents } from "@/lib/db/schema";
import { getPersistenceStore } from "@/lib/persistence";
import { and, eq } from "drizzle-orm";

import { authenticate } from "../../_lib/session";
import { internalError } from "../../_lib/http";

export async function GET() {
  const auth = await authenticate();
  if ("response" in auth) return auth.response;

  try {
    const db = getDb();
    if (!db) {
      return Response.json({
        savedEventIds: getPersistenceStore().getSavedEventIds(auth.user.userId),
        registeredEventIds: [],
      });
    }
    const [saved, registered] = await Promise.all([
      db
        .select({ eventId: savedEvents.eventId })
        .from(savedEvents)
        .where(
          and(
            eq(savedEvents.userId, auth.user.userId),
            eq(savedEvents.collegeId, auth.user.collegeId),
          ),
        ),
      db
        .select({ eventId: registrations.eventId })
        .from(registrations)
        .where(
          and(
            eq(registrations.userId, auth.user.userId),
            eq(registrations.collegeId, auth.user.collegeId),
          ),
        ),
    ]);
    return Response.json({
      savedEventIds: saved.map((row) => row.eventId),
      registeredEventIds: registered.map((row) => row.eventId),
    });
  } catch {
    return internalError();
  }
}
