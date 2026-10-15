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
      "https://cosmicindex.dev/faq",
      "https://cosmicindex.dev/learn",
      "https://cosmicindex.dev/about",
      "https://cosmicindex.dev/learn/fireball-selection",
      "https://cosmicindex.dev/learn/trappist-1-comparison",
      "https://cosmicindex.dev/learn/comparing-exoplanets",
      "https://cosmicindex.dev/learn/reading-space-weather",
      "https://cosmicindex.dev/learn/understanding-asteroid-flybys",
      "https://cosmicindex.dev/learn/2023-bu-close-approach",
      "https://cosmicindex.dev/learn/may-2024-geomagnetic-storm",
      "https://cosmicindex.dev/space-weather",
      "https://cosmicindex.dev/space-weather/events",
      "https://cosmicindex.dev/space-weather/alerts",
      "https://cosmicindex.dev/space-weather/solar",
      "https://cosmicindex.dev/space-weather/solar-wind",
      "https://cosmicindex.dev/space-weather/geomagnetic",
    ]);
    expect(entries.find((entry) => entry.url.endsWith("/learn/fireball-selection"))?.lastModified).toBe("2026-10-14");
    expect(entries.find((entry) => entry.url.endsWith("/learn/comparing-exoplanets"))?.lastModified).toBe("2026-10-14");
    expect(entries.find((entry) => entry.url.endsWith("/learn/2023-bu-close-approach"))?.lastModified).toBe("2026-09-08");
    expect(entries.filter((entry) => !entry.url.includes("/learn/")).every((entry) => entry.lastModified === undefined)).toBe(true);
    expect(entries.every((entry) => entry.changeFrequency === undefined)).toBe(true);
    expect(entries.every((entry) => entry.priority === undefined)).toBe(true);
  });
});
