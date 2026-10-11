/** Best-effort in-memory rate limiter for write routes (per-process). */

import { errorResponse } from "./http";

const buckets = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter(
    (timestamp) => now - timestamp < windowMs,
  );
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  return true;
}

export function rateLimitedResponse() {
  return errorResponse(
    429,
    "rate_limited",
    "Too many requests. Please try again shortly.",
  );
}
