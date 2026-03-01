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

mock.module("@/lib/saved-searches", () => ({
  canonicalizeAndHash: () => ({ canonical: JSON.stringify({ query: "kepler" }), hash: "abc123" }),
}));

mock.module("@/lib/mock-user-store", () => ({
  listSavedObjects: () => ({ objects: [] }),
  saveObject: () => null,
  countSavedObjects: () => 0,
  countSavedObjectsSince: () => 0,
  getSavedObjectByCanonicalId: () => null,
  listSavedSearches: () => [],
  createSavedSearch: () => ({
    id: 1,
    name: "Kepler",
    category: "exoplanets",
    queryParams: { query: "kepler" },
    resultCount: null,
    lastExecutedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }),
  countSavedSearches: () => 100,
  hasSavedSearchByHash: () => false,
  listCollectionsForSavedObject: () => null,
}));

const { POST } = await import("@/app/api/user/saved-searches/route");

describe("/api/user/saved-searches POST", () => {
  it("returns 403 when free-tier saved searches limit is reached", async () => {
    const req = new Request("http://localhost/api/user/saved-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Kepler",
        category: "exoplanets",
        queryParams: { query: "kepler" },
      }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("saved_searches_limit_reached");
  });
});
