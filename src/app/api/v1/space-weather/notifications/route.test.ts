import { beforeEach, describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";
import type {
  SpaceWeatherNotificationsListResponse,
  SpaceWeatherNotificationsQueryParams,
} from "@/lib/types";

let lastFetchParams: SpaceWeatherNotificationsQueryParams | null = null;
let mockFetchResult: SpaceWeatherNotificationsListResponse;
let fetchCallCount = 0;

function buildMockResult(
  overrides: Partial<SpaceWeatherNotificationsListResponse> = {},
): SpaceWeatherNotificationsListResponse {
  return {
    notifications: [
      {
        id: "20260216-AL-008",
        type: "CME",
        issuedAt: "2026-02-16T22:49Z",
        url: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/Alert/44706/1",
        body: "Sample notification body",
        activityIDs: ["2026-02-16T14:08:00-CME-001"],
      },
    ],
    count: 1,
    totalAvailable: 1,
    limitApplied: 8,
    page: 1,
    meta: {
      dateRange: {
        requestedStart: "2026-02-10",
        requestedEnd: "2026-02-17",
        effectiveStart: "2026-02-10",
        effectiveEnd: "2026-02-17",
      },
      typeIncluded: "all",
      totalCapApplied: false,
      totalCap: 300,
    },
    ...overrides,
  };
}

mock.module("@/lib/nasa-donki", () => ({
  fetchSpaceWeather: async () => {
    throw new Error("Not implemented in notifications route test");
  },
  fetchSpaceWeatherNotifications: async (
    params: SpaceWeatherNotificationsQueryParams,
  ) => {
    fetchCallCount += 1;
    lastFetchParams = params;
    return mockFetchResult;
  },
}));

mock.module("@/lib/api-middleware", () => ({
  initRequest: () => ({ requestId: "req_test_notifications" }),
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
  apiPaginated: (
    data: unknown[],
    pagination: Record<string, unknown>,
    _requestId: string,
    _headers?: Record<string, string>,
    extraMeta?: Record<string, unknown>,
  ) => {
    const meta = {
      requestId: "req_test_notifications",
      apiVersion: "1",
      timestamp: "2026-02-17T00:00:00.000Z",
      ...(extraMeta ?? {}),
    };
    return Response.json({ data, pagination, meta }, { status: 200 });
  },
  handleRouteError: () => Response.json({ error: "internal_error" }, { status: 500 }),
}));

const { GET } = await import("@/app/api/v1/space-weather/notifications/route");

beforeEach(() => {
  lastFetchParams = null;
  fetchCallCount = 0;
  mockFetchResult = buildMockResult();
});

describe("GET /api/v1/space-weather/notifications", () => {
  it("returns pagination mode 'none' when page is omitted", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/v1/space-weather/notifications?limit=8",
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pagination.mode).toBe("none");
    expect(body.pagination.hasMore).toBe(false);
    expect(lastFetchParams?.page).toBeUndefined();
  });

  it("returns pagination mode 'offset' when page is present", async () => {
    mockFetchResult = buildMockResult({
      totalAvailable: 30,
      limitApplied: 8,
      page: 1,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/v1/space-weather/notifications?page=1&limit=8&type=CME",
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pagination.mode).toBe("offset");
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(8);
    expect(body.pagination.total).toBe(30);
    expect(body.pagination.hasMore).toBe(true);
    expect(lastFetchParams?.type).toBe("CME");
  });

  it("returns 400 for invalid type", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/v1/space-weather/notifications?type=MPC",
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(fetchCallCount).toBe(0);
  });
});
