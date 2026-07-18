import { beforeEach, describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";

let mockObjects = [{ id: "kepler-22-b" }];
let mockHasMore = false;
let mockFailure = false;

class ExoplanetIndexUnavailableError extends Error {
  constructor(message = "Index is temporarily unavailable.") {
    super(message);
    this.name = "ExoplanetIndexUnavailableError";
  }
}

mock.module("@/lib/exoplanet-index", () => ({
  searchExoplanets: async () => {
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
  getExoplanetBySlug: async () => null,
  ExoplanetIndexUnavailableError,
}));

const { GET } = await import("@/app/sitemap-exoplanets/route");

beforeEach(() => {
  mockObjects = [{ id: "kepler-22-b" }];
  mockHasMore = false;
  mockFailure = false;
});

describe("GET /sitemap-exoplanets", () => {
  it("returns a retryable error instead of an empty successful sitemap", async () => {
    mockFailure = true;

    const response = await GET(new NextRequest("http://localhost:3000/sitemap-exoplanets"));

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("retry-after")).toBe("300");
  });

  it("returns xml sitemap entries from the indexed exoplanet catalog", async () => {
    const response = await GET(new NextRequest("http://localhost:3000/sitemap-exoplanets"));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/xml");
    expect(body).toContain("<loc>https://cosmicindex.dev/exoplanets/kepler-22-b</loc>");
    expect(body).not.toContain("<lastmod>");
  });
});
