import { describe, it, expect, mock } from "bun:test";
import type { NextRequest } from "next/server";

const db = {
  execute: async ({ sql }: { sql: string; args?: unknown[] }) => {
    if (sql.includes("WHERE user_id = ? AND category = ? AND params_hash = ?")) {
      return { rows: [] };
    }
    if (sql.includes("SELECT COUNT(*) as total FROM saved_searches WHERE user_id = ?")) {
      return { rows: [{ total: 100 }] };
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

mock.module("@/lib/saved-searches", () => ({
  canonicalizeAndHash: () => ({ canonical: JSON.stringify({ query: "kepler" }), hash: "abc123" }),
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
