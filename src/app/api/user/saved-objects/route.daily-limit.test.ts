import { describe, it, expect, mock } from "bun:test";
import type { NextRequest } from "next/server";

mock.module("@/lib/auth", () => ({
  requireAuth: async () => ({ userId: "user-1", tier: "free" }),
  authErrorResponse: (error: unknown) =>
    new Response(JSON.stringify({ error: String(error) }), { status: 401 }),
}));

mock.module("@/lib/runtime-mode", () => ({
  isMockUserStoreEnabled: () => true,
  getConfiguredLimitMode: () => "enforce",
  getForceEnforce: () => false,
  getWaitlistEnabled: () => false,
  getWaitlistEnforceThreshold: () => 125,
  getProSurfacesEnabled: () => false,
  getProBillingEnabled: () => false,
  getProRolloutAdminIds: () => [],
}));

mock.module("@/lib/user-db", () => ({
  requireUserDb: () => {
    throw new Error("db should not be called in mock mode");
  },
  getUserDb: () => null,
}));

mock.module("@/lib/canonical-id", () => ({
  parseCanonicalId: () => ({ type: "exoplanet", id: "kepler-22-b" }),
}));

mock.module("@/lib/mock-user-store", () => ({
  listSavedObjects: () => ({ objects: [], total: 0, hasMore: false }),
  saveObject: () => ({
    id: 1,
    canonicalId: "exoplanet:kepler-22-b",
    displayName: "Kepler-22b",
    notes: null,
    eventPayload: null,
    createdAt: new Date().toISOString(),
  }),
  countSavedObjects: () => 0,
  countSavedObjectsSince: () => 25,
  getSavedObjectByCanonicalId: () => null,
  listSavedSearches: () => [],
  createSavedSearch: () => null,
  countSavedSearches: () => 0,
  hasSavedSearchByHash: () => false,
  listCollectionsForSavedObject: () => null,
}));

const { POST } = await import("@/app/api/user/saved-objects/route");

describe("/api/user/saved-objects POST daily limits", () => {
  it("returns 429 when rolling 24-hour save limit is reached", async () => {
    const req = new Request("http://localhost/api/user/saved-objects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        canonicalId: "exoplanet:kepler-22-b",
        displayName: "Kepler-22b",
      }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(429);
    expect(res.headers.get("X-RateLimit-Saves-Limit")).toBe("25");
    const body = await res.json();
    expect(body.error).toBe("daily_save_limit_reached");
  });
});
