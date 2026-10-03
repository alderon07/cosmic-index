import { describe, expect, it } from "bun:test";
import robots from "@/app/robots";

describe("robots metadata route", () => {
  it("blocks AhrefsBot while keeping public pages available to other crawlers", () => {
    const result = robots();

    expect(result.rules).toContainEqual({
      userAgent: "AhrefsBot",
      disallow: "/",
    });
    expect(result.rules).toContainEqual({
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    });
  });

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
    ]);
  });
});
