import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { SpaceWeatherSolarSuviSnapshot } from "@/lib/types";

let shouldFail = false;

const snapshot: SpaceWeatherSolarSuviSnapshot = {
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
        fetchedAt: "2026-04-12T12:10:00.000Z",
        quality: "quicklook",
      },
    },
  ],
};

mock.module("@/lib/space-weather/solar", () => ({
  buildSpaceWeatherSolarSnapshot: async () => ({
    generatedAt: "2026-04-12T12:10:00.000Z",
    suvi: snapshot,
    drap: null,
    flareForecast: null,
  }),
  fetchSolarSuviSnapshot: async () => {
    if (shouldFail) throw new Error("upstream failed");
    return snapshot;
  },
  fetchSolarDrapSnapshot: async () => {
    throw new Error("not used in suvi route test");
  },
  fetchSolarFlareForecastSnapshot: async () => {
    throw new Error("not used in suvi route test");
  },
}));

mock.module("@/lib/api-middleware", () => ({
  initRequest: () => ({ requestId: "req_test_suvi" }),
  withRateLimit: async () => ({ headers: {} }),
}));

mock.module("@/lib/api-response", () => ({
  apiSuccess: (data: unknown) =>
    Response.json({
      data,
      meta: {
        requestId: "req_test_suvi",
        apiVersion: "1",
        timestamp: "2026-04-12T00:00:00.000Z",
      },
    }),
  apiPaginated: (data: unknown) => Response.json({ data }),
  handleRouteError: () => Response.json({ error: "internal_error" }, { status: 500 }),
}));

const { GET } = await import("@/app/api/v1/space-weather/solar/suvi/route");

beforeEach(() => {
  shouldFail = false;
});

describe("GET /api/v1/space-weather/solar/suvi", () => {
  it("returns the normalized SUVI snapshot", async () => {
    const response = await GET(new Request("http://localhost:3000/api/v1/space-weather/solar/suvi"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.panels).toHaveLength(1);
    expect(body.data.panels[0].variant).toBe("131");
  });

  it("returns the shared error response when the adapter throws", async () => {
    shouldFail = true;

    const response = await GET(new Request("http://localhost:3000/api/v1/space-weather/solar/suvi"));

    expect(response.status).toBe(500);
  });
});
