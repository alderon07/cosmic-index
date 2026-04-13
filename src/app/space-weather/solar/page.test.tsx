import { describe, expect, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("@/lib/space-weather/solar", () => ({
  fetchSolarSuviSnapshot: async () => {
    throw new Error("not used in solar page test");
  },
  fetchSolarDrapSnapshot: async () => {
    throw new Error("not used in solar page test");
  },
  fetchSolarFlareForecastSnapshot: async () => {
    throw new Error("not used in solar page test");
  },
  buildSpaceWeatherSolarSnapshot: async () => ({
    generatedAt: "2026-04-12T12:30:00.000Z",
    suvi: {
      panels: [
        {
          id: "suvi-131",
          variant: "131",
          title: "131A quicklook",
          description: "Tracks hot flare plasma and active-region structure.",
          imageUrl: "https://services.swpc.noaa.gov/images/animations/suvi/secondary/131/latest.png",
          productUrl: "https://www.swpc.noaa.gov/products/goes-solar-ultraviolet-imager-suvi",
          altText: "Latest NOAA SWPC GOES SUVI 131 Angstrom quicklook image.",
          source: {
            label: "NOAA SWPC GOES SUVI",
            sourceUrl: "https://www.swpc.noaa.gov/products/goes-solar-ultraviolet-imager-suvi",
            observedAt: "2026-04-12T12:04:00.000Z",
            fetchedAt: "2026-04-12T12:30:00.000Z",
            quality: "quicklook",
          },
        },
      ],
    },
    drap: {
      imageUrl: "https://services.swpc.noaa.gov/images/animations/d-rap/global/latest.png",
      productUrl: "https://www.swpc.noaa.gov/products/d-region-absorption-predictions-d-rap",
      summary: "Normal X-ray and proton background.",
      estimatedRecoveryTime: "No Estimate",
      xrayMessage: "Normal X-ray Background",
      protonMessage: "Normal Proton Background",
      source: {
        label: "NOAA SWPC D-RAP",
        sourceUrl: "https://www.swpc.noaa.gov/products/d-region-absorption-predictions-d-rap",
        observedAt: "2026-04-13T01:41:00.000Z",
        fetchedAt: "2026-04-13T01:42:00.000Z",
        quality: "operational",
      },
    },
    flareForecast: {
      summary: "Next day: 75% C, 10% M, 1% X, 1% proton.",
      days: [
        {
          date: "2026-04-12",
          cClassProbability: 75,
          mClassProbability: 10,
          xClassProbability: 1,
          protonProbability: 1,
          polarCapAbsorption: "green",
        },
      ],
      source: {
        label: "NOAA SWPC 3-Day Forecast",
        sourceUrl: "https://www.swpc.noaa.gov/products/3-day-forecast",
        observedAt: "2026-04-12T00:00:00.000Z",
        fetchedAt: "2026-04-12T00:10:00.000Z",
        quality: "forecast",
      },
    },
    warnings: [],
  }),
}));

const { metadata, default: SpaceWeatherSolarPage } = await import(
  "@/app/space-weather/solar/page"
);

describe("SpaceWeatherSolarPage", () => {
  it("renders the solar modules with educational content", async () => {
    const html = renderToStaticMarkup(await SpaceWeatherSolarPage());

    expect(html).toContain("Solar Monitoring");
    expect(html).toContain("Monitor the Sun with live solar imagery");
    expect(html).toContain("GOES SUVI");
    expect(html).toContain("D-RAP");
    expect(html).toContain("Flare Forecast");
    expect(html).toContain("75%");
    expect(html).toContain("https://services.swpc.noaa.gov/images/animations/d-rap/global/latest.png");
    expect(html).toContain("Browse Space Weather Events");
    expect(html).toContain("Open Space Weather Alerts");
    expect(html).toContain("What am I looking at?");
    expect(html).toContain("Understanding flare classes");
    expect(html).toContain("About This Data");
    expect(html).toContain('"@type":"CollectionPage"');
    expect(html).toContain("https://cosmicindex.dev/space-weather/solar");
  });

  it("publishes canonical metadata for the solar route", () => {
    expect(metadata.title).toBe("Solar Monitoring");
    expect(metadata.alternates).toMatchObject({
      canonical: "https://cosmicindex.dev/space-weather/solar",
    });
    expect(metadata.openGraph).toMatchObject({
      url: "https://cosmicindex.dev/space-weather/solar",
      title: "Solar Monitoring | Cosmic Index",
    });
  });
});
