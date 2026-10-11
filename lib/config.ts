import { z } from "zod";

/** Convert blank environment values to undefined without rejecting a .env file. */
const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

/** Parse common boolean environment values without treating "false" as true. */
const optionalBoolean = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
    return value;
  },
  z.boolean().optional(),
);

const optionalString = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().min(1).optional(),
);

/**
 * Environment variables used by the platform boundary.
 *
 * Every field is optional on purpose. The browser demo must remain importable
 * before Neon or OAuth has been provisioned, while malformed boolean values
 * are surfaced through `environmentIssues` rather than crashing the UI.
 */
export const envSchema = z.object({
  DATABASE_URL: optionalString,
  DIRECT_DATABASE_URL: optionalString,
  AUTH_SECRET: optionalString,
  NEXTAUTH_SECRET: optionalString,
  NEXTAUTH_URL: optionalString,
  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,
  COLLEGE_DOMAIN: optionalString,
  ENFORCE_COLLEGE_DOMAIN: optionalBoolean,
  EMBEDDING_API_KEY: optionalString,
  EMBEDDING_MODEL: optionalString,
  SEMANTIC_SEARCH_ENABLED: optionalBoolean,
  DEMO_MODE: optionalBoolean,
  DEMO_NOW: optionalString,
  NEXT_PUBLIC_APP_URL: optionalString,
});

export type ParsedEnvironment = z.infer<typeof envSchema>;

function parseEnvironment(source: NodeJS.ProcessEnv) {
  const parsed = envSchema.safeParse(source);
  if (parsed.success) return parsed.data;

  // Keep server components and the demo UI usable when an optional flag is
  // mistyped. Callers can inspect `environmentIssues` during setup.
  return envSchema.parse({});
}

const parsedEnvironment = envSchema.safeParse(process.env);

/** Sanitized environment values. Do not log this object because it can hold secrets. */
export const env: ParsedEnvironment = parseEnvironment(process.env);

/** Non-secret validation details useful to setup diagnostics. */
export const environmentIssues = parsedEnvironment.success
  ? []
  : parsedEnvironment.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));

const authSecret = env.AUTH_SECRET ?? env.NEXTAUTH_SECRET;
const hasDatabaseUrl = Boolean(env.DATABASE_URL);
const hasGoogleOAuthCredentials = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
const hasProductionCredentialsConfigured = Boolean(hasDatabaseUrl && authSecret && hasGoogleOAuthCredentials);
const configuredDemoMode = env.DEMO_MODE === true;

const demoNow = env.DEMO_NOW ? new Date(env.DEMO_NOW) : undefined;
const validDemoNow = demoNow && !Number.isNaN(demoNow.getTime()) ? demoNow : undefined;

/**
 * Central runtime configuration.
 *
 * `runtime.mode` intentionally stays `demo` until all core production
 * boundaries are present. Setting DEMO_MODE=true always forces the fallback;
 * setting it false cannot make an incomplete deployment unsafe.
 */
export const appConfig = {
  appName: "EventRank",
  appUrl: env.NEXT_PUBLIC_APP_URL ?? env.NEXTAUTH_URL ?? "http://localhost:3000",
  runtime: {
    mode: configuredDemoMode || !hasProductionCredentialsConfigured ? "demo" : "production",
    demoMode: configuredDemoMode || !hasProductionCredentialsConfigured,
    productionReady: hasProductionCredentialsConfigured,
    demoNow: validDemoNow,
  },
  database: {
    url: env.DATABASE_URL,
    directUrl: env.DIRECT_DATABASE_URL,
    configured: hasDatabaseUrl,
  },
  auth: {
    secret: authSecret,
    sessionStrategy: "jwt" as const,
    configured: Boolean(authSecret && hasGoogleOAuthCredentials),
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      configured: hasGoogleOAuthCredentials,
    },
  },
  college: {
    id: "northbridge-university",
    slug: "northbridge-university",
    domain: env.COLLEGE_DOMAIN ?? "northbridge.edu",
    enforceDomain: env.ENFORCE_COLLEGE_DOMAIN ?? false,
  },
  search: {
    semanticRequested: env.SEMANTIC_SEARCH_ENABLED ?? false,
    semanticEnabled: Boolean(env.SEMANTIC_SEARCH_ENABLED && env.EMBEDDING_API_KEY),
    embeddingApiKey: env.EMBEDDING_API_KEY,
    embeddingModel: env.EMBEDDING_MODEL ?? "text-embedding-3-small",
  },
} as const;

export const isDemoMode = appConfig.runtime.demoMode;
export const hasDatabase = appConfig.database.configured;
export const hasGoogleOAuth = appConfig.auth.google.configured;
export const hasProductionCredentials = appConfig.runtime.productionReady;

/** Use the configured demo clock when present, otherwise use the real clock. */
export function getAppNow() {
  return appConfig.runtime.demoNow ?? new Date();
}
