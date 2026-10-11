/**
 * Session resolution for API routes.
 *
 * Reads the Auth.js session via `getServerSession(authOptions)`. When OAuth is
 * unconfigured the routes accept the explicit demo session so the seeded UI
 * keeps working; with OAuth configured a missing session is a 401.
 */

import { getServerSession } from "next-auth";

import {
  authOptions,
  createDemoSession,
  isDemoSession,
  oauthConfigured,
} from "@/lib/auth";
import { appConfig } from "@/lib/config";

import { forbidden, unauthenticated } from "./http";

export interface AuthenticatedUser {
  userId: string;
  collegeId: string;
  isDemo: boolean;
}

export async function authenticate(): Promise<
  { user: AuthenticatedUser } | { response: Response }
> {
  let session: unknown = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }

  if (!session && !oauthConfigured) {
    session = createDemoSession();
  }

  if (!session || typeof session !== "object") {
    return { response: unauthenticated() };
  }

  const sessionUser = (session as { user?: unknown }).user;
  if (!sessionUser || typeof sessionUser !== "object") {
    return { response: unauthenticated() };
  }

  const userRecord = sessionUser as {
    id?: unknown;
    collegeId?: unknown;
    isDemo?: unknown;
  };
  const userId = typeof userRecord.id === "string" ? userRecord.id.trim() : "";
  if (!userId) {
    return { response: unauthenticated() };
  }

  const collegeId =
    typeof userRecord.collegeId === "string" && userRecord.collegeId.trim()
      ? userRecord.collegeId.trim()
      : appConfig.college.id;

  if (collegeId !== appConfig.college.id) {
    return { response: forbidden() };
  }

  return {
    user: {
      userId,
      collegeId,
      isDemo: isDemoSession(session) || userRecord.isDemo === true,
    },
  };
}
