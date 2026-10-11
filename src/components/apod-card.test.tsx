import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { APODCard } from "./apod-card";
import type { APODData } from "@/lib/types";
const entry: APODData = { date: "2026-10-10", title: "Lunar Farside", explanation: "A lunar mosaic.",
  mediaType: "image", imageUrl: "https://assets.science.nasa.gov/moon.jpg",
  sourceUrl: "https://science.nasa.gov/image-article/moon/", copyright: "NASA / GSFC" };
describe("APODCard", () => {
  it("keeps the entire picture visible and links to the canonical NASA article", () => {
    const html = renderToStaticMarkup(<APODCard initialApod={entry} />);
    expect(html).toContain("object-contain");
    expect(html).toContain(entry.sourceUrl!);
    expect(html).toContain("Credit: NASA / GSFC");
    expect(html).not.toContain("apod.nasa.gov/apod/ap");
  });
  it("uses the publication date consistently across time zones", () => {
    const original = process.env.TZ;
    try {
      process.env.TZ = "UTC";
      const server = renderToStaticMarkup(<APODCard initialApod={entry} />);
      process.env.TZ = "America/New_York";
      expect(renderToStaticMarkup(<APODCard initialApod={entry} />)).toBe(server);
      expect(server).toContain("Saturday, October 10, 2026");
    } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
  });
  it("shows a useful fallback during an upstream outage", () => {
    const html = renderToStaticMarkup(<APODCard initialError="unavailable" />);
    expect(html).toContain("temporarily unavailable");
    expect(html).toContain("https://science.nasa.gov/apod/");
  });
});
