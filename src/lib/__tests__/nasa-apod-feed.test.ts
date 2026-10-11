import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { fetchAPOD } from "../nasa-apod";
import { __resetCacheStateForTests } from "../cache";
import { APODQuerySchema } from "../types";

const originalFetch = globalThis.fetch;
const entry = {
  date: "2026-10-10", title: "Lunar Farside", media_type: "image",
  url: "https://science.nasa.gov/image-article/lunar-farside/",
  permalink: "https://science.nasa.gov/image-article/lunar-farside/",
  hdurl: "https://assets.science.nasa.gov/moon.jpg",
  explanation: "<strong>Explanation:</strong> The Moon&#039;s <a href='/'>farside</a>.<br><br><strong>Tomorrow's picture:</strong> More space",
  credit: "<a href='/'>NASA</a> &amp; GSFC",
};
beforeEach(() => __resetCacheStateForTests());
afterEach(() => { globalThis.fetch = originalFetch; __resetCacheStateForTests(); });

describe("NASA Science APOD feed", () => {
  it("uses the real image and publication date, with readable text and credits", async () => {
    let requested = "";
    globalThis.fetch = async (input) => { requested = String(input); return Response.json([entry]); };
    const data = await fetchAPOD();
    expect(requested).toContain("science.nasa.gov/wp-json/wp/v2/apod-basic");
    expect(new URL(requested).searchParams.get("per_page")).toBe("1");
    expect(data).toMatchObject({ date: entry.date, title: entry.title, imageUrl: entry.hdurl,
      explanation: "The Moon's farside.", copyright: "NASA & GSFC", sourceUrl: entry.permalink });
  });
  it("uses the dated path and rejects a mismatched upstream date", async () => {
    let requested = "";
    globalThis.fetch = async (input) => { requested = String(input); return Response.json(entry); };
    await expect(fetchAPOD("2026-10-09")).rejects.toThrow(/date/i);
    expect(new URL(requested).pathname).toEndWith("/261009");
  });
  it("extracts an approved video embed rather than embedding the article", async () => {
    globalThis.fetch = async () => Response.json([{ ...entry, media_type: "video",
      basic_html: '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>' }]);
    expect(await fetchAPOD()).toMatchObject({ mediaType: "video",
      imageUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0", thumbnailUrl: entry.hdurl });
  });
  it("rejects empty, malformed, and unsafe image feeds", async () => {
    for (const payload of [[], [{ date: entry.date }], [{ ...entry, hdurl: "https://evil.test/moon.jpg" }]]) {
      globalThis.fetch = async () => Response.json(payload);
      await expect(fetchAPOD()).rejects.toThrow();
    }
  });
  it("does not accept impossible calendar dates or unknown query parameters", () => {
    expect(APODQuerySchema.safeParse({ date: "2026-02-30" }).success).toBe(false);
    expect(APODQuerySchema.safeParse({ surprise: "true" }).success).toBe(false);
    expect(APODQuerySchema.safeParse({ date: "2024-02-29" }).success).toBe(true);
  });
});
