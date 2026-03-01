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
  parseCanonicalId: (canonicalId: string) => {
    const [type, id] = canonicalId.split(":", 2);
    if (!type || !id) return null;
    return { type, id };
  },
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
  countSavedObjects: () => 150,
  countSavedObjectsSince: () => 0,
  getSavedObjectByCanonicalId: () => null,
  listSavedSearches: () => [],
  createSavedSearch: () => null,
  countSavedSearches: () => 0,
  hasSavedSearchByHash: () => false,
  listCollectionsForSavedObject: () => null,
}));

const { POST } = await import("@/app/api/user/saved-objects/route");

describe("/api/user/saved-objects POST", () => {
  it("returns 400 when attempting to save a fireball object", async () => {
    const req = new Request("http://localhost/api/user/saved-objects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        canonicalId: "fireball:abc123def456abc123def456",
        displayName: "Fireball Test",
      }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("unsupported_object_type");
  });

  it("returns 403 when free-tier total saved objects limit is reached", async () => {
    const req = new Request("http://localhost/api/user/saved-objects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        canonicalId: "exoplanet:kepler-22-b",
        displayName: "Kepler-22b",
      }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("saved_objects_limit_reached");
  });
});
