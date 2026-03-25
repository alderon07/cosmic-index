import { describe, it, expect, mock } from "bun:test";
import type { NextRequest } from "next/server";

let mockRequireAuth = async () => ({ userId: "user-1", tier: "free" as const });

const savedRows = [
  {
    id: 21,
    canonical_id: "cme:09cb02ec9d49485d6e861e6d",
    display_name: "Coronal Mass Ejection Feb 28, 2026",
    notes: null,
    event_payload: JSON.stringify({
      id: "2026-02-28T07:09:00-CME-001",
      eventType: "CME",
      startTime: "2026-02-28T07:09Z",
      sourceLocation: "",
      activeRegionNum: null,
      speed: 330,
      halfAngle: 29,
      cmeType: "S",
    }),
    created_at: "2026-03-01 01:30:41",
  },
  {
    id: 22,
    canonical_id: "exoplanet:GJ%203090%20c",
    display_name: "GJ 3090 c",
    notes: "interesting target",
    event_payload: null,
    created_at: "2026-03-01 01:40:19",
  },
];

const collectionRows = [
  {
    id: 11,
    canonical_id: "star:TRAPPIST-1",
    display_name: "TRAPPIST-1",
    notes: "Primary target",
    event_payload: null,
    created_at: "2026-01-01T00:00:00.000Z",
  },
];

const mockDb = {
  execute: async ({ sql, args }: { sql: string; args?: unknown[] }) => {
    if (sql.includes("SELECT COUNT(*) as request_count") && sql.includes("FROM export_history")) {
      return { rows: [{ request_count: 0 }] };
    }

    if (sql.includes("COALESCE(SUM(exported_count), 0) as rows_used") && sql.includes("FROM export_history")) {
      return { rows: [{ rows_used: 0 }] };
    }

    if (sql.includes("INSERT INTO export_history")) {
      return { rows: [], lastInsertRowid: 1 };
    }

    if (sql.includes("UPDATE export_history")) {
      return { rows: [] };
    }

    if (sql.includes("FROM collections") && sql.includes("WHERE id = ? AND user_id = ?")) {
      const collectionId = Number(args?.[0] ?? 0);
      return { rows: collectionId === 1 ? [{ id: 1 }] : [] };
    }

    if (sql.includes("FROM saved_objects") && sql.includes("ORDER BY created_at DESC")) {
      const limit = Number(args?.[1] ?? 0);
      const offset = Number(args?.[2] ?? 0);
      return { rows: savedRows.slice(offset, offset + limit) };
    }

    if (sql.includes("FROM collection_items ci") && sql.includes("JOIN saved_objects so")) {
      const limit = Number(args?.[2] ?? 0);
      const offset = Number(args?.[3] ?? 0);
      return { rows: collectionRows.slice(offset, offset + limit) };
    }

    return { rows: [] };
  },
};

mock.module("@/lib/auth", () => ({
  getAuthUser: async () => {
    try {
      return await mockRequireAuth();
    } catch {
      return null;
    }
  },
  requireAuth: () => mockRequireAuth(),
  requirePro: async () => ({
    userId: "user-1",
    email: "user@example.com",
    tier: "pro" as const,
    isPro: true,
  }),
  authErrorResponse: (error: unknown) => {
    if (error instanceof Error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 401 });
    }
    return new Response(JSON.stringify({ error: String(error) }), { status: 401 });
  },
}));

mock.module("@/lib/user-db", () => ({
  getUserDb: () => mockDb,
  requireUserDb: () => mockDb,
}));

mock.module("@/lib/runtime-mode", () => ({
  getProGate: () => ({
    productEnabled: false,
    billingEnabled: false,
    surfacesEnabled: false,
    waitlistEnabled: false,
    configuredLimitMode: "shadow" as const,
    forceEnforce: false,
    waitlistEnforceThreshold: 125,
  }),
  isProFeatureEnabled: () => false,
  isClerkServerConfigured: () => true,
  isClerkClientConfigured: () => true,
  getConfiguredLimitMode: () => "shadow",
  getForceEnforce: () => false,
  getWaitlistEnabled: () => false,
  getWaitlistEnforceThreshold: () => 125,
  getProSurfacesEnabled: () => false,
  getProBillingEnabled: () => false,
  getInternalAdminIds: () => [],
  getProRolloutAdminIds: () => [],
}));

mock.module("@/lib/exoplanet-index", () => ({
  searchExoplanets: async () => ({
    objects: [
      {
        id: "kepler-22b",
        sourceId: "Kepler-22b",
        displayName: "Kepler-22b",
        summary: "A temperate exoplanet.",
        links: [{ label: "NASA Exoplanet Archive", url: "https://example.com/kepler-22b" }],
        hostStar: "Kepler-22",
        discoveryMethod: "Transit",
        discoveryFacility: "Kepler",
        discoveredYear: 2011,
        orbitalPeriodDays: 289.9,
        radiusEarth: 2.4,
        massEarth: null,
        massIsEstimated: true,
        equilibriumTempK: 295,
        distanceParsecs: 190,
        starsInSystem: 1,
        planetsInSystem: 1,
        spectralType: "G5V",
        starTempK: 5518,
        starMassSolar: 0.97,
        starRadiusSolar: 0.98,
        starLuminosity: -0.05,
        ra: 285.679,
        dec: 47.898,
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
  it("returns 401 when user is not signed in", async () => {
    mockRequireAuth = async () => {
      const error = new Error("Authentication required");
      error.name = "AuthError";
      throw error;
    };

    const req = new Request("http://localhost/api/user/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "csv", category: "exoplanets", queryParams: {} }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Authentication required");

    mockRequireAuth = async () => ({ userId: "user-1", tier: "free" as const });
  });

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
    expect(text).toContain("Export ID");
    expect(text).toContain("Kepler-22b");
  });

  it("returns JSON document for valid request", async () => {
    const req = new Request("http://localhost/api/user/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format: "json",
        category: "exoplanets",
        queryParams: { limit: 1 },
      }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    const body = await res.json();
    expect(body.meta?.format).toBe("json");
    expect(body.meta?.profile).toBe("basic");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data[0]?.pl_name).toBe("Kepler-22b");
    expect(body.data[0]?.id).toBe("kepler-22b");
    expect(body.data[0]?.source_id).toBeUndefined();
    expect(body.data[0]?.source_url).toBe("https://example.com/kepler-22b");
    expect(body.export?.status).toBe("complete");
  });

  it("returns enriched fields when profile=research", async () => {
    const req = new Request("http://localhost/api/user/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format: "json",
        profile: "research",
        category: "exoplanets",
        queryParams: { limit: 1 },
      }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    const body = await res.json();
    expect(body.meta?.format).toBe("json");
    expect(body.meta?.profile).toBe("research");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data[0]?.pl_name).toBe("Kepler-22b");
    expect(body.data[0]?.source_id).toBe("Kepler-22b");
    expect(body.data[0]?.star_temp_k).toBe(5518);
    expect(body.export?.status).toBe("complete");
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
    expect(text).toContain('"schema":"v1"');
    expect(text).toContain("Kepler-22b");
    expect(text).toContain('"status":"complete"');
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

  it("flattens saved object event payload fields for research profile", async () => {
    const req = new Request("http://localhost/api/user/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format: "json",
        profile: "research",
        category: "saved-objects",
        queryParams: { limit: 10 },
      }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    const body = await res.json();
    expect(body.meta?.profile).toBe("research");
    expect(body.data[0]?.object_type).toBe("cme");
    expect(body.data[0]?.event_id).toBe("2026-02-28T07:09:00-CME-001");
    expect(body.data[0]?.event_type).toBe("CME");
    expect(body.data[0]?.event_speed_kms).toBe(330);
    expect(body.data[0]?.event_half_angle_deg).toBe(29);
    expect(body.data[0]?.event_cme_type).toBe("S");
    expect(body.data[0]?.event_payload_json).toBeUndefined();
    expect(body.data[0]?.saved_at_utc).toBe("2026-03-01T01:30:41.000Z");
  });

  it("includes raw payload when includeRawPayload=true", async () => {
    const req = new Request("http://localhost/api/user/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format: "json",
        profile: "research",
        includeRawPayload: true,
        category: "saved-objects",
        queryParams: { limit: 10 },
      }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data[0]?.event_payload_json).toContain('"eventType":"CME"');
  });

  it("adds decoded keys and app links for saved objects", async () => {
    const req = new Request("http://localhost/api/user/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format: "json",
        profile: "research",
        category: "saved-objects",
        queryParams: { objectType: "exoplanet", limit: 10 },
      }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(1);
    expect(body.data[0]?.object_key).toBe("GJ%203090%20c");
    expect(body.data[0]?.object_key_decoded).toBe("GJ 3090 c");
    expect(body.data[0]?.app_url).toBe("/exoplanets/GJ%203090%20c");
    expect(body.data[0]?.has_event_payload).toBe(false);
  });

  it("filters saved objects by hasEventPayload and date range", async () => {
    const req = new Request("http://localhost/api/user/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format: "json",
        profile: "research",
        category: "saved-objects",
        queryParams: {
          hasEventPayload: true,
          savedAfter: "2026-03-01T01:00:00Z",
          savedBefore: "2026-03-01T01:35:00Z",
          limit: 10,
        },
      }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(1);
    expect(body.data[0]?.object_type).toBe("cme");
  });

  it("supports relational JSON layout for saved objects", async () => {
    const req = new Request("http://localhost/api/user/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format: "json",
        profile: "research",
        layout: "relational",
        category: "saved-objects",
        queryParams: { limit: 10 },
      }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meta?.layout).toBe("relational");
    expect(Array.isArray(body.data?.saved_objects)).toBe(true);
    expect(Array.isArray(body.data?.saved_events)).toBe(true);
    expect(body.data.saved_objects.length).toBe(2);
    expect(body.data.saved_events.length).toBe(1);
  });

  it("returns ZIP for relational CSV layout", async () => {
    const req = new Request("http://localhost/api/user/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format: "csv",
        profile: "research",
        layout: "relational",
        category: "saved-objects",
        includeRawPayload: true,
        queryParams: { limit: 10 },
      }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/zip");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
  });

  it("rejects relational layout for non-saved-object categories", async () => {
    const req = new Request("http://localhost/api/user/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format: "json",
        layout: "relational",
        category: "exoplanets",
        queryParams: { limit: 1 },
      }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_layout");
  });

  it("exports saved objects scoped to a collection when collectionId is provided", async () => {
    const req = new Request("http://localhost/api/user/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format: "csv",
        category: "saved-objects",
        queryParams: { collectionId: 1, limit: 10 },
      }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    const text = await res.text();
    expect(text).toContain("Object ID");
    expect(text).toContain("TRAPPIST-1");
    expect(text).toContain("Primary target");
  });
});
