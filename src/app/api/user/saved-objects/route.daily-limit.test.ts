import { describe, it, expect, mock } from "bun:test";
import type { NextRequest } from "next/server";

const db = {
  execute: async ({ sql }: { sql: string; args?: unknown[] }) => {
    if (sql.includes("WHERE user_id = ? AND canonical_id = ?")) {
      return { rows: [] };
    }
    if (sql.includes("SELECT COUNT(*) as total FROM saved_objects WHERE user_id = ?")) {
      return { rows: [{ total: 0 }] };
    }
    if (sql.includes("created_at >= datetime('now', '-1 day')")) {
      return { rows: [{ total: 25 }] };
    }
    if (sql.includes("MIN(strftime('%s', created_at)) as earliest_epoch")) {
      return { rows: [{ earliest_epoch: 1700000000 }] };
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

mock.module("@/lib/canonical-id", () => ({
  parseCanonicalId: () => ({ type: "exoplanet", id: "kepler-22-b" }),
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
