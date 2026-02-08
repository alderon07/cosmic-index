import { describe, it, expect, mock } from "bun:test";
import type { NextRequest } from "next/server";

mock.module("@/lib/auth", () => ({
  requireAuth: async () => ({ userId: "user-1", tier: "free" }),
  authErrorResponse: (error: unknown) =>
    new Response(JSON.stringify({ error: String(error) }), { status: 401 }),
}));

mock.module("@/lib/runtime-mode", () => ({
  isMockUserStoreEnabled: () => true,
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
  countSavedObjects: () => 50,
  countSavedObjectsSince: () => 0,
  getSavedObjectByCanonicalId: () => null,
  listSavedSearches: () => [],
  createSavedSearch: () => null,
  countSavedSearches: () => 0,
  hasSavedSearchByHash: () => false,
}));

const { POST } = await import("@/app/api/user/saved-objects/route");

describe("/api/user/saved-objects POST", () => {
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
