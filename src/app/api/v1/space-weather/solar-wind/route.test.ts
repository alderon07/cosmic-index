import { beforeEach, describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";

let shouldFail = false;

const snapshot = {
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
      trend: [],
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
      trend: [],
      source: {
        label: "NOAA SWPC Real-Time IMF",
        sourceUrl: "https://www.swpc.noaa.gov/products/real-time-solar-wind",
        observedAt: "2026-04-14T17:02:00.000Z",
        fetchedAt: "2026-04-14T18:05:00.000Z",
        quality: "realtime",
      },
    },
    propagated: null,
    interpretation: {
      bzState: "southward",
      couplingRisk: "storm-favorable",
      summary: "Strongly southward IMF and elevated solar wind speed support efficient geomagnetic coupling.",
    },
  },
  warnings: [],
};

mock.module("@/lib/space-weather/solar-wind", () => ({
  buildSpaceWeatherSolarWindSnapshot: async () => {
    if (shouldFail) throw new Error("upstream failed");
    return snapshot;
  },
  fetchSolarWindPlasmaSnapshot: async () => {
    throw new Error("not used in solar-wind route test");
  },
  fetchSolarWindImfSnapshot: async () => {
    throw new Error("not used in solar-wind route test");
  },
  fetchPropagatedSolarWindSnapshot: async () => {
    throw new Error("not used in solar-wind route test");
  },
}));

mock.module("@/lib/api-middleware", () => ({
  initRequest: () => ({ requestId: "req_test_solar_wind" }),
  withRateLimit: async () => ({ headers: {} }),
}));

mock.module("@/lib/api-response", () => ({
  apiSuccess: (data: unknown) =>
    Response.json({
      data,
      meta: {
        requestId: "req_test_solar_wind",
        apiVersion: "1",
        timestamp: "2026-04-14T18:05:00.000Z",
      },
    }),
  apiPaginated: (data: unknown) => Response.json({ data }),
  handleRouteError: () => Response.json({ error: "internal_error" }, { status: 500 }),
}));

const { GET } = await import("@/app/api/v1/space-weather/solar-wind/route");

beforeEach(() => {
  shouldFail = false;
});

describe("GET /api/v1/space-weather/solar-wind", () => {
  it("returns the composed solar-wind snapshot", async () => {
    const response = await GET(new NextRequest("http://localhost:3000/api/v1/space-weather/solar-wind"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.snapshot.current.speedKms).toBe(552.1);
    expect(body.data.snapshot.interpretation.couplingRisk).toBe("storm-favorable");
  });

  it("returns the shared error response when the builder throws", async () => {
    shouldFail = true;

    const response = await GET(new NextRequest("http://localhost:3000/api/v1/space-weather/solar-wind"));

    expect(response.status).toBe(500);
  });
});
