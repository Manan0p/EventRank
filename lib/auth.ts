/**
 * EventRank Auth.js (NextAuth v4) configuration — Google OAuth round-trip notes.
 *
 * CALLBACK URL: `${appConfig.appUrl}/api/auth/callback/google`, where
 * `appConfig.appUrl` resolves as `NEXT_PUBLIC_APP_URL ?? NEXTAUTH_URL ??
 * "http://localhost:3000"`. Local dev default (with placeholder creds) is:
 *   http://localhost:3000/api/auth/callback/google
 *
 * GOOGLE CLOUD CONSOLE SETUP (required before real sign-in works):
 *  1. Create an OAuth 2.0 Client ID of type "Web application".
 *  2. Authorized JavaScript origins: exactly the app URL
 *     (e.g. http://localhost:3000 for dev; the deployed origin in prod).
 *  3. Authorized redirect URIs: the callback URL above, verbatim.
 *  4. Set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env.local, plus
 *     NEXTAUTH_URL (or NEXT_PUBLIC_APP_URL) matching the origin — a mismatch
 *     makes the callback fail even with valid credentials.
 *  5. Set AUTH_SECRET (or NEXTAUTH_SECRET alias) to a long random value.
 *
 * INVARIANTS (verified, do not regress):
 *  - `session.strategy` is "jwt"; session cookies keep NextAuth's HttpOnly
 *    defaults (`__Secure-` prefix in production) — never read/write them
 *    manually, never copy tokens or JWTs into localStorage.
 *  - Google provider is registered ONLY when both credentials exist;
 *    otherwise `providers` is [] and `oauthConfigured` is false, so the UI
 *    must render the explicit demo fallback instead of an OAuth flow.
 *  - College-domain enforcement stays OFF by default
 *    (ENFORCE_COLLEGE_DOMAIN=false); the signIn callback only enforces when
 *    `appConfig.college.enforceDomain` is true.
 *  - Provider access/refresh tokens are never attached to the session object
 *    and therefore never reach the browser.
 */
import type { DefaultSession, NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";

import { appConfig } from "./config";

export type UserRole = "student" | "organizer" | "moderator" | "admin";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      collegeId: string;
      isDemo?: boolean;
    } & DefaultSession["user"];
    isDemo?: boolean;
  }

  interface User {
    role?: UserRole;
    collegeId?: string;
    isDemo?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    collegeId?: string;
    isDemo?: boolean;
  }
}

export type DemoSessionUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: "student";
  collegeId: string;
  isDemo: true;
};

export type DemoSession = {
  user: DemoSessionUser;
  expires: string;
  isDemo: true;
};

export const demoUser: DemoSessionUser = Object.freeze({
  id: "demo-student",
  name: "Maya Chen",
  email: "maya.chen@northbridge.edu",
  image: null,
  role: "student",
  collegeId: appConfig.college.id,
  isDemo: true,
});

/**
 * Build a clearly-marked local session for the seeded UI.
 *
 * This helper is intentionally separate from Auth.js' JWT cookie flow. It
 * gives the demo a stable user shape without pretending that an OAuth identity
 * or a signed production session exists.
 */
export function createDemoSession(
  overrides: Partial<DemoSessionUser> = {},
): DemoSession {
  const user: DemoSessionUser = {
    ...demoUser,
    ...overrides,
    role: "student",
    collegeId: overrides.collegeId ?? demoUser.collegeId,
    isDemo: true,
  };

  return {
    user,
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    isDemo: true,
  };
}

export const getDemoSession = createDemoSession;
export const demoSession = createDemoSession;

export function isDemoSession(value: unknown): value is DemoSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<DemoSession>;
  return (
    session.isDemo === true &&
    typeof session.expires === "string" &&
    Boolean(session.user && session.user.isDemo === true)
  );
}

const providers: NextAuthOptions["providers"] = appConfig.auth.google.configured
  ? [
      GoogleProvider({
        clientId: appConfig.auth.google.clientId as string,
        clientSecret: appConfig.auth.google.clientSecret as string,
      }),
    ]
  : [];

/** Whether an OAuth provider is available for the current environment. */
export const oauthConfigured = providers.length > 0;

/**
 * Auth.js/NextAuth configuration for App Router route handlers.
 *
 * Google is added only when both credentials exist. With no credentials this
 * remains an importable, typed config for demo mode; a route can choose to
 * render `createDemoSession()` instead of invoking an unconfigured OAuth flow.
 */
export const authOptions: NextAuthOptions = {
  providers,
  secret: appConfig.auth.secret,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user }) {
      if (!appConfig.college.enforceDomain) return true;

      const email = user.email?.trim().toLowerCase();
      const domain = appConfig.college.domain.toLowerCase();
      return Boolean(email && email.endsWith(`@${domain}`));
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? token.sub;
        token.role = user.role ?? "student";
        token.collegeId = user.collegeId ?? appConfig.college.id;
        token.isDemo = false;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id ?? token.sub ?? "";
      session.user.role = token.role ?? "student";
      session.user.collegeId = token.collegeId ?? appConfig.college.id;
      session.user.isDemo = token.isDemo ?? false;
      session.isDemo = token.isDemo ?? false;
      return session;
    },
  },
};

/** Alias that reads naturally at an Auth.js route-handler call site. */
export const authConfig = authOptions;

export function getAuthOptions() {
  return authOptions;
}

/** Keep the JWT shape visible to consumers that build adapter callbacks. */
export type EventRankJWT = JWT;
