import { getServerSession } from "next-auth";

import { authOptions, type UserRole } from "./auth";

/**
 * Server-side route protection for EventRank API routes (App Router).
 *
 * Usage (API agent: call at the top of any authenticated route handler):
 *
 *   import { getSessionUser, requireUser, unauthorized } from "@/lib/require-session";
 *
 *   export async function POST(request: Request) {
 *     const user = await getSessionUser();
 *     if (!user) return unauthorized();
 *     // ...user is { id, role, collegeId, isDemo }
 *   }
 *
 *   // Or throw-style (catch and map to 401 in the handler):
 *   export async function GET() {
 *     try {
 *       const user = await requireUser();
 *       // ...
 *     } catch (error) {
 *       if (error instanceof UnauthorizedError) return unauthorized();
 *       throw error;
 *     }
 *   }
 *
 * Notes:
 *  - Returns null for anonymous callers AND for demo-mode callers (demo is a
 *    client-side fallback with no signed JWT, so it must never pass server
 *    auth). Phase 2 routes that want demo-tolerant behavior should handle the
 *    null case explicitly rather than weakening this helper.
 *  - Never trust client-supplied user ids; always derive identity from the
 *    signed session via getServerSession(authOptions).
 */
export type SessionUser = {
  id: string;
  role: UserRole;
  collegeId: string;
  isDemo: boolean;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id) return null;
  if (user.isDemo || session?.isDemo) return null;
  return {
    id: user.id,
    role: user.role ?? "student",
    collegeId: user.collegeId ?? "northbridge-university",
    isDemo: false,
  };
}

/** 401-shaped error thrown by requireUser(). Map it to unauthorized(). */
export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Return the signed-in user or throw UnauthorizedError (never returns demo). */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** JSON 401 response helper for route handlers. */
export function unauthorized(message = "Authentication required") {
  return Response.json({ error: message }, { status: 401 });
}
