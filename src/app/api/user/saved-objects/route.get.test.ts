import { describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";

const db = {
  execute: async ({ sql }: { sql: string; args?: unknown[] }) => {
    if (sql.includes("SELECT COUNT(*) as total FROM saved_objects WHERE user_id = ?")) {
      return { rows: [{ total: 2 }] };
    }
    if (sql.includes("created_at >= datetime('now', '-1 day')")) {
      return { rows: [{ total: 1 }] };
    }
    if (sql.includes("SELECT id, canonical_id, display_name, notes, event_payload, created_at")) {
      return {
        rows: [
          {
            id: 42,
            canonical_id: "exoplanet:Kepler-22b",
            display_name: "Kepler-22b",
            notes: null,
            event_payload: null,
            created_at: "2026-03-01T00:00:00.000Z",
          },
          {
            id: 41,
            canonical_id: "star:TRAPPIST-1",
            display_name: "TRAPPIST-1",
            notes: null,
            event_payload: null,
            created_at: "2026-02-28T00:00:00.000Z",
          },
        ],
      };
    }
    return { rows: [] };
  },
};

mock.module("@/lib/auth", () => ({
  getAuthUser: async () => ({ userId: "user-1", tier: "free", isPro: false, email: "user@example.com" }),
  requireAuth: async () => ({ userId: "user-1", tier: "free", isPro: false, email: "user@example.com" }),
  requirePro: async () => ({ userId: "user-1", tier: "pro", isPro: true, email: "user@example.com" }),
  authErrorResponse: (error: unknown) =>
    new Response(JSON.stringify({ error: String(error) }), { status: 401 }),
}));

mock.module("@/lib/runtime-mode", () => ({
  getConfiguredLimitMode: () => "enforce",
  getForceEnforce: () => false,
  getWaitlistEnabled: () => false,
  getWaitlistEnforceThreshold: () => 125,
  getProSurfacesEnabled: () => false,
  getProBillingEnabled: () => false,
  getProRolloutAdminIds: () => [],
}));

mock.module("@/lib/user-db", () => ({
  getUserDb: () => db,
  requireUserDb: () => db,
}));

const { GET } = await import("@/app/api/user/saved-objects/route");

describe("GET /api/user/saved-objects", () => {
  it("returns cursor pagination metadata when more objects exist", async () => {
    const req = new NextRequest("http://localhost/api/user/saved-objects?limit=1");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.objects).toHaveLength(1);
    expect(body.limit).toBe(1);
    expect(body.hasMore).toBe(true);
    expect(typeof body.nextCursor).toBe("string");
  });

  it("returns 400 for invalid cursor format", async () => {
    const req = new NextRequest("http://localhost/api/user/saved-objects?cursor=not-valid");
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_cursor");
  });
});
