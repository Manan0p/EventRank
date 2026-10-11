import { appConfig } from "./config";

export type PreferenceCost = "any" | "free" | "paid";

export type UserPreferences = {
  interests: string[];
  categories: string[];
  availability: string[];
  formats: string[];
  cost: PreferenceCost;
  personalizationEnabled: boolean;
};

export const DEFAULT_PREFERENCES: Readonly<UserPreferences> = Object.freeze({
  interests: [],
  categories: [],
  availability: [],
  formats: [],
  cost: "any" as const,
  personalizationEnabled: true,
});

export interface PersistenceStore {
  getSavedEventIds(userId: string): string[];
  isEventSaved(userId: string, eventId: string): boolean;
  setSavedEvent(userId: string, eventId: string, saved: boolean): string[];
  getPreferences(userId: string): UserPreferences;
  savePreferences(userId: string, patch: Partial<UserPreferences>): UserPreferences;
}

function normalizeKey(value: string, fallback: string) {
  const normalized = value.trim();
  return normalized || fallback;
}

function uniqueStrings(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function clonePreferences(preferences: UserPreferences): UserPreferences {
  return {
    interests: [...preferences.interests],
    categories: [...preferences.categories],
    availability: [...preferences.availability],
    formats: [...preferences.formats],
    cost: preferences.cost,
    personalizationEnabled: preferences.personalizationEnabled,
  };
}

/**
 * Small process-local fallback used by the demo and by development without
 * Neon. It deliberately scopes both maps by user ID so API routes can adopt
 * the same ownership boundary before switching storage providers.
 */
export class InMemoryPersistenceStore implements PersistenceStore {
  private readonly savedEvents = new Map<string, Set<string>>();

  private readonly preferences = new Map<string, UserPreferences>();

  getSavedEventIds(userId: string) {
    const key = normalizeKey(userId, "demo-student");
    return [...(this.savedEvents.get(key) ?? new Set<string>())];
  }

  isEventSaved(userId: string, eventId: string) {
    const key = normalizeKey(userId, "demo-student");
    const eventKey = normalizeKey(eventId, "unknown-event");
    return this.savedEvents.get(key)?.has(eventKey) ?? false;
  }

  setSavedEvent(userId: string, eventId: string, saved: boolean) {
    const key = normalizeKey(userId, "demo-student");
    const eventKey = normalizeKey(eventId, "unknown-event");
    const events = this.savedEvents.get(key) ?? new Set<string>();

    if (saved) events.add(eventKey);
    else events.delete(eventKey);

    if (events.size) this.savedEvents.set(key, events);
    else this.savedEvents.delete(key);
    return this.getSavedEventIds(key);
  }

  getPreferences(userId: string) {
    const key = normalizeKey(userId, "demo-student");
    return clonePreferences(this.preferences.get(key) ?? DEFAULT_PREFERENCES);
  }

  savePreferences(userId: string, patch: Partial<UserPreferences>) {
    const key = normalizeKey(userId, "demo-student");
    const current = this.getPreferences(key);
    const next: UserPreferences = {
      interests:
        patch.interests === undefined
          ? current.interests
          : uniqueStrings(patch.interests),
      categories:
        patch.categories === undefined
          ? current.categories
          : uniqueStrings(patch.categories),
      availability:
        patch.availability === undefined
          ? current.availability
          : uniqueStrings(patch.availability),
      formats:
        patch.formats === undefined ? current.formats : uniqueStrings(patch.formats),
      cost: patch.cost ?? current.cost,
      personalizationEnabled:
        patch.personalizationEnabled ?? current.personalizationEnabled,
    };

    this.preferences.set(key, next);
    return clonePreferences(next);
  }

  /** Clear only this in-memory store; useful for tests and demo reset actions. */
  reset() {
    this.savedEvents.clear();
    this.preferences.clear();
  }
}

export const demoPersistence = new InMemoryPersistenceStore();

/**
 * Neon readiness is reported separately from the active demo store. To move
 * to production, implement this same contract with `getDb()` from `lib/db.ts`
 * and Drizzle tables for `saved_events` and `user_preferences`, then inject it
 * with `setPersistenceStore`. Every query must include authenticated user and
 * college scope; writes should use a unique `(user_id, event_id)` constraint.
 *
 * NOTE: the sync `PersistenceStore` above is the demo/offline contract.
 * Neon access is async, so server code should use `NeonPersistenceStore`
 * (below) or query via `getDb()` directly as the /api routes do. The sync
 * demo store is never replaced — `setPersistenceStore` only swaps the
 * in-process fallback (useful for tests).
 */
export const persistenceBackend: "demo" | "neon-ready" = appConfig.database.configured
  ? "neon-ready"
  : "demo";

let activePersistence: PersistenceStore = demoPersistence;

export function getPersistenceStore() {
  return activePersistence;
}

/** Replace the fallback with a Neon-backed adapter at application startup. */
export function setPersistenceStore(store: PersistenceStore) {
  activePersistence = store;
}

export function getSavedEventIds(userId: string) {
  return getPersistenceStore().getSavedEventIds(userId);
}

export function isEventSaved(userId: string, eventId: string) {
  return getPersistenceStore().isEventSaved(userId, eventId);
}

export function setSavedEvent(userId: string, eventId: string, saved: boolean) {
  return getPersistenceStore().setSavedEvent(userId, eventId, saved);
}

export function saveEvent(userId: string, eventId: string) {
  return setSavedEvent(userId, eventId, true);
}

export function removeSavedEvent(userId: string, eventId: string) {
  return setSavedEvent(userId, eventId, false);
}

export function toggleSavedEvent(userId: string, eventId: string) {
  const saved = !isEventSaved(userId, eventId);
  setSavedEvent(userId, eventId, saved);
  return saved;
}

export function getPreferences(userId: string) {
  return getPersistenceStore().getPreferences(userId);
}

export function savePreferences(
  userId: string,
  patch: Partial<UserPreferences>,
) {
  return getPersistenceStore().savePreferences(userId, patch);
}

export const listSavedEventIds = getSavedEventIds;
export const getUserPreferences = getPreferences;
export const setUserPreferences = savePreferences;

export function resetDemoPersistence() {
  demoPersistence.reset();
  activePersistence = demoPersistence;
}

/**
 * Async Neon-backed persistence for server-side callers.
 *
 * Every read/write is scoped by (userId, collegeId). When `getDb()` returns
 * null (demo mode), saves delegate to the in-process demo store and
 * preferences return defaults — so callers never branch on backend.
 * Imported lazily inside methods to keep client bundles free of drizzle.
 */
export class NeonPersistenceStore {
  constructor(private readonly collegeId: string) {}

  async getSavedEventIds(userId: string): Promise<string[]> {
    const { getDb } = await import("./db");
    const db = getDb();
    if (!db) return demoPersistence.getSavedEventIds(userId);
    const { savedEvents } = await import("./db/schema");
    const { and, eq } = await import("drizzle-orm");
    const rows = await db
      .select({ eventId: savedEvents.eventId })
      .from(savedEvents)
      .where(
        and(
          eq(savedEvents.userId, userId),
          eq(savedEvents.collegeId, this.collegeId),
        ),
      );
    return rows.map((row) => row.eventId);
  }

  async setSavedEvent(userId: string, eventId: string, saved: boolean): Promise<void> {
    const { getDb } = await import("./db");
    const db = getDb();
    if (!db) {
      demoPersistence.setSavedEvent(userId, eventId, saved);
      return;
    }
    const { savedEvents } = await import("./db/schema");
    const { and, eq } = await import("drizzle-orm");
    if (saved) {
      await db
        .insert(savedEvents)
        .values({ userId, eventId, collegeId: this.collegeId })
        .onConflictDoNothing();
    } else {
      await db
        .delete(savedEvents)
        .where(
          and(
            eq(savedEvents.userId, userId),
            eq(savedEvents.eventId, eventId),
          ),
        );
    }
  }

  async getPreferences(userId: string): Promise<UserPreferences> {
    const { getDb } = await import("./db");
    const db = getDb();
    if (!db) return demoPersistence.getPreferences(userId);
    const { userPreferences } = await import("./db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    const row = rows[0];
    if (!row) return { ...DEFAULT_PREFERENCES };
    return {
      interests: [...row.interests],
      categories: [...row.categories],
      availability: [...row.availability],
      formats: [...row.formats],
      cost: row.cost === "free" || row.cost === "paid" ? row.cost : "any",
      personalizationEnabled: row.personalizationEnabled,
    };
  }

  async savePreferences(
    userId: string,
    patch: Partial<UserPreferences>,
  ): Promise<UserPreferences> {
    const current = await this.getPreferences(userId);
    const next: UserPreferences = {
      interests: patch.interests ?? current.interests,
      categories: patch.categories ?? current.categories,
      availability: patch.availability ?? current.availability,
      formats: patch.formats ?? current.formats,
      cost: patch.cost ?? current.cost,
      personalizationEnabled: patch.personalizationEnabled ?? current.personalizationEnabled,
    };
    const { getDb } = await import("./db");
    const db = getDb();
    if (!db) {
      demoPersistence.savePreferences(userId, patch);
      return next;
    }
    const { userPreferences } = await import("./db/schema");
    await db
      .insert(userPreferences)
      .values({
        userId,
        collegeId: this.collegeId,
        interests: next.interests,
        categories: next.categories,
        availability: next.availability,
        formats: next.formats,
        cost: next.cost,
        personalizationEnabled: next.personalizationEnabled,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          interests: next.interests,
          categories: next.categories,
          availability: next.availability,
          formats: next.formats,
          cost: next.cost,
          personalizationEnabled: next.personalizationEnabled,
          updatedAt: new Date(),
        },
      });
    return next;
  }
}
