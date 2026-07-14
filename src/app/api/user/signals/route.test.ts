import { describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";

mock.module("@/lib/auth", () => ({
  requireAuth: async () => ({ userId: "user-1", tier: "free", isPro: false }),
  authErrorResponse: (error: unknown) => Response.json({ error: String(error) }, { status: 401 }),
}));

mock.module("@/lib/observatory-store", () => ({
  decodeObservatoryCursor: () => null,
  listSignals: async () => ({ signals: [], nextCursor: null, hasMore: false }),
  countUnreadSignals: async () => 3,
  setSignalReadState: async () => true,
  markAllSignalsRead: async () => 3,
  listWatches: async () => ({ watches: [], nextCursor: null, hasMore: false, total: 0, usage: { current: 0, limit: 1, remaining: 1 } }),
  createWatch: async () => ({ status: "limit", usage: { current: 1, limit: 1, remaining: 0 } }),
}));

const signalRoute = await import("@/app/api/user/signals/route");
const unreadRoute = await import("@/app/api/user/signals/unread-count/route");
const readAllRoute = await import("@/app/api/user/signals/read-all/route");

describe("Signal APIs", () => {
  it("lists private, cursor-paginated signals", async () => {
    const response = await signalRoute.GET(new NextRequest("http://localhost/api/user/signals?status=unread"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("returns a lightweight unread count", async () => {
    const response = await unreadRoute.GET();
    expect(await response.json()).toEqual({ unreadCount: 3 });
  });

  it("requires same origin before marking all read", async () => {
    const response = await readAllRoute.POST(new NextRequest("http://localhost/api/user/signals/read-all", { method: "POST" }));
    expect(response.status).toBe(403);
  });
});
