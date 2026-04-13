import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { SpaceWeatherSolarDrapSnapshot } from "@/lib/types";

let shouldFail = false;

const snapshot: SpaceWeatherSolarDrapSnapshot = {
  imageUrl: "https://services.swpc.noaa.gov/images/animations/d-rap/global/d-rap/latest.png",
  productUrl: "https://www.swpc.noaa.gov/products/d-region-absorption-predictions-d-rap",
  summary: "Normal X-ray and proton background.",
  estimatedRecoveryTime: "No Estimate",
  xrayMessage: "Normal X-ray Background",
  xrayWarning: "NO NEW X-RAY FLUX FOR 2 MINUTES",
  protonMessage: "Normal Proton Background",
  source: {
    label: "NOAA SWPC D-RAP",
    sourceUrl: "https://www.swpc.noaa.gov/products/d-region-absorption-predictions-d-rap",
    observedAt: "2026-04-13T01:41:00.000Z",
    fetchedAt: "2026-04-13T01:42:00.000Z",
    quality: "operational",
  },
  warnings: ["NO NEW X-RAY FLUX FOR 2 MINUTES"],
};

mock.module("@/lib/space-weather/solar", () => ({
  buildSpaceWeatherSolarSnapshot: async () => ({
    generatedAt: "2026-04-13T01:42:00.000Z",
    suvi: null,
    drap: snapshot,
    flareForecast: null,
  }),
  fetchSolarSuviSnapshot: async () => {
    throw new Error("not used in drap route test");
  },
  fetchSolarDrapSnapshot: async () => {
    if (shouldFail) throw new Error("upstream failed");
    return snapshot;
  },
  fetchSolarFlareForecastSnapshot: async () => {
    throw new Error("not used in drap route test");
  },
}));

mock.module("@/lib/api-middleware", () => ({
  initRequest: () => ({ requestId: "req_test_drap" }),
  withRateLimit: async () => ({ headers: {} }),
}));

mock.module("@/lib/api-response", () => ({
  apiSuccess: (data: unknown) =>
    Response.json({
      data,
      meta: {
        requestId: "req_test_drap",
        apiVersion: "1",
        timestamp: "2026-04-12T00:00:00.000Z",
      },
    }),
  apiPaginated: (data: unknown) => Response.json({ data }),
  handleRouteError: () => Response.json({ error: "internal_error" }, { status: 500 }),
}));

const { GET } = await import("@/app/api/v1/space-weather/solar/drap/route");

beforeEach(() => {
  shouldFail = false;
});

describe("GET /api/v1/space-weather/solar/drap", () => {
  it("returns the normalized D-RAP snapshot", async () => {
    const response = await GET(new Request("http://localhost:3000/api/v1/space-weather/solar/drap"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.estimatedRecoveryTime).toBe("No Estimate");
    expect(body.data.warnings).toEqual(["NO NEW X-RAY FLUX FOR 2 MINUTES"]);
  });

  it("returns the shared error response when the adapter throws", async () => {
    shouldFail = true;

    const response = await GET(new Request("http://localhost:3000/api/v1/space-weather/solar/drap"));

    expect(response.status).toBe(500);
  });
});
