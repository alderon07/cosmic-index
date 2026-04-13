import { describe, expect, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("@/lib/space-weather/geomagnetic", () => ({
  fetchGeomagneticHp30Snapshot: async () => {
    throw new Error("not used in page test");
  },
  fetchGeomagneticAeSnapshot: async () => {
    throw new Error("not used in page test");
  },
  buildSpaceWeatherGeomagneticSnapshot: async () => ({
    generatedAt: "2026-04-13T23:50:00.000Z",
    hp30: {
      currentValue: 4,
      maxValue24h: 4,
      trend: [
        {
          observedAt: "2026-04-13T23:45:00.000Z",
          hp30: 4,
          ap30: 18,
        },
      ],
      source: {
        label: "GFZ Hp30",
        sourceUrl: "https://kp.gfz.de/en/hp30-hp60/data",
        observedAt: "2026-04-13T23:45:00.000Z",
        fetchedAt: "2026-04-13T23:50:00.000Z",
        quality: "realtime",
      },
    },
    ae: {
      currentValue: 404,
      peakValue24h: 595,
      hourlySeries: [
        {
          hourStart: "2026-03-08T02:00:00.000Z",
          meanValue: 448.4,
          peakValue: 595,
        },
      ],
      source: {
        label: "Kyoto WDC AE",
        sourceUrl: "https://wdc.kugi.kyoto-u.ac.jp/ae_realtime/index.html",
        observedAt: "2026-03-08T02:59:00.000Z",
        fetchedAt: "2026-04-13T23:50:00.000Z",
        quality: "provisional",
      },
      warnings: ["Kyoto AE quicklook values can lag real time by roughly three weeks or less."],
    },
    warnings: [],
    recentEvents: [],
  }),
}));

const { metadata, default: SpaceWeatherGeomagneticPage } = await import(
  "@/app/space-weather/geomagnetic/page"
);

describe("SpaceWeatherGeomagneticPage", () => {
  it("renders the geomagnetic modules with educational content", async () => {
    const html = renderToStaticMarkup(await SpaceWeatherGeomagneticPage());

    expect(html).toContain("Geomagnetic Monitoring");
    expect(html).toContain("GFZ Hp30");
    expect(html).toContain("Kyoto AE");
    expect(html).toContain("404");
    expect(html).toContain("Understanding geomagnetic activity");
    expect(html).toContain("What is the Hp30 index?");
    expect(html).toContain("What is the AE index?");
    expect(html).toContain("About This Data");
  });

  it("publishes canonical metadata for the geomagnetic route", () => {
    expect(metadata.title).toBe("Geomagnetic Monitoring");
    expect(metadata.alternates).toMatchObject({
      canonical: "https://cosmicindex.dev/space-weather/geomagnetic",
    });
  });
});
