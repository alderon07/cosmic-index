import { describe, it, expect, mock } from "bun:test";
import type { NextRequest } from "next/server";
import { BASE_URL } from "@/lib/config";

const db = {
  execute: async ({ sql }: { sql: string; args?: unknown[] }) => {
    if (sql.includes("WHERE user_id = ? AND canonical_id = ?")) {
      return { rows: [] };
    }
    if (sql.includes("created_at >= datetime('now', '-1 day')")) {
      return { rows: [{ total: 0 }] };
    }
    if (sql.includes("SELECT COUNT(*) as total FROM saved_objects WHERE user_id = ?")) {
      return { rows: [{ total: 150 }] };
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
  getProGate: () => ({
    productEnabled: false,
    billingEnabled: false,
    surfacesEnabled: false,
    waitlistEnabled: false,
    configuredLimitMode: "enforce" as const,
    forceEnforce: false,
    waitlistEnforceThreshold: 125,
  }),
  isProFeatureEnabled: () => false,
  isClerkServerConfigured: () => true,
  isClerkClientConfigured: () => true,
  getConfiguredLimitMode: () => "enforce",
  getForceEnforce: () => false,
  getWaitlistEnabled: () => false,
  getWaitlistEnforceThreshold: () => 125,
  getProSurfacesEnabled: () => false,
  getProBillingEnabled: () => false,
  getInternalAdminIds: () => [],
  getProRolloutAdminIds: () => [],
}));

mock.module("@/lib/user-db", () => ({
  getUserDb: () => db,
  requireUserDb: () => db,
}));

mock.module("@/lib/canonical-id", () => ({
  parseCanonicalId: (canonicalId: string) => {
    const [type, id] = canonicalId.split(":", 2);
    if (!type || !id) return null;
    return { type, id };
  },
}));

const { POST } = await import("@/app/api/user/saved-objects/route");
const SAME_ORIGIN = new URL(BASE_URL).origin;

function createSameOriginRequest(url: string, init: RequestInit): NextRequest {
  const headers = new Headers(init.headers);
  headers.set("Origin", SAME_ORIGIN);
  return new Request(url, { ...init, headers }) as unknown as NextRequest;
}

describe("/api/user/saved-objects POST", () => {
  it("returns 400 when attempting to save a fireball object", async () => {
    const req = createSameOriginRequest("http://localhost/api/user/saved-objects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        canonicalId: "fireball:abc123def456abc123def456",
        displayName: "Fireball Test",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("unsupported_object_type");
  });

  it("returns 403 when free-tier total saved objects limit is reached", async () => {
    const req = createSameOriginRequest("http://localhost/api/user/saved-objects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        canonicalId: "exoplanet:kepler-22-b",
        displayName: "Kepler-22b",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("saved_objects_limit_reached");
  });
});
