import { describe, expect, it } from "bun:test";
import { NextRequest } from "next/server";
import { RANDOM_OBJECT_PATHS } from "@/lib/random-object";
import { GET } from "@/app/random-object/route";

describe("GET /random-object", () => {
  it("redirects to an available object detail route without caching", () => {
    const response = GET(
      new NextRequest("https://cosmicindex.dev/random-object"),
    );
    const location = response.headers.get("location");

    expect(response.status).toBe(307);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(location).not.toBeNull();
    expect(
      RANDOM_OBJECT_PATHS.some(
        (path) => location === new URL(path, "https://cosmicindex.dev").toString(),
      ),
    ).toBe(true);
  });
});
