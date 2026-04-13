import { beforeEach, describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";

let mockObjects = [{ id: "433-eros" }];

mock.module("@/lib/jpl-sbdb", () => ({
  fetchSmallBodies: async () => ({
    objects: mockObjects,
    total: mockObjects.length,
    page: 1,
    limit: 100,
    hasMore: false,
  }),
}));

const { GET } = await import("@/app/sitemap-small-bodies/route");

beforeEach(() => {
  mockObjects = [{ id: "433-eros" }];
});

describe("GET /sitemap-small-bodies", () => {
  it("returns xml sitemap entries for indexed small bodies without crawler-facing throttling", async () => {
    const response = await GET(new NextRequest("http://localhost:3000/sitemap-small-bodies"));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/xml");
    expect(body).toContain("<loc>https://cosmicindex.dev/small-bodies/433-eros</loc>");
    expect(body).not.toContain("<lastmod>");
  });
});
