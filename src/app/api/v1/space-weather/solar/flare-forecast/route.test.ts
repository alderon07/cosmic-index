import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { SpaceWeatherSolarFlareForecastSnapshot } from "@/lib/types";

let shouldFail = false;

const snapshot: SpaceWeatherSolarFlareForecastSnapshot = {
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
};

mock.module("@/lib/space-weather/solar", () => ({
  buildSpaceWeatherSolarSnapshot: async () => ({
    generatedAt: "2026-04-12T00:10:00.000Z",
    suvi: null,
    drap: null,
    flareForecast: snapshot,
  }),
  fetchSolarSuviSnapshot: async () => {
    throw new Error("not used in flare-forecast route test");
  },
  fetchSolarDrapSnapshot: async () => {
    throw new Error("not used in flare-forecast route test");
  },
  fetchSolarFlareForecastSnapshot: async () => {
    if (shouldFail) throw new Error("upstream failed");
    return snapshot;
  },
}));

mock.module("@/lib/api-middleware", () => ({
  initRequest: () => ({ requestId: "req_test_flare_forecast" }),
  withRateLimit: async () => ({ headers: {} }),
}));

mock.module("@/lib/api-response", () => ({
  apiSuccess: (data: unknown) =>
    Response.json({
      data,
      meta: {
        requestId: "req_test_flare_forecast",
        apiVersion: "1",
        timestamp: "2026-04-12T00:00:00.000Z",
      },
    }),
  apiPaginated: (data: unknown) => Response.json({ data }),
  handleRouteError: () => Response.json({ error: "internal_error" }, { status: 500 }),
}));

const { GET } = await import("@/app/api/v1/space-weather/solar/flare-forecast/route");

beforeEach(() => {
  shouldFail = false;
});

describe("GET /api/v1/space-weather/solar/flare-forecast", () => {
  it("returns the normalized flare forecast snapshot", async () => {
    const response = await GET(new Request("http://localhost:3000/api/v1/space-weather/solar/flare-forecast"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.days[0].mClassProbability).toBe(10);
    expect(body.data.summary).toContain("75% C");
  });

  it("returns the shared error response when the adapter throws", async () => {
    shouldFail = true;

    const response = await GET(new Request("http://localhost:3000/api/v1/space-weather/solar/flare-forecast"));

    expect(response.status).toBe(500);
  });
});
