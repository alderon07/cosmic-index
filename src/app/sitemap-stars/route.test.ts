import { describe, expect, it } from "bun:test";
import { GET } from "@/app/sitemap-stars/route";

describe("GET /sitemap-stars", () => {
  it("only exposes manually curated catalog detail pages", async () => {
    const response = GET();
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/xml");
    expect(body).not.toContain("<loc>");
  });
});
