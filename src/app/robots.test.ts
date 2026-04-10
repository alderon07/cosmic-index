import { describe, expect, it } from "bun:test";
import robots from "@/app/robots";

describe("robots metadata route", () => {
  it("includes explicit AI retrieval bot rules and sitemap references", () => {
    const result = robots();

    expect(result.rules).toContainEqual({
      userAgent: "OAI-SearchBot",
      allow: "/",
      disallow: ["/api/"],
    });
    expect(result.rules).toContainEqual({
      userAgent: "ChatGPT-User",
      allow: "/",
      disallow: ["/api/"],
    });
    expect(result.rules).toContainEqual({
      userAgent: "Claude-SearchBot",
      allow: "/",
      disallow: ["/api/"],
    });
    expect(result.rules).toContainEqual({
      userAgent: "Claude-User",
      allow: "/",
      disallow: ["/api/"],
    });
    expect(result.sitemap).toEqual([
      "https://cosmicindex.dev/sitemap.xml",
      "https://cosmicindex.dev/sitemap-exoplanets",
      "https://cosmicindex.dev/sitemap-stars",
      "https://cosmicindex.dev/sitemap-small-bodies",
    ]);
  });
});
