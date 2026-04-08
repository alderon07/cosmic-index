import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

type MockAuthUser = { userId: string } | null;

let mockUser: MockAuthUser = null;
let mockInternalAdminConfigured = true;
let mockIsInternalAdmin = false;

mock.module("@/lib/auth", () => ({
  getAuthUser: async () => mockUser,
  requireAuth: async () => {
    if (!mockUser) {
      const error = new Error("Authentication required");
      error.name = "AuthError";
      throw error;
    }
    return {
      userId: mockUser.userId,
      email: "",
      tier: "free" as const,
      isPro: false,
    };
  },
  requirePro: async () => ({
    userId: "user_admin",
    email: "",
    tier: "pro" as const,
    isPro: true,
  }),
  authErrorResponse: (error: unknown) =>
    new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 401 }
    ),
}));

mock.module("@/lib/admin-access", () => ({
  isInternalAdminConfigured: () => mockInternalAdminConfigured,
  isInternalAdmin: () => mockIsInternalAdmin,
}));

mock.module("@/lib/runtime-mode", () => ({
  getProGate: () => ({
    productEnabled: true,
    billingEnabled: true,
    surfacesEnabled: true,
    waitlistEnabled: false,
    configuredLimitMode: "shadow" as const,
    forceEnforce: false,
    waitlistEnforceThreshold: 0,
  }),
}));

mock.module("@/lib/user-db", () => ({
  getUserDb: () => ({
    execute: async ({ sql }: { sql: string }) => {
      if (sql.includes("COALESCE(SUM(saved_objects_limit_hits), 0)")) {
        return {
          rows: [
            {
              saved_objects_limit_hits: 0,
              saved_searches_limit_hits: 0,
              exports_limit_hits: 0,
            },
          ],
        };
      }

      if (sql.includes("FROM pro_interest_daily")) {
        return {
          rows: [
            {
              saved_objects_limit_hits: 0,
              saved_searches_limit_hits: 0,
              exports_limit_hits: 0,
            },
          ],
        };
      }

      return { rows: [] };
    },
  }),
  requireUserDb: () => ({
    execute: async () => ({ rows: [] }),
  }),
}));

const { GET } = await import("@/app/api/internal/pro-rollout-status/route");

beforeEach(() => {
  mockUser = null;
  mockInternalAdminConfigured = true;
  mockIsInternalAdmin = false;
});

afterEach(() => {
  mockUser = null;
  mockInternalAdminConfigured = true;
  mockIsInternalAdmin = false;
});

afterAll(() => {
  mock.restore();
});

describe("GET /api/internal/pro-rollout-status", () => {
  it("returns 404 when admin ids are not configured", async () => {
    mockInternalAdminConfigured = false;

    const response = await GET();

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  });

  it("returns 404 for non-admin users", async () => {
    mockUser = { userId: "user_public" };
    mockIsInternalAdmin = false;

    const response = await GET();

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  });
});
