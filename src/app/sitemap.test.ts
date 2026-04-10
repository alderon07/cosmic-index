import { describe, expect, it } from "bun:test";
import sitemap from "@/app/sitemap";

describe("main sitemap metadata route", () => {
  it("includes all public hub routes", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual([
      "https://cosmicindex.dev",
      "https://cosmicindex.dev/exoplanets",
      "https://cosmicindex.dev/stars",
      "https://cosmicindex.dev/small-bodies",
      "https://cosmicindex.dev/close-approaches",
      "https://cosmicindex.dev/fireballs",
      "https://cosmicindex.dev/space-weather",
    ]);
    expect(entries.every((entry) => typeof entry.lastModified === "string")).toBe(true);
  });
});
