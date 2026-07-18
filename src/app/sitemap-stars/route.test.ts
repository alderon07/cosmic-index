import { beforeEach, describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";

let mockObjects = [{ id: "trappist-1" }];
let mockHasMore = false;
let mockFailure = false;

mock.module("@/lib/star-index", () => ({
  searchStars: async () => {
    if (mockFailure) throw new Error("Index unavailable");
    return {
      objects: mockObjects,
      total: mockObjects.length,
      page: 1,
      limit: 10000,
      hasMore: mockHasMore,
      usedCursor: false,
    };
  },
  getStarBySlug: async () => null,
}));

const { GET } = await import("@/app/sitemap-stars/route");

beforeEach(() => {
  mockObjects = [{ id: "trappist-1" }];
  mockHasMore = false;
  mockFailure = false;
});

describe("GET /sitemap-stars", () => {
  it("returns a retryable error instead of an empty successful sitemap", async () => {
    mockFailure = true;

    const response = await GET(new NextRequest("http://localhost:3000/sitemap-stars"));

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("retry-after")).toBe("300");
  });

  it("returns xml sitemap entries from the indexed stars catalog", async () => {
    const response = await GET(new NextRequest("http://localhost:3000/sitemap-stars"));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/xml");
    expect(body).toContain("<loc>https://cosmicindex.dev/stars/trappist-1</loc>");
    expect(body).not.toContain("<lastmod>");
  });
});
