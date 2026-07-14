import { afterEach, describe, expect, it } from "bun:test";
import { fetchUnreadCount, fetchWatches } from "@/components/observatory/api";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("Observatory client API", () => {
  it("requests the next Watch page with its opaque cursor", async () => {
    let requested = "";
    globalThis.fetch = (async (input) => {
      requested = String(input);
      return Response.json({
        alerts: [], usage: { current: 21, limit: 50, remaining: 29 },
        total: 21, hasMore: false, nextCursor: null,
      });
    }) as typeof fetch;

    await fetchWatches("opaque cursor");

    expect(requested).toBe("/api/user/alerts?limit=20&cursor=opaque+cursor");
  });

  it("parses the exact unread count", async () => {
    globalThis.fetch = (async () => Response.json({ unreadCount: 37 })) as typeof fetch;
    expect(await fetchUnreadCount()).toBe(37);
  });
});
