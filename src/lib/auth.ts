import { getUserDb } from "./user-db";
import {
  getMockUserEmail,
  getMockUserId,
  getMockUserTier,
  isMockAuthEnabled,
  isMockProEnabled,
  isClerkServerConfigured,
} from "./runtime-mode";

/**
 * Authentication Utilities
 *
 * CRITICAL DESIGN DECISION: Database is the source of truth for tier status.
 *
 * Why not use Clerk JWT claims for tier?
 * 1. JWT claims are set at login time - if user upgrades mid-session, they'd need to re-login
 * 2. Clerk publicMetadata can be used for client-side UI hints, but server-side auth
 *    decisions must always check the database for the most current tier status
 * 3. Stripe webhooks update the database directly - no JWT refresh needed
 *
 * This module provides:
 * - AuthError: Custom error class with HTTP status codes
 * - getAuthUser(): Get current user (null if not signed in)
 * - requireAuth(): Require authentication (throws 401 if not signed in)
 * - requirePro(): Require Pro tier (throws 403 if not Pro)
 */

export type UserTier = "free" | "pro";

export interface AuthUser {
  userId: string;
  email: string;
  tier: UserTier;
  isPro: boolean;
}

/**
 * Custom error class for authentication failures.
 * Includes HTTP status code and optional error code for client handling.
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number = 401,
    public readonly code?: string
  ) {
    super(message);
    this.name = "AuthError";
  }
}

interface ClerkUserSnapshot {
  userId: string | null;
  email: string;
}

async function getClerkUserSnapshot(): Promise<ClerkUserSnapshot> {
  if (!isClerkServerConfigured()) {
    return { userId: null, email: "" };
  }

  const { auth, currentUser } = await import("@clerk/nextjs/server");
  const { userId } = await auth();

  if (!userId) {
    return { userId: null, email: "" };
  }

  const clerkUser = await currentUser();
  return {
    userId,
    email: clerkUser?.emailAddresses[0]?.emailAddress ?? "",
  };
}

function buildMockUser(): AuthUser {
  const tier = getMockUserTier();
  return {
    userId: getMockUserId(),
    email: getMockUserEmail(),
    tier,
    isPro: tier === "pro",
  };
}

/**
 * Get the current authenticated user with tier information.
 * Returns null if not signed in.
 *
 * This function performs a conditional database upsert:
 * - If user doesn't exist in DB: creates them (first visit)
 * - If email changed: updates it (rare)
 * - Otherwise: read-only (most requests)
 *
 * Write optimization: Most requests = 1 read, 0 writes.
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  if (isMockAuthEnabled()) {
    return buildMockUser();
  }

  const clerk = await getClerkUserSnapshot();
  if (!clerk.userId) {
    return null;
  }

  const db = getUserDb();
  if (!db) {
    // Database not configured - return basic auth without tier
    return {
      userId: clerk.userId,
      email: clerk.email,
      tier: "free",
      isPro: false,
    };
  }

  // First: read (no write yet)
  const result = await db.execute({
    sql: "SELECT tier, email FROM users WHERE id = ?",
    args: [clerk.userId],
  });

  if (result.rows.length === 0) {
    // User doesn't exist in DB - create them (first visit)
    await db.execute({
      sql: "INSERT INTO users (id, email) VALUES (?, ?)",
      args: [clerk.userId, clerk.email],
    });
    return {
      userId: clerk.userId,
      email: clerk.email,
      tier: "free",
      isPro: false,
    };
  }

  const row = result.rows[0];
  const dbEmail = row.email as string;
  const tier = (row.tier as UserTier) ?? "free";

  // Only update if email changed (rare - Clerk email updates)
  if (dbEmail !== clerk.email && clerk.email) {
    await db.execute({
      sql: 'UPDATE users SET email = ?, updated_at = datetime("now") WHERE id = ?',
      args: [clerk.email, clerk.userId],
    });
  }

  return {
    userId: clerk.userId,
    email: clerk.email || dbEmail,
    tier,
    isPro: tier === "pro",
  };
}

/**
 * Require authentication - throws AuthError if not signed in.
 * Use this in API routes that require a logged-in user.
 *
 * @throws AuthError with status 401 if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new AuthError("Authentication required", 401, "UNAUTHORIZED");
  }
  return user;
}

/**
 * Require Pro tier - throws AuthError if not Pro subscriber.
 * Use this in API routes that are Pro-only features.
 *
 * @throws AuthError with status 401 if not authenticated
 * @throws AuthError with status 403 if not Pro tier
 */
export async function requirePro(): Promise<AuthUser> {
  const user = await requireAuth();
  if (isMockAuthEnabled()) {
    if (!isMockProEnabled()) {
      throw new AuthError("Pro subscription required", 403, "PRO_REQUIRED");
    }
    return user;
  }

  if (!user.isPro) {
    throw new AuthError("Pro subscription required", 403, "PRO_REQUIRED");
  }
  return user;
}

/**
 * Helper to convert AuthError to JSON response.
 * Use this in API route catch blocks.
 */
export function authErrorResponse(error: unknown): Response {
  if (error instanceof AuthError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status }
    );
  }
  // Re-throw unexpected errors
  throw error;
}
