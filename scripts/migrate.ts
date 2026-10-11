/**
 * EventRank database migration (Neon Postgres).
 *
 * Creates all tables in lib/db/schema.ts using idempotent
 * `CREATE TABLE IF NOT EXISTS` statements via the Neon serverless client.
 * No drizzle-kit required.
 *
 * Run (from repo root, with DATABASE_URL set):
 *   ./node_modules/.bin/tsc scripts/migrate.ts --outDir .seed-build \
 *     --module commonjs --target ES2020 --moduleResolution node \
 *     --esModuleInterop --skipLibCheck
 *   node .seed-build/scripts/migrate.js
 *   rm -rf .seed-build
 *
 * Safe to rerun: every statement is IF NOT EXISTS. Never run against a
 * database you do not own; this script only creates, never drops.
 */

import { neon } from "@neondatabase/serverless";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS colleges (
    id text PRIMARY KEY,
    slug text NOT NULL UNIQUE,
    name text NOT NULL,
    domain text
  )`,
  `CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    college_id text NOT NULL REFERENCES colleges(id),
    email text,
    name text,
    role text NOT NULL DEFAULT 'student'
  )`,
  `CREATE TABLE IF NOT EXISTS organizations (
    id text PRIMARY KEY,
    college_id text NOT NULL REFERENCES colleges(id),
    name text NOT NULL,
    CONSTRAINT organizations_college_name_unique UNIQUE (college_id, name)
  )`,
  `CREATE TABLE IF NOT EXISTS events (
    id text PRIMARY KEY,
    college_id text NOT NULL REFERENCES colleges(id),
    slug text NOT NULL,
    organization_id text REFERENCES organizations(id),
    title text NOT NULL,
    category text NOT NULL,
    organizer text NOT NULL,
    summary text NOT NULL,
    description text NOT NULL,
    start_at timestamptz NOT NULL,
    end_at timestamptz NOT NULL,
    date_label text NOT NULL,
    time_label text NOT NULL,
    location text NOT NULL,
    format text NOT NULL,
    price_label text NOT NULL,
    audience text NOT NULL,
    tags text[] NOT NULL,
    rating real NOT NULL DEFAULT 0,
    review_count integer NOT NULL DEFAULT 0,
    capacity_status text NOT NULL,
    featured boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'published',
    CONSTRAINT events_college_slug_unique UNIQUE (college_id, slug)
  )`,
  `CREATE INDEX IF NOT EXISTS events_college_status_start_idx
    ON events (college_id, status, start_at)`,
  // Full-text search index (documented in schema.ts; provisioned here).
  `CREATE INDEX IF NOT EXISTS events_search_gin_idx ON events
    USING gin (to_tsvector('english', title || ' ' || summary || ' ' || description || ' ' || array_to_string(tags, ' ')))`,
  `CREATE TABLE IF NOT EXISTS user_preferences (
    user_id text PRIMARY KEY REFERENCES users(id),
    college_id text NOT NULL REFERENCES colleges(id),
    interests text[] NOT NULL,
    categories text[] NOT NULL,
    availability text[] NOT NULL,
    formats text[] NOT NULL,
    cost text NOT NULL DEFAULT 'any',
    personalization_enabled boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS saved_events (
    id serial PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id),
    event_id text NOT NULL REFERENCES events(id),
    college_id text NOT NULL REFERENCES colleges(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT saved_events_user_event_unique UNIQUE (user_id, event_id)
  )`,
  `CREATE INDEX IF NOT EXISTS saved_events_user_idx ON saved_events (user_id)`,
  `CREATE TABLE IF NOT EXISTS registrations (
    id serial PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id),
    event_id text NOT NULL REFERENCES events(id),
    college_id text NOT NULL REFERENCES colleges(id),
    status text NOT NULL DEFAULT 'registered',
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT registrations_user_event_unique UNIQUE (user_id, event_id)
  )`,
  `CREATE INDEX IF NOT EXISTS registrations_user_idx ON registrations (user_id)`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id serial PRIMARY KEY,
    user_id text NOT NULL REFERENCES users(id),
    event_id text NOT NULL REFERENCES events(id),
    college_id text NOT NULL REFERENCES colleges(id),
    rating integer NOT NULL,
    title text,
    body text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT reviews_user_event_unique UNIQUE (user_id, event_id)
  )`,
  `CREATE INDEX IF NOT EXISTS reviews_event_idx ON reviews (event_id)`,
  `CREATE TABLE IF NOT EXISTS reports (
    id serial PRIMARY KEY,
    college_id text NOT NULL REFERENCES colleges(id),
    event_id text REFERENCES events(id),
    reporter_user_id text REFERENCES users(id),
    reason text NOT NULL,
    details text,
    status text NOT NULL DEFAULT 'open',
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS event_interactions (
    id serial PRIMARY KEY,
    college_id text NOT NULL REFERENCES colleges(id),
    user_id text NOT NULL REFERENCES users(id),
    event_id text NOT NULL REFERENCES events(id),
    kind text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS event_interactions_event_kind_idx
    ON event_interactions (event_id, kind)`,
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Migration aborted.");
    process.exit(1);
  }
  const sql = neon(url);
  for (const [index, statement] of STATEMENTS.entries()) {
    await sql(statement);
    console.log(`ok ${index + 1}/${STATEMENTS.length}`);
  }
  console.log("Migration complete.");
}

main().catch((error) => {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
