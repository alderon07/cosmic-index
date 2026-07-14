import { beforeEach, describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";

let createResult: unknown;

mock.module("@/lib/auth", () => ({
  requireAuth: async () => ({ userId: "user-1", tier: "free", isPro: false }),
  authErrorResponse: (error: unknown) => Response.json({ error: String(error) }, { status: 401 }),
}));

mock.module("@/lib/observatory-store", () => ({
  decodeObservatoryCursor: () => null,
  listWatches: async () => ({ watches: [], nextCursor: null, hasMore: false, total: 0, usage: { current: 0, limit: 1, remaining: 1 } }),
  createWatch: async () => createResult,
  listSignals: async () => ({ signals: [], nextCursor: null, hasMore: false }),
  countUnreadSignals: async () => 3,
  setSignalReadState: async () => true,
  markAllSignalsRead: async () => 3,
}));

mock.module("@/lib/observatory-mutation-limit", () => ({
  requireObservatoryMutationBudget: async () => null,
}));

const { GET, POST } = await import("@/app/api/user/alerts/route");

describe("/api/user/alerts", () => {
  beforeEach(() => {
    createResult = {
      status: "created",
      watch: {
        id: 1,
        name: "Strong space weather",
        alertType: "space_weather",
        config: { schemaVersion: 1, categories: ["gst"], minimumSeverity: "strong" },
        enabled: true,
        createdAt: "2026-07-12T00:00:00.000Z",
        updatedAt: "2026-07-12T00:00:00.000Z",
      },
      usage: { current: 1, limit: 1, remaining: 0 },
    };
  });

  it("returns private cursor-paginated watch usage for free users", async () => {
    const response = await GET(new NextRequest("http://localhost/api/user/alerts?limit=10"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect((await response.json()).usage.limit).toBe(1);
  });

  it("creates a typed watch with email delivery absent", async () => {
    const response = await POST(new NextRequest("http://localhost/api/user/alerts", {
      method: "POST",
      headers: { origin: "http://localhost", host: "localhost", "content-type": "application/json" },
      body: JSON.stringify({
        name: "Strong space weather",
        alertType: "space_weather",
        config: { schemaVersion: 1, categories: ["gst"], minimumSeverity: "strong" },
      }),
    }));
    expect(response.status).toBe(201);
    expect(await response.json()).not.toHaveProperty("emailEnabled");
  });

  it("returns 409 when the free watch allowance is exhausted", async () => {
    createResult = { status: "limit", usage: { current: 1, limit: 1, remaining: 0 } };
    const response = await POST(new NextRequest("http://localhost/api/user/alerts", {
      method: "POST",
      headers: { origin: "http://localhost", host: "localhost", "content-type": "application/json" },
      body: JSON.stringify({
        name: "Near Earth",
        alertType: "close_approach",
        config: { schemaVersion: 1, maxDistanceLd: 5, leadTimeDays: 7, phaOnly: false },
      }),
    }));
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("WATCH_LIMIT_REACHED");
  });
});
