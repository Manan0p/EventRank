/**
 * POST /api/reports — report an event or review for moderation.
 *
 * Body: { eventId?: string, reviewId?: string, reason: string, details?: string }.
 * Reason must be one of: inaccurate-info | inappropriate | spam | other.
 * Exactly one of eventId/reviewId is required. Auth via `authenticate()`,
 * rate-limited, writes the `reports` table in Neon mode and logs + 201 in
 * demo mode (in-memory array in demo-store.ts).
 */

import { NextRequest } from "next/server";

import { getDb } from "@/lib/db";
import { reports } from "@/lib/db/schema";

import { authenticate } from "../_lib/session";
import { addReport } from "../_lib/demo-store";
import { checkRateLimit, rateLimitedResponse } from "../_lib/rate-limit";
import {
  badRequest,
  internalError,
  isPlainObject,
  readJsonBody,
  validationError,
} from "../_lib/http";

const REPORT_REASONS = new Set([
  "inaccurate-info",
  "inappropriate",
  "spam",
  "other",
]);

export async function POST(request: NextRequest) {
  const auth = await authenticate();
  if ("response" in auth) return auth.response;
  if (!checkRateLimit(`report:${auth.user.userId}`, 10)) return rateLimitedResponse();

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (!isPlainObject(body.value)) return badRequest("Invalid report.");

  const { eventId, reviewId, reason, details } = body.value as {
    eventId?: unknown;
    reviewId?: unknown;
    reason?: unknown;
    details?: unknown;
  };

  const targetEventId =
    typeof eventId === "string" && eventId.trim() ? eventId.trim().slice(0, 200) : null;
  const targetReviewId =
    typeof reviewId === "string" && reviewId.trim() ? reviewId.trim().slice(0, 200) : null;
  if ((targetEventId ? 1 : 0) + (targetReviewId ? 1 : 0) !== 1) {
    return validationError("Provide exactly one of eventId or reviewId.");
  }
  if (typeof reason !== "string" || !REPORT_REASONS.has(reason)) {
    return validationError(
      "Reason must be one of: inaccurate-info, inappropriate, spam, other.",
    );
  }
  if (details !== undefined && (typeof details !== "string" || details.length > 2000)) {
    return validationError("Details must be a string up to 2000 characters.");
  }
  const trimmedDetails =
    typeof details === "string" && details.trim() ? details.trim() : undefined;

  try {
    const db = getDb();
    if (db) {
      const rows = await db
        .insert(reports)
        .values({
          collegeId: auth.user.collegeId,
          eventId: targetEventId,
          reporterUserId: auth.user.userId,
          reason,
          details: trimmedDetails ?? null,
        })
        .returning();
      return Response.json({ created: true, report: rows[0] }, { status: 201 });
    }
    const report = addReport(auth.user.userId, {
      ...(targetEventId ? { eventId: targetEventId } : {}),
      ...(targetReviewId ? { reviewId: targetReviewId } : {}),
      reason,
      ...(trimmedDetails ? { details: trimmedDetails } : {}),
    });
    return Response.json({ created: true, report }, { status: 201 });
  } catch {
    return internalError();
  }
}
