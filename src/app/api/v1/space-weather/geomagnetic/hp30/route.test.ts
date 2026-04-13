import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { SpaceWeatherGeomagneticHp30Snapshot } from "@/lib/types";

let shouldFail = false;

const snapshot: SpaceWeatherGeomagneticHp30Snapshot = {
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
};

mock.module("@/lib/space-weather/geomagnetic", () => ({
  fetchGeomagneticHp30Snapshot: async () => {
    if (shouldFail) throw new Error("upstream failed");
    return snapshot;
  },
  fetchGeomagneticAeSnapshot: async () => {
    throw new Error("not used in hp30 route test");
  },
  buildSpaceWeatherGeomagneticSnapshot: async () => ({
    generatedAt: "2026-04-13T23:50:00.000Z",
    hp30: snapshot,
    ae: null,
    warnings: [],
  }),
}));

mock.module("@/lib/api-middleware", () => ({
  initRequest: () => ({ requestId: "req_test_hp30" }),
  withRateLimit: async () => ({ headers: {} }),
}));

mock.module("@/lib/api-response", () => ({
  apiSuccess: (data: unknown) =>
    Response.json({
      data,
      meta: {
        requestId: "req_test_hp30",
        apiVersion: "1",
        timestamp: "2026-04-13T23:50:00.000Z",
      },
    }),
  apiPaginated: (data: unknown) => Response.json({ data }),
  handleRouteError: () => Response.json({ error: "internal_error" }, { status: 500 }),
}));

const { GET } = await import("@/app/api/v1/space-weather/geomagnetic/hp30/route");

beforeEach(() => {
  shouldFail = false;
});

describe("GET /api/v1/space-weather/geomagnetic/hp30", () => {
  it("returns the normalized Hp30 snapshot", async () => {
    const response = await GET(new Request("http://localhost:3000/api/v1/space-weather/geomagnetic/hp30"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.currentValue).toBe(4);
  });

  it("returns the shared error response when the adapter throws", async () => {
    shouldFail = true;
    const response = await GET(new Request("http://localhost:3000/api/v1/space-weather/geomagnetic/hp30"));
    expect(response.status).toBe(500);
  });
});
