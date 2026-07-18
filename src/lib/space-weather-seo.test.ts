import { describe, expect, it } from "bun:test";
import { buildSpaceWeatherEventMetadata } from "@/lib/space-weather-seo";
import type { SolarFlareEvent } from "@/lib/types";

const flare: SolarFlareEvent = {
  id: "2026-07-18T12:00:00-FLR-001",
  eventType: "FLR",
  startTime: "2026-07-18T12:00:00Z",
  classType: "M2.1",
};

describe("space weather event SEO", () => {
  it("keeps transient event details crawlable but out of the search index", () => {
    const metadata = buildSpaceWeatherEventMetadata(flare);

    expect(metadata.title).toContain("Solar Flare");
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: true,
      googleBot: { index: false, follow: true },
    });
    expect(metadata.alternates?.canonical).toBe(
      "https://cosmicindex.dev/space-weather/2026-07-18T12%3A00%3A00-FLR-001",
    );
  });
});
