import { describe, it, expect, mock } from "bun:test";
import type { NextRequest } from "next/server";

mock.module("@/lib/auth", () => ({
  requireAuth: async () => ({ userId: "user-1", tier: "free" }),
  authErrorResponse: (error: unknown) =>
    new Response(JSON.stringify({ error: String(error) }), { status: 401 }),
}));

mock.module("@/lib/user-db", () => ({
  getUserDb: () => null,
  requireUserDb: () => null,
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

mock.module("@/lib/mock-user-store", () => ({
  listSavedObjects: () => ({ objects: [] }),
  saveObject: () => null,
  countSavedObjects: () => 0,
  countSavedObjectsSince: () => 0,
  getSavedObjectByCanonicalId: () => null,
  listSavedSearches: () => [],
  createSavedSearch: () => null,
  countSavedSearches: () => 0,
  hasSavedSearchByHash: () => false,
  listCollectionsForSavedObject: () => null,
}));

mock.module("@/lib/exoplanet-index", () => ({
  searchExoplanets: async () => ({
    objects: [
      {
        displayName: "Kepler-22b",
        hostStar: "Kepler-22",
        discoveryMethod: "Transit",
        discoveredYear: 2011,
        orbitalPeriodDays: 289.9,
        radiusEarth: 2.4,
        massEarth: null,
        equilibriumTempK: 295,
        distanceParsecs: 190,
      },
    ],
    hasMore: false,
    nextCursor: null,
    usedCursor: true,
    limit: 1,
    page: 1,
    total: 1,
  }),
}));

mock.module("@/lib/star-index", () => ({
  searchStars: async () => ({ objects: [], hasMore: false, nextCursor: null, usedCursor: true, limit: 1, page: 1, total: 0 }),
}));

mock.module("@/lib/jpl-sbdb", () => ({
  fetchSmallBodies: async () => ({ objects: [], hasMore: false }),
}));

const { POST } = await import("@/app/api/user/export/route");

describe("/api/user/export", () => {
  it("allows CSV without explicit limit by applying tier default cap", async () => {
    const req = new Request("http://localhost/api/user/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "csv", category: "exoplanets", queryParams: {} }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    const text = await res.text();
    expect(text).toContain("Planet Name");
    expect(text).toContain("Kepler-22b");
  });

  it("rejects CSV when limit exceeds tier cap", async () => {
    const req = new Request("http://localhost/api/user/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "csv", category: "exoplanets", queryParams: { limit: 50000 } }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("csv_row_limit_exceeded");
  });

  it("returns NDJSON stream for valid request", async () => {
    const req = new Request("http://localhost/api/user/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format: "ndjson",
        category: "exoplanets",
        queryParams: { limit: 1 },
      }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/x-ndjson");
    const text = await res.text();
    expect(text).toContain("\"schema\":\"v1\"");
    expect(text).toContain("Kepler-22b");
    expect(text).toContain("\"status\":\"complete\"");
  });

  it("rejects invalid cursor", async () => {
    const req = new Request("http://localhost/api/user/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format: "ndjson",
        category: "exoplanets",
        queryParams: { limit: 1 },
        cursor: "not-a-valid-cursor",
      }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_cursor_format");
  });
});
