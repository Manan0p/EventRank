/**
 * EventRank seed script (Neon Postgres, idempotent).
 *
 * Upserts the Northbridge college, organizations (deduped from seed
 * organizer strings), and all events from data/seed-events.ts using the
 * seed id as the deterministic stable key. Safe to rerun: every write is
 * ON CONFLICT DO UPDATE, so reruns converge instead of duplicating.
 *
 * Run AFTER scripts/migrate.ts, from repo root with DATABASE_URL set:
 *   ./node_modules/.bin/tsc scripts/seed.ts data/seed-events.ts \
 *     --outDir .seed-build --module commonjs --target ES2020 \
 *     --moduleResolution node --esModuleInterop --skipLibCheck
 *   node .seed-build/scripts/seed.js
 *   rm -rf .seed-build
 *
 * Validates required fields before writing; aborts with a non-zero exit
 * and a record count if any seed record is incomplete.
 */

import { neon } from "@neondatabase/serverless";

import { seedEvents } from "../data/seed-events";

const COLLEGE_ID = "northbridge-university";

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function orgIdFor(name: string): string {
  return `org-${slugify(name).slice(0, 100) || "unknown"}`;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Seed aborted.");
    process.exit(1);
  }

  // Validate required fields before touching the database.
  const required = [
    "id",
    "title",
    "category",
    "organizer",
    "summary",
    "description",
    "startAt",
    "endAt",
    "location",
    "format",
    "priceLabel",
    "audience",
  ] as const;
  seedEvents.forEach((event, index) => {
    for (const field of required) {
      const value = event[field];
      if (typeof value !== "string" || !value.trim()) {
        console.error(
          `Seed record ${index} (${event.id ?? "no id"}) is missing required field: ${field}`,
        );
        process.exit(1);
      }
    }
    if (Number.isNaN(Date.parse(event.startAt)) || Number.isNaN(Date.parse(event.endAt))) {
      console.error(`Seed record ${event.id} has an invalid date.`);
      process.exit(1);
    }
  });

  const sql = neon(url);

  await sql`
    INSERT INTO colleges (id, slug, name, domain)
    VALUES (${COLLEGE_ID}, ${COLLEGE_ID}, 'Northbridge University', 'northbridge.edu')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, domain = EXCLUDED.domain
  `;
  console.log("college ok");

  const organizers = [...new Set(seedEvents.map((event) => event.organizer.trim()))];
  for (const name of organizers) {
    await sql`
      INSERT INTO organizations (id, college_id, name)
      VALUES (${orgIdFor(name)}, ${COLLEGE_ID}, ${name})
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    `;
  }
  console.log(`organizations ok (${organizers.length})`);

  let count = 0;
  for (const event of seedEvents) {
    await sql`
      INSERT INTO events (
        id, college_id, slug, organization_id, title, category, organizer,
        summary, description, start_at, end_at, date_label, time_label,
        location, format, price_label, audience, tags, rating, review_count,
        capacity_status, featured, status
      ) VALUES (
        ${event.id}, ${COLLEGE_ID}, ${event.id}, ${orgIdFor(event.organizer.trim())},
        ${event.title}, ${event.category}, ${event.organizer}, ${event.summary},
        ${event.description}, ${event.startAt}, ${event.endAt}, ${event.dateLabel},
        ${event.timeLabel}, ${event.location}, ${event.format}, ${event.priceLabel},
        ${event.audience}, ${event.tags}, ${event.rating}, ${event.reviewCount},
        ${event.capacityStatus}, ${event.featured}, ${event.status ?? "published"}
      )
      ON CONFLICT (id) DO UPDATE SET
        slug = EXCLUDED.slug, organization_id = EXCLUDED.organization_id,
        title = EXCLUDED.title, category = EXCLUDED.category,
        organizer = EXCLUDED.organizer, summary = EXCLUDED.summary,
        description = EXCLUDED.description, start_at = EXCLUDED.start_at,
        end_at = EXCLUDED.end_at, date_label = EXCLUDED.date_label,
        time_label = EXCLUDED.time_label, location = EXCLUDED.location,
        format = EXCLUDED.format, price_label = EXCLUDED.price_label,
        audience = EXCLUDED.audience, tags = EXCLUDED.tags,
        rating = EXCLUDED.rating, review_count = EXCLUDED.review_count,
        capacity_status = EXCLUDED.capacity_status, featured = EXCLUDED.featured,
        status = EXCLUDED.status
    `;
    count += 1;
  }
  console.log(`events ok (${count})`);
  console.log("Seed complete.");
}

main().catch((error) => {
  console.error("Seed failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
