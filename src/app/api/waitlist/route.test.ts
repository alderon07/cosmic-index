import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import type { NextRequest } from "next/server";

let mockRequireAuth = async () => ({ userId: "user-1", email: "user@example.com", tier: "free" as const });

const mockDb = {};
const mockUpsertWaitlistSignup = mock(async () => "joined");
const mockIncrementWaitlistSignupsDaily = mock(async () => {});
const mockCleanupWaitlistArtifacts = mock(async () => {});
const mockCheckWaitlistRateLimit = mock(async () => ({
  allowed: true,
  retryAfterSec: 0,
  unavailable: false,
}));

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

mock.module("@/lib/runtime-mode", () => ({
  isClerkServerConfigured: () => true,
  isClerkClientConfigured: () => true,
  getConfiguredLimitMode: () => "shadow",
  getForceEnforce: () => false,
  getWaitlistEnabled: () => true,
  getWaitlistEnforceThreshold: () => 125,
  getProSurfacesEnabled: () => false,
  getProBillingEnabled: () => false,
  getInternalAdminIds: () => [],
  getProRolloutAdminIds: () => [],
}));

mock.module("@/lib/user-db", () => ({
  getUserDb: () => mockDb,
  requireUserDb: () => mockDb,
}));

mock.module("@/lib/waitlist-rate-limit", () => ({
  checkWaitlistRateLimit: (...args: Parameters<typeof mockCheckWaitlistRateLimit>) =>
    mockCheckWaitlistRateLimit(...args),
}));

mock.module("@/lib/waitlist", () => ({
  parseWaitlistSource: () => "billing",
  normalizeEmail: (value: string) => value.trim().toLowerCase(),
  getActiveWaitlistCount: async () => 0,
  upsertWaitlistSignup: (...args: Parameters<typeof mockUpsertWaitlistSignup>) =>
    mockUpsertWaitlistSignup(...args),
  incrementWaitlistSignupsDaily: (...args: Parameters<typeof mockIncrementWaitlistSignupsDaily>) =>
    mockIncrementWaitlistSignupsDaily(...args),
  recordLimitHitWithDedup: async () => {},
  cleanupWaitlistArtifacts: (...args: Parameters<typeof mockCleanupWaitlistArtifacts>) =>
    mockCleanupWaitlistArtifacts(...args),
}));

const { POST } = await import("@/app/api/waitlist/route");

afterAll(() => {
  mock.restore();
});

beforeEach(() => {
  mockRequireAuth = async () => ({ userId: "user-1", email: "user@example.com", tier: "free" as const });
  mockUpsertWaitlistSignup.mockClear();
  mockIncrementWaitlistSignupsDaily.mockClear();
  mockCleanupWaitlistArtifacts.mockClear();
  mockCheckWaitlistRateLimit.mockClear();
});

describe("POST /api/waitlist", () => {
  it("returns 401 when user is not signed in", async () => {
    mockRequireAuth = async () => {
      const error = new Error("Authentication required");
      error.name = "AuthError";
      throw error;
    };

    const req = new Request("http://localhost/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", source: "billing" }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(401);
    expect(mockUpsertWaitlistSignup).not.toHaveBeenCalled();
  });

  it("creates waitlist signup for signed-in users", async () => {
    const req = new Request("http://localhost/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", source: "billing" }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe("joined");

    expect(mockUpsertWaitlistSignup).toHaveBeenCalledTimes(1);
    const params = mockUpsertWaitlistSignup.mock.calls[0]?.[0] as { userId: string };
    expect(params.userId).toBe("user-1");
    expect(params.emailRaw).toBe("user@example.com");
    expect(mockCheckWaitlistRateLimit).toHaveBeenCalledTimes(1);
    const rateLimitParams = mockCheckWaitlistRateLimit.mock.calls[0]?.[0] as { userId: string; emailNormalized: string };
    expect(rateLimitParams.userId).toBe("user-1");
    expect(rateLimitParams.emailNormalized).toBe("user@example.com");
    expect(mockIncrementWaitlistSignupsDaily).toHaveBeenCalledTimes(1);
    expect(mockCleanupWaitlistArtifacts).toHaveBeenCalledTimes(1);
  });

  it("rejects attempts to submit an email different from the authenticated account email", async () => {
    const req = new Request("http://localhost/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "other@example.com", source: "billing" }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe("email_mismatch");
    expect(mockCheckWaitlistRateLimit).not.toHaveBeenCalled();
    expect(mockUpsertWaitlistSignup).not.toHaveBeenCalled();
  });

  it("falls back to signed-in account email when request omits email", async () => {
    const req = new Request("http://localhost/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "billing" }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(201);
    expect(mockUpsertWaitlistSignup).toHaveBeenCalledTimes(1);
    const params = mockUpsertWaitlistSignup.mock.calls[0]?.[0] as { emailRaw: string };
    expect(params.emailRaw).toBe("user@example.com");
  });

  it("returns 400 when authenticated account email is unavailable", async () => {
    mockRequireAuth = async () => ({ userId: "user-1", email: "", tier: "free" as const });

    const req = new Request("http://localhost/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "billing" }),
    });

    const res = await POST(req as unknown as NextRequest);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("account_email_unavailable");
    expect(mockCheckWaitlistRateLimit).not.toHaveBeenCalled();
    expect(mockUpsertWaitlistSignup).not.toHaveBeenCalled();
  });
});
