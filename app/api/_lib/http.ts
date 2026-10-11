/** Shared JSON response + error envelope for EventRank API routes. */

export type ApiErrorCode =
  | "bad_request"
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "validation_error"
  | "rate_limited"
  | "internal_error";

export function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
) {
  return Response.json({ error: { code, message } }, { status });
}

export function badRequest(message: string) {
  return errorResponse(400, "bad_request", message);
}

export function unauthenticated(
  message = "Sign in to continue.",
) {
  return errorResponse(401, "unauthenticated", message);
}

export function forbidden(message = "Not authorized for this college.") {
  return errorResponse(403, "forbidden", message);
}

export function notFound(message = "Not found.") {
  return errorResponse(404, "not_found", message);
}

export function validationError(message: string) {
  return errorResponse(422, "validation_error", message);
}

export function internalError() {
  return errorResponse(500, "internal_error", "Something went wrong.");
}

/** Parse a request body as JSON; malformed payloads become a 400, not a 500. */
export async function readJsonBody(request: Request) {
  let value: unknown = null;
  try {
    const text = await request.text();
    value = text.trim() ? (JSON.parse(text) as unknown) : {};
  } catch {
    return { ok: false as const, response: badRequest("Malformed JSON body.") };
  }
  return { ok: true as const, value };
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseLimitOffset(searchParams: URLSearchParams) {
  const rawLimit = searchParams.get("limit");
  const rawOffset = searchParams.get("offset");
  let limit = 20;
  let offset = 0;

  if (rawLimit !== null) {
    if (!/^\d+$/.test(rawLimit.trim())) {
      return { ok: false as const, response: badRequest("Invalid limit.") };
    }
    limit = Number(rawLimit);
    if (limit < 1 || limit > 100) {
      return { ok: false as const, response: badRequest("Invalid limit.") };
    }
  }

  if (rawOffset !== null) {
    if (!/^\d+$/.test(rawOffset.trim())) {
      return { ok: false as const, response: badRequest("Invalid offset.") };
    }
    offset = Number(rawOffset);
  }

  return { ok: true as const, limit, offset };
}

export function parseTriStateBoolean(
  raw: string | null,
  fieldName: string,
) {
  if (raw === null || raw === "") return { ok: true as const, value: undefined };
  const normalized = raw.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") {
    return { ok: true as const, value: true as const };
  }
  if (normalized === "false" || normalized === "0") {
    return { ok: true as const, value: false as const };
  }
  return {
    ok: false as const,
    response: badRequest(`Invalid ${fieldName}.`),
  };
}

export function parseDateParam(raw: string | null, fieldName: string) {
  if (raw === null || raw.trim() === "") {
    return { ok: true as const, value: undefined };
  }
  const time = Date.parse(raw.trim());
  if (Number.isNaN(time)) {
    return {
      ok: false as const,
      response: badRequest(`Invalid ${fieldName}.`),
    };
  }
  return { ok: true as const, value: raw.trim() };
}

export function parseShortString(raw: string | null) {
  if (raw === null || raw.trim() === "") return undefined;
  const value = raw.trim();
  if (value.length > 200) return undefined;
  return value;
}
