import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { appConfig } from "./config";

/** Create the typed Drizzle client lazily; this function never runs without a URL. */
const createDatabase = (url: string) => drizzle(neon(url));

export type EventRankDatabase = ReturnType<typeof createDatabase>;

let cachedDatabase: EventRankDatabase | null = null;

/**
 * Return the Neon/Drizzle client when DATABASE_URL is configured.
 *
 * No socket or query is opened by importing this module. In demo mode this
 * returns null, allowing server components and the seeded UI to load without a
 * database. The schema/migration layer can be added without changing callers.
 */
export function getDb(): EventRankDatabase | null {
  const url = appConfig.database.url;
  if (!url) return null;

  cachedDatabase ??= createDatabase(url);
  return cachedDatabase;
}

/** Optional client for callers that can use the demo fallback when null. */
export const db = getDb();

export function hasDb() {
  return getDb() !== null;
}

/** Fail explicitly only when a production-only operation is requested. */
export function requireDb(): EventRankDatabase {
  const database = getDb();
  if (!database) {
    throw new Error(
      "DATABASE_URL is not configured. EventRank is running with demo persistence.",
    );
  }
  return database;
}
