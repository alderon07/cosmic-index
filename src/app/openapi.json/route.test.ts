import { afterEach, describe, expect, it } from "bun:test";
import { GET } from "@/app/openapi.json/route";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
});

describe("GET /openapi.json", () => {
  it("returns 404 in production", async () => {
    process.env.NODE_ENV = "production";

    const response = await GET(new Request("https://example.com/openapi.json"));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "not_found" });
  });

  it("redirects to internal spec endpoint in non-production", async () => {
    process.env.NODE_ENV = "development";

    const response = await GET(new Request("https://example.com/openapi.json"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://example.com/api/internal/openapi");
  });
});
