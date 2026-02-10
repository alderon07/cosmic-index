import { describe, expect, it, mock } from "bun:test";

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
}));

mock.module("@/lib/mock-user-store", () => ({
  listCollectionsForSavedObject: (userId: string, savedObjectId: number) => {
    if (userId !== "user-1") return null;
    if (savedObjectId !== 42) return null;
    return [
      {
        id: 1,
        name: "Weekly Watchlist",
        itemCount: 2,
        isMember: true,
        updatedAt: "2026-02-10T00:00:00.000Z",
      },
    ];
  },
}));

const { GET } = await import("@/app/api/user/saved-objects/[id]/collections/route");

describe("GET /api/user/saved-objects/[id]/collections", () => {
  it("returns collections with membership for a saved object", async () => {
    const response = await GET(new Request("http://localhost/api/user/saved-objects/42/collections"), {
      params: Promise.resolve({ id: "42" }),
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.savedObjectId).toBe(42);
    expect(payload.collections).toHaveLength(1);
    expect(payload.collections[0].isMember).toBe(true);
  });

  it("returns 400 for invalid saved object id", async () => {
    const response = await GET(new Request("http://localhost/api/user/saved-objects/abc/collections"), {
      params: Promise.resolve({ id: "abc" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 404 when saved object is not found", async () => {
    const response = await GET(new Request("http://localhost/api/user/saved-objects/9/collections"), {
      params: Promise.resolve({ id: "9" }),
    });

    expect(response.status).toBe(404);
  });
});
