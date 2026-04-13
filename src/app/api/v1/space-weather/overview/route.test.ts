import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { SpaceWeatherOverviewSnapshot } from "@/lib/space-weather/models";

let shouldFail = false;

const snapshot: SpaceWeatherOverviewSnapshot = {
  generatedAt: "2026-04-13T23:50:00.000Z",
  latestEvent: {
    id: "2026-04-13T20:00:00-GST-001",
    eventType: "GST",
    startTime: "2026-04-13T20:00:00.000Z",
    kpIndex: 6,
  },
  eventSummary: {
    total: 12,
    dominantType: "GST",
    windowDays: 90,
    warning: null,
  },
  notificationSummary: {
    total: 5,
    latestIssuedAt: "2026-04-13T22:00:00.000Z",
    warning: null,
    sourcesIncluded: ["donki", "swpc"],
  },
};

mock.module("@/lib/space-weather/overview", () => ({
  buildSpaceWeatherOverviewSnapshot: async () => {
    if (shouldFail) throw new Error("upstream failed");
    return snapshot;
  },
  SPACE_WEATHER_EVENT_WINDOW_DAYS: 90,
  SPACE_WEATHER_NOTIFICATIONS_WINDOW_DAYS: 30,
}));

mock.module("@/lib/api-middleware", () => ({
  initRequest: () => ({ requestId: "req_test_overview" }),
  withRateLimit: async () => ({ headers: {} }),
}));

mock.module("@/lib/api-response", () => ({
  apiSuccess: (data: unknown) =>
    Response.json({
      data,
      meta: {
        requestId: "req_test_overview",
        apiVersion: "1",
        timestamp: "2026-04-13T23:50:00.000Z",
      },
    }),
  apiPaginated: (data: unknown) => Response.json({ data }),
  handleRouteError: () => Response.json({ error: "internal_error" }, { status: 500 }),
}));

const { GET } = await import("@/app/api/v1/space-weather/overview/route");

beforeEach(() => {
  shouldFail = false;
});

describe("GET /api/v1/space-weather/overview", () => {
  it("returns the composed overview snapshot", async () => {
    const response = await GET(new Request("http://localhost:3000/api/v1/space-weather/overview"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.eventSummary.total).toBe(12);
    expect(body.data.notificationSummary.sourcesIncluded).toEqual(["donki", "swpc"]);
  });

  it("returns the shared error response when the overview builder throws", async () => {
    shouldFail = true;
    const response = await GET(new Request("http://localhost:3000/api/v1/space-weather/overview"));
    expect(response.status).toBe(500);
  });
});
