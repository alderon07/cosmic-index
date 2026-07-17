import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

type MockAuthUser = { userId: string } | null;

let mockUser: MockAuthUser = null;
let mockInternalAdminConfigured = true;
let mockIsInternalAdmin = false;
let mockClerkConfigured = true;

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

mock.module("@/lib/auth", () => ({
  getAuthUser: async () => mockUser,
  requireAuth: async () => {
    if (!mockUser) {
      const error = new Error("Authentication required");
      error.name = "AuthError";
      throw error;
    }
    return { ...mockUser, tier: "free", isPro: false, email: "" };
  },
  requirePro: async () => ({
    userId: "user_admin",
    email: "admin@example.com",
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
    productEnabled: false,
    billingEnabled: false,
    surfacesEnabled: false,
    waitlistEnabled: true,
    configuredLimitMode: "shadow" as const,
    forceEnforce: false,
    waitlistEnforceThreshold: 125,
  }),
  isProFeatureEnabled: () => false,
  isClerkServerConfigured: () => mockClerkConfigured,
  isClerkClientConfigured: () => mockClerkConfigured,
  getConfiguredLimitMode: () => "shadow",
  getForceEnforce: () => false,
  getWaitlistEnabled: () => true,
  getWaitlistEnforceThreshold: () => 125,
  getProSurfacesEnabled: () => false,
  getProBillingEnabled: () => false,
  getInternalAdminIds: () => [],
  getProRolloutAdminIds: () => [],
}));

const { GET } = await import("@/app/api/internal/openapi/route");

function resetMocks() {
  mockUser = null;
  mockInternalAdminConfigured = true;
  mockIsInternalAdmin = false;
  mockClerkConfigured = true;
}

beforeEach(() => {
  resetMocks();
});

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  resetMocks();
});

describe("GET /api/internal/openapi", () => {
  it("returns spec in non-production without auth checks", async () => {
    process.env.NODE_ENV = "development";

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    const body = await response.json();
    expect(body.openapi).toBe("3.1.0");
    expect(
      body.components.schemas.StarData.allOf[1].properties.stellarParameters.$ref,
    ).toBe("#/components/schemas/StellarHostParameters");
    expect(body.components.schemas.StellarHostParameters.properties.solutions.maxItems).toBe(50);
    expect(body.paths["/stars/{id}"].get.description).toContain("Detail responses");
  });

  it("returns 404 in production when admin ids are not configured", async () => {
    process.env.NODE_ENV = "production";
    mockInternalAdminConfigured = false;

    const response = await GET();
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  });

  it("returns 404 in production when user is not authenticated", async () => {
    process.env.NODE_ENV = "production";
    mockInternalAdminConfigured = true;
    mockUser = null;

    const response = await GET();
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  });

  it("returns 404 in production when user is not an internal admin", async () => {
    process.env.NODE_ENV = "production";
    mockInternalAdminConfigured = true;
    mockUser = { userId: "user_123" };
    mockIsInternalAdmin = false;

    const response = await GET();
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  });

  it("returns 200 in production for internal admin", async () => {
    process.env.NODE_ENV = "production";
    mockInternalAdminConfigured = true;
    mockUser = { userId: "user_admin" };
    mockIsInternalAdmin = true;

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.openapi).toBe("3.1.0");
  });

  it("returns 404 in production when Clerk is not configured", async () => {
    process.env.NODE_ENV = "production";
    mockClerkConfigured = false;

    const response = await GET();
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  });
});
