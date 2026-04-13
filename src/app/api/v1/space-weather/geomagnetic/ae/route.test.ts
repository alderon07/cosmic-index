import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { SpaceWeatherGeomagneticAeSnapshot } from "@/lib/types";

let shouldFail = false;

const snapshot: SpaceWeatherGeomagneticAeSnapshot = {
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
};

mock.module("@/lib/space-weather/geomagnetic", () => ({
  fetchGeomagneticHp30Snapshot: async () => {
    throw new Error("not used in ae route test");
  },
  fetchGeomagneticAeSnapshot: async () => {
    if (shouldFail) throw new Error("upstream failed");
    return snapshot;
  },
  buildSpaceWeatherGeomagneticSnapshot: async () => ({
    generatedAt: "2026-04-13T23:50:00.000Z",
    hp30: null,
    ae: snapshot,
    warnings: snapshot.warnings,
  }),
}));

mock.module("@/lib/api-middleware", () => ({
  initRequest: () => ({ requestId: "req_test_ae" }),
  withRateLimit: async () => ({ headers: {} }),
}));

mock.module("@/lib/api-response", () => ({
  apiSuccess: (data: unknown) =>
    Response.json({
      data,
      meta: {
        requestId: "req_test_ae",
        apiVersion: "1",
        timestamp: "2026-04-13T23:50:00.000Z",
      },
    }),
  apiPaginated: (data: unknown) => Response.json({ data }),
  handleRouteError: () => Response.json({ error: "internal_error" }, { status: 500 }),
}));

const { GET } = await import("@/app/api/v1/space-weather/geomagnetic/ae/route");

beforeEach(() => {
  shouldFail = false;
});

describe("GET /api/v1/space-weather/geomagnetic/ae", () => {
  it("returns the normalized AE snapshot", async () => {
    const response = await GET(new Request("http://localhost:3000/api/v1/space-weather/geomagnetic/ae"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.currentValue).toBe(404);
    expect(body.data.hourlySeries[0].peakValue).toBe(595);
  });

  it("returns the shared error response when the adapter throws", async () => {
    shouldFail = true;
    const response = await GET(new Request("http://localhost:3000/api/v1/space-weather/geomagnetic/ae"));
    expect(response.status).toBe(500);
  });
});
