/**
 * EventRank Neon Postgres schema (Drizzle ORM, pg-core).
 *
 * Every tenant-scoped table carries `college_id` so all queries can be scoped
 * to a single college. Score data (`score`, `scoreReasons`) is intentionally
 * NOT stored: route handlers recompute it with `rankEvent` from lib/events.ts.
 *
 * Future search indexes (documented, not yet provisioned):
 * -- Full-text search over the catalog copy:
 * -- CREATE INDEX events_search_gin_idx ON events
 * --   USING gin (to_tsvector('english', title || ' ' || summary || ' ' || description || ' ' || array_to_string(tags, ' ')));
 * -- Semantic search via a future pgvector/FastAPI adapter:
 * -- CREATE EXTENSION IF NOT EXISTS vector;
 * -- ALTER TABLE events ADD COLUMN embedding vector(1536);
 * -- CREATE INDEX events_embedding_hnsw_idx ON events USING hnsw (embedding vector_cosine_ops);
 */

import {
  boolean,
  index,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

export const colleges = pgTable("colleges", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  domain: text("domain"),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  collegeId: text("college_id")
    .notNull()
    .references(() => colleges.id),
  email: text("email"),
  name: text("name"),
  role: text("role").notNull().default("student"),
});

export const organizations = pgTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    collegeId: text("college_id")
      .notNull()
      .references(() => colleges.id),
    name: text("name").notNull(),
  },
  (table) => [
    unique("organizations_college_name_unique").on(
      table.collegeId,
      table.name,
    ),
  ],
);

export const events = pgTable(
  "events",
  {
    /** Deterministic id (= the seed record id), stable across seed reruns. */
    id: text("id").primaryKey(),
    collegeId: text("college_id")
      .notNull()
      .references(() => colleges.id),
    slug: text("slug").notNull(),
    organizationId: text("organization_id").references(
      () => organizations.id,
    ),
    title: text("title").notNull(),
    category: text("category").notNull(),
    organizer: text("organizer").notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    startAt: timestamp("start_at", { withTimezone: true, mode: "date" })
      .notNull(),
    endAt: timestamp("end_at", { withTimezone: true, mode: "date" }).notNull(),
    dateLabel: text("date_label").notNull(),
    timeLabel: text("time_label").notNull(),
    location: text("location").notNull(),
    format: text("format").notNull(),
    priceLabel: text("price_label").notNull(),
    audience: text("audience").notNull(),
    tags: text("tags").array().notNull(),
    rating: real("rating").notNull().default(0),
    reviewCount: integer("review_count").notNull().default(0),
    capacityStatus: text("capacity_status").notNull(),
    featured: boolean("featured").notNull().default(false),
    status: text("status").notNull().default("published"),
  },
  (table) => [
    unique("events_college_slug_unique").on(table.collegeId, table.slug),
    index("events_college_status_start_idx").on(
      table.collegeId,
      table.status,
      table.startAt,
    ),
  ],
);

export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id),
  collegeId: text("college_id")
    .notNull()
    .references(() => colleges.id),
  interests: text("interests").array().notNull(),
  categories: text("categories").array().notNull(),
  availability: text("availability").array().notNull(),
  formats: text("formats").array().notNull(),
  cost: text("cost").notNull().default("any"),
  personalizationEnabled: boolean("personalization_enabled")
    .notNull()
    .default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const savedEvents = pgTable(
  "saved_events",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id),
    collegeId: text("college_id")
      .notNull()
      .references(() => colleges.id),
    createdAt: createdAt(),
  },
  (table) => [
    unique("saved_events_user_event_unique").on(table.userId, table.eventId),
    index("saved_events_user_idx").on(table.userId),
  ],
);

export const registrations = pgTable(
  "registrations",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id),
    collegeId: text("college_id")
      .notNull()
      .references(() => colleges.id),
    status: text("status").notNull().default("registered"),
    createdAt: createdAt(),
  },
  (table) => [
    unique("registrations_user_event_unique").on(table.userId, table.eventId),
    index("registrations_user_idx").on(table.userId),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id),
    collegeId: text("college_id")
      .notNull()
      .references(() => colleges.id),
    rating: integer("rating").notNull(),
    title: text("title"),
    body: text("body"),
    createdAt: createdAt(),
  },
  (table) => [
    unique("reviews_user_event_unique").on(table.userId, table.eventId),
    index("reviews_event_idx").on(table.eventId),
  ],
);

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  collegeId: text("college_id")
    .notNull()
    .references(() => colleges.id),
  eventId: text("event_id").references(() => events.id),
  reporterUserId: text("reporter_user_id").references(() => users.id),
  reason: text("reason").notNull(),
  details: text("details"),
  status: text("status").notNull().default("open"),
  createdAt: createdAt(),
});

export const eventInteractions = pgTable(
  "event_interactions",
  {
    id: serial("id").primaryKey(),
    collegeId: text("college_id")
      .notNull()
      .references(() => colleges.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id),
    kind: text("kind").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("event_interactions_event_kind_idx").on(table.eventId, table.kind),
  ],
);

export type CollegeRow = typeof colleges.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type OrganizationRow = typeof organizations.$inferSelect;
export type EventRow = typeof events.$inferSelect;
export type UserPreferencesRow = typeof userPreferences.$inferSelect;
export type SavedEventRow = typeof savedEvents.$inferSelect;
export type RegistrationRow = typeof registrations.$inferSelect;
export type ReviewRow = typeof reviews.$inferSelect;
export type ReportRow = typeof reports.$inferSelect;
export type EventInteractionRow = typeof eventInteractions.$inferSelect;
