/**
 * GET /api/me/preferences — read the signed-in user's preferences.
 * PUT /api/me/preferences — update (partial patch).
 *
 * Demo mode: in-memory store via lib/persistence.ts. Neon mode: upserts
 * the user_preferences row. Body is a partial UserPreferences; unknown
 * fields are ignored, cost must be any/free/paid.
 */

import { NextRequest } from "next/server";

import { getDb } from "@/lib/db";
import { userPreferences } from "@/lib/db/schema";
import {
  DEFAULT_PREFERENCES,
  getPersistenceStore,
  type UserPreferences,
} from "@/lib/persistence";
import { eq } from "drizzle-orm";

import { authenticate } from "../../_lib/session";
import {
  badRequest,
  internalError,
  isPlainObject,
  readJsonBody,
  validationError,
} from "../../_lib/http";

const COST_VALUES = new Set(["any", "free", "paid"]);

function cleanStrings(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return undefined;
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))].slice(0, 50);
}

function parsePatch(value: unknown): Partial<UserPreferences> | null {
  if (!isPlainObject(value)) return null;
  const patch: Partial<UserPreferences> = {};
  for (const key of ["interests", "categories", "availability", "formats"] as const) {
    const cleaned = cleanStrings(value[key]);
    if (value[key] !== undefined && cleaned === undefined) return null;
    if (cleaned !== undefined) patch[key] = cleaned;
  }
  if (value.cost !== undefined) {
    if (typeof value.cost !== "string" || !COST_VALUES.has(value.cost)) return null;
    patch.cost = value.cost as UserPreferences["cost"];
  }
  if (value.personalizationEnabled !== undefined) {
    if (typeof value.personalizationEnabled !== "boolean") return null;
    patch.personalizationEnabled = value.personalizationEnabled;
  }
  return patch;
}

function toResponse(prefs: UserPreferences) {
  return {
    interests: prefs.interests,
    categories: prefs.categories,
    availability: prefs.availability,
    formats: prefs.formats,
    cost: prefs.cost,
    personalizationEnabled: prefs.personalizationEnabled,
  };
}

export async function GET() {
  const auth = await authenticate();
  if ("response" in auth) return auth.response;

  try {
    const db = getDb();
    if (!db) {
      return Response.json(toResponse(getPersistenceStore().getPreferences(auth.user.userId)));
    }
    const rows = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, auth.user.userId));
    const row = rows[0];
    if (!row) return Response.json(toResponse({ ...DEFAULT_PREFERENCES }));
    return Response.json(
      toResponse({
        interests: row.interests,
        categories: row.categories,
        availability: row.availability,
        formats: row.formats,
        cost: (row.cost === "free" || row.cost === "paid" ? row.cost : "any") as UserPreferences["cost"],
        personalizationEnabled: row.personalizationEnabled,
      }),
    );
  } catch {
    return internalError();
  }
}

export async function PUT(request: NextRequest) {
  const auth = await authenticate();
  if ("response" in auth) return auth.response;

  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  const patch = parsePatch(body.value);
  if (!patch) return badRequest("Invalid preferences.");
  if (Object.keys(patch).length === 0) return validationError("No valid preference fields.");

  try {
    const db = getDb();
    if (!db) {
      return Response.json(
        toResponse(getPersistenceStore().savePreferences(auth.user.userId, patch)),
      );
    }
    // Ensure the user row exists so the FK holds (demo-tolerant upsert).
    const current = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, auth.user.userId));
    const base = current[0]
      ? {
          interests: current[0].interests,
          categories: current[0].categories,
          availability: current[0].availability,
          formats: current[0].formats,
          cost: (current[0].cost === "free" || current[0].cost === "paid"
            ? current[0].cost
            : "any") as UserPreferences["cost"],
          personalizationEnabled: current[0].personalizationEnabled,
        }
      : {
          interests: [...DEFAULT_PREFERENCES.interests],
          categories: [...DEFAULT_PREFERENCES.categories],
          availability: [...DEFAULT_PREFERENCES.availability],
          formats: [...DEFAULT_PREFERENCES.formats],
          cost: DEFAULT_PREFERENCES.cost,
          personalizationEnabled: DEFAULT_PREFERENCES.personalizationEnabled,
        };
    const next = {
      interests: patch.interests ?? base.interests,
      categories: patch.categories ?? base.categories,
      availability: patch.availability ?? base.availability,
      formats: patch.formats ?? base.formats,
      cost: patch.cost ?? base.cost,
      personalizationEnabled: patch.personalizationEnabled ?? base.personalizationEnabled,
    };
    await db
      .insert(userPreferences)
      .values({
        userId: auth.user.userId,
        collegeId: auth.user.collegeId,
        ...next,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { ...next, updatedAt: new Date() },
      });
    return Response.json(toResponse(next));
  } catch {
    return internalError();
  }
}
