import { describe, expect, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("@/lib/space-weather/solar-wind", () => ({
  buildSpaceWeatherSolarWindSnapshot: async () => ({
    generatedAt: "2026-04-14T18:05:00.000Z",
    snapshot: {
      current: {
        speedKms: 552.1,
        densityPerCc: 2.6,
        temperatureK: 125000,
        btNt: 9.3,
        bzNt: -11.4,
      },
      plasma: {
        currentValue: {
          observedAt: "2026-04-14T17:02:00.000Z",
          speedKms: 552.1,
          densityPerCc: 2.6,
          temperatureK: 125000,
        },
        trend: [
          {
            observedAt: "2026-04-14T17:02:00.000Z",
            speedKms: 552.1,
            densityPerCc: 2.6,
            temperatureK: 125000,
          },
        ],
        source: {
          label: "NOAA SWPC Real-Time Solar Wind Plasma",
          sourceUrl: "https://www.swpc.noaa.gov/products/real-time-solar-wind",
          observedAt: "2026-04-14T17:02:00.000Z",
          fetchedAt: "2026-04-14T18:05:00.000Z",
          quality: "realtime",
        },
      },
      imf: {
        currentValue: {
          observedAt: "2026-04-14T17:02:00.000Z",
          bxNt: -1.8,
          byNt: 5.3,
          bzNt: -11.4,
          btNt: 9.3,
          lonGsmDeg: 108.8,
          latGsmDeg: -31.1,
        },
        trend: [
          {
            observedAt: "2026-04-14T17:02:00.000Z",
            bxNt: -1.8,
            byNt: 5.3,
            bzNt: -11.4,
            btNt: 9.3,
            lonGsmDeg: 108.8,
            latGsmDeg: -31.1,
          },
        ],
        source: {
          label: "NOAA SWPC Real-Time IMF",
          sourceUrl: "https://www.swpc.noaa.gov/products/real-time-solar-wind",
          observedAt: "2026-04-14T17:02:00.000Z",
          fetchedAt: "2026-04-14T18:05:00.000Z",
          quality: "realtime",
        },
      },
      propagated: {
        currentValue: {
          observedAt: "2026-04-14T17:02:00.000Z",
          propagatedAt: "2026-04-14T17:55:00.000Z",
          speedKms: 548.5,
          densityPerCc: 2.61,
          temperatureK: 123500,
          bxNt: -1.8,
          byNt: 4.5,
          bzNt: -10.1,
          btNt: 10,
        },
        trend: [
          {
            observedAt: "2026-04-14T17:02:00.000Z",
            propagatedAt: "2026-04-14T17:55:00.000Z",
            speedKms: 548.5,
            densityPerCc: 2.61,
            temperatureK: 123500,
            bxNt: -1.8,
            byNt: 4.5,
            bzNt: -10.1,
            btNt: 10,
          },
        ],
        source: {
          label: "NOAA SWPC Propagated Solar Wind",
          sourceUrl: "https://services.swpc.noaa.gov/products/geospace/propagated-solar-wind-1-hour.json",
          observedAt: "2026-04-14T17:02:00.000Z",
          fetchedAt: "2026-04-14T18:05:00.000Z",
          quality: "operational",
        },
      },
      interpretation: {
        bzState: "southward",
        couplingRisk: "storm-favorable",
        summary: "Strongly southward IMF and elevated solar wind speed support efficient geomagnetic coupling.",
      },
    },
    warnings: [],
  }),
  fetchSolarWindPlasmaSnapshot: async () => {
    throw new Error("not used in solar-wind page test");
  },
  fetchSolarWindImfSnapshot: async () => {
    throw new Error("not used in solar-wind page test");
  },
  fetchPropagatedSolarWindSnapshot: async () => {
    throw new Error("not used in solar-wind page test");
  },
}));

const { metadata, default: SpaceWeatherSolarWindPage } = await import(
  "@/app/space-weather/solar-wind/page"
);

describe("SpaceWeatherSolarWindPage", () => {
  it("renders the solar-wind modules with educational content", async () => {
    const html = renderToStaticMarkup(await SpaceWeatherSolarWindPage());

    expect(html).toContain("Solar Wind &amp; IMF");
    expect(html).toContain("Monitor live solar wind speed");
    expect(html).toContain("What is the solar wind?");
    expect(html).toContain("Why does southward Bz matter?");
    expect(html).toContain("Current Conditions");
    expect(html).toContain("552.1");
    expect(html).toContain("-11.4");
    expect(html).toContain("storm-favorable");
    expect(html).toContain("Geomagnetic Monitoring");
    expect(html).toContain("About This Data");
    expect(html).toContain('"@type":"CollectionPage"');
    expect(html).toContain("https://cosmicindex.dev/space-weather/solar-wind");
    expect(html).toContain("https://cosmicindex.dev/space-weather/geomagnetic");
    expect(html).toContain("https://cosmicindex.dev/space-weather/events");
  });

  it("publishes canonical metadata for the solar-wind route", () => {
    expect(metadata.title).toBe("Solar Wind & IMF");
    expect(metadata.description).toContain("Live solar wind and IMF monitoring");
    expect(metadata.keywords).toEqual(
      expect.arrayContaining(["solar wind", "IMF Bz", "southward Bz"]),
    );
    expect(metadata.alternates).toMatchObject({
      canonical: "https://cosmicindex.dev/space-weather/solar-wind",
    });
    expect(metadata.openGraph).toMatchObject({
      url: "https://cosmicindex.dev/space-weather/solar-wind",
      title: "Solar Wind & IMF | Cosmic Index",
    });
  });
});
