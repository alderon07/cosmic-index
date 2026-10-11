import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { __resetCacheStateForTests } from "@/lib/cache";
import { getTodayDateString } from "@/lib/nasa-apod";
const originalFetch = globalThis.fetch;
let calls = 0;
let client = 0;
const entry = { date: "2026-10-10", title: "Moon", explanation: "A lunar mosaic.",
  permalink: "https://science.nasa.gov/image-article/moon/", media_type: "image",
  hdurl: "https://assets.science.nasa.gov/moon.jpg" };
function request(query = "") {
  return GET(new NextRequest(`http://localhost:3000/api/v1/apod${query}`, { headers: { "User-Agent": `apod-test-${client++}` } }));
}
beforeEach(() => {
  calls = 0; __resetCacheStateForTests();
  globalThis.fetch = async () => { calls++; return Response.json([entry]); };
});
afterEach(() => { globalThis.fetch = originalFetch; __resetCacheStateForTests(); });
describe("GET /api/v1/apod", () => {
  it("returns the latest published entry with cache and rate-limit headers", async () => {
    const response = await request();
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ date: entry.date, imageUrl: entry.hdurl, sourceUrl: entry.permalink });
    expect(response.headers.get("RateLimit-Limit")).not.toBeNull();
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=");
  });
  it.each(["?date=2026-02-30", "?date=tomorrow", "?date=2099-01-01", "?date=1995-06-15", "?unknown=1"])(
    "rejects invalid requests without contacting NASA: %s", async (query) => {
      expect((await request(query)).status).toBe(400);
      expect(calls).toBe(0);
    });
  it.each([404, 503, 429])("maps upstream %s to a safe error response", async (status) => {
    globalThis.fetch = async () => new Response("upstream error", { status });
    const response = await request();
    expect(response.status).toBe(status === 404 ? 404 : 503);
    if (status !== 404) expect(response.headers.get("Retry-After")).toBe("60");
  });
  it("returns 502 for an upstream schema change", async () => {
    globalThis.fetch = async () => Response.json([{ wrong: "shape" }]);
    const response = await request();
    expect(response.status).toBe(502);
    expect((await response.json()).error.code).toBe("CONTRACT_MISMATCH");
  });
  it("honors Eastern calendar boundaries and daylight saving time", () => {
    expect(getTodayDateString(new Date("2026-07-01T04:30:00Z"))).toBe("2026-07-01");
    expect(getTodayDateString(new Date("2026-01-01T04:30:00Z"))).toBe("2025-12-31");
  });
});
