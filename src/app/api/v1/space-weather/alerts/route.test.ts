import { beforeEach, describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";
import type { SpaceWeatherAlertsListResponse, SpaceWeatherAlertsQueryParams } from "@/lib/types";

let lastFetchParams: SpaceWeatherAlertsQueryParams | null = null;
let mockFetchResult: SpaceWeatherAlertsListResponse;
let fetchCallCount = 0;

function buildMockResult(
  overrides: Partial<SpaceWeatherAlertsListResponse> = {},
): SpaceWeatherAlertsListResponse {
  return {
    alerts: [
      {
        id: "20260412-AL-001",
        source: "donki",
        category: "cme",
        title: "Coronal Mass Ejection alert",
        summary: "CME watch remains elevated.",
        severity: "severe",
        issuedAt: "2026-04-12T12:00:00Z",
        sourceUrl: "https://example.com/donki/alert/1",
        activityCount: 1,
        relatedEventIds: ["2026-04-12T09:00:00-CME-001"],
        relatedEvents: [
          {
            id: "2026-04-12T09:00:00-CME-001",
            eventType: "CME",
            typeLabel: "Coronal Mass Ejection",
            severity: "severe",
            startTime: "2026-04-12T09:00:00Z",
          },
        ],
      },
    ],
    count: 1,
    totalAvailable: 1,
    limitApplied: 8,
    page: 1,
    meta: {
      dateRange: {
        requestedStart: "2026-04-05",
        requestedEnd: "2026-04-12",
        effectiveStart: "2026-04-05",
        effectiveEnd: "2026-04-12",
      },
      typeIncluded: "all",
      sourcesIncluded: ["donki"],
      relatedEventsResolved: 1,
      warnings: [],
      totalCapApplied: false,
      totalCap: 300,
    },
    ...overrides,
  };
}

mock.module("@/lib/space-weather/alerts", () => ({
  fetchUnifiedSpaceWeatherAlerts: async (params: SpaceWeatherAlertsQueryParams) => {
    fetchCallCount += 1;
    lastFetchParams = params;
    return mockFetchResult;
  },
}));

mock.module("@/lib/api-middleware", () => ({
  initRequest: () => ({ requestId: "req_test_alerts" }),
  withRateLimit: async () => ({ headers: {} }),
  validateParams: (
    params: Record<string, string>,
    schema: { safeParse: (value: unknown) => { success: boolean; data?: unknown } },
  ) => {
    const parsed = schema.safeParse(params);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters.",
          },
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        },
      );
    }
    return { data: parsed.data };
  },
}));

mock.module("@/lib/api-response", () => ({
  apiSuccess: (data: unknown) => Response.json({ data }, { status: 200 }),
  apiPaginated: (
    data: unknown[],
    pagination: Record<string, unknown>,
    _requestId: string,
    _headers?: Record<string, string>,
    extraMeta?: Record<string, unknown>,
  ) => {
    const meta = {
      requestId: "req_test_alerts",
      apiVersion: "1",
      timestamp: "2026-04-12T00:00:00.000Z",
      ...(extraMeta ?? {}),
    };
    return Response.json({ data, pagination, meta }, { status: 200 });
  },
  handleRouteError: () => Response.json({ error: "internal_error" }, { status: 500 }),
}));

const { GET } = await import("@/app/api/v1/space-weather/alerts/route");

beforeEach(() => {
  lastFetchParams = null;
  fetchCallCount = 0;
  mockFetchResult = buildMockResult();
});

describe("GET /api/v1/space-weather/alerts", () => {
  it("returns pagination mode 'none' when page is omitted", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/space-weather/alerts?limit=8");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pagination.mode).toBe("none");
    expect(body.pagination.hasMore).toBe(false);
    expect(lastFetchParams?.page).toBeUndefined();
    expect(body.meta.sourcesIncluded).toEqual(["donki"]);
  });

  it("returns pagination mode 'offset' when page is present", async () => {
    mockFetchResult = buildMockResult({
      totalAvailable: 12,
      limitApplied: 8,
      page: 1,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/v1/space-weather/alerts?page=1&limit=8&type=CME",
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pagination.mode).toBe("offset");
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(8);
    expect(body.pagination.total).toBe(12);
    expect(body.pagination.hasMore).toBe(true);
    expect(lastFetchParams?.type).toBe("CME");
  });

  it("returns 400 for invalid type", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/v1/space-weather/alerts?type=MPC",
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(fetchCallCount).toBe(0);
  });
});
