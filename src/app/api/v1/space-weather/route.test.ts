import { beforeEach, describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";
import type { SpaceWeatherListResponse, SpaceWeatherQueryParams } from "@/lib/types";

let lastFetchParams: SpaceWeatherQueryParams | null = null;
let mockFetchResult: SpaceWeatherListResponse;
let fetchCallCount = 0;

function buildMockResult(overrides: Partial<SpaceWeatherListResponse> = {}): SpaceWeatherListResponse {
  return {
    events: [
      {
        id: "2026-02-16T04:24:00-CME-001",
        eventType: "CME",
        startTime: "2026-02-16T04:24:00Z",
        speed: 1200,
      },
    ],
    count: 1,
    totalAvailable: 1,
    limitApplied: 21,
    page: 1,
    meta: {
      dateRange: { start: "2025-11-19", end: "2026-02-17" },
      typesIncluded: ["CME"],
      totalCapApplied: false,
      totalCap: 420,
    },
    ...overrides,
  };
}

mock.module("@/lib/nasa-donki", () => ({
  fetchSpaceWeather: async (params: SpaceWeatherQueryParams) => {
    fetchCallCount += 1;
    lastFetchParams = params;
    return mockFetchResult;
  },
}));

mock.module("@/lib/api-middleware", () => ({
  initRequest: () => ({ requestId: "req_test_space_weather" }),
  withRateLimit: async () => ({ headers: {} }),
  validateParams: (
    params: Record<string, string>,
    schema: { safeParse: (value: unknown) => { success: boolean; data?: unknown } }
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
        }
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
    extraMeta?: Record<string, unknown>
  ) => {
    const meta = {
      requestId: "req_test_space_weather",
      apiVersion: "1",
      timestamp: "2026-02-17T00:00:00.000Z",
      ...(extraMeta ?? {}),
    };
    return Response.json({ data, pagination, meta }, { status: 200 });
  },
  handleRouteError: () => Response.json({ error: "internal_error" }, { status: 500 }),
}));

const { GET } = await import("@/app/api/v1/space-weather/route");

beforeEach(() => {
  lastFetchParams = null;
  fetchCallCount = 0;
  mockFetchResult = buildMockResult();
});

describe("GET /api/v1/space-weather", () => {
  it("returns pagination mode 'none' when page is omitted", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/space-weather?limit=21");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pagination.mode).toBe("none");
    expect(body.pagination.hasMore).toBe(false);
    expect(body.meta.totalAvailable).toBe(1);
    expect(lastFetchParams?.page).toBeUndefined();
  });

  it("returns pagination mode 'offset' when page is present", async () => {
    mockFetchResult = buildMockResult({
      totalAvailable: 30,
      limitApplied: 21,
      page: 1,
    });

    const request = new NextRequest("http://localhost:3000/api/v1/space-weather?page=1&limit=21");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pagination.mode).toBe("offset");
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(21);
    expect(body.pagination.total).toBe(30);
    expect(body.pagination.hasMore).toBe(true);
  });

  it("returns 400 for invalid page", async () => {
    const request = new NextRequest("http://localhost:3000/api/v1/space-weather?page=0");
    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(fetchCallCount).toBe(0);
  });

  it("returns 400 when startDate is after endDate", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/v1/space-weather?startDate=2026-02-17&endDate=2026-02-16"
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(fetchCallCount).toBe(0);
  });

  it("returns hasMore false for out-of-range pages", async () => {
    mockFetchResult = buildMockResult({
      events: [],
      count: 0,
      totalAvailable: 40,
      limitApplied: 21,
      page: 3,
    });

    const request = new NextRequest("http://localhost:3000/api/v1/space-weather?page=3&limit=21");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pagination.mode).toBe("offset");
    expect(body.pagination.page).toBe(3);
    expect(body.pagination.hasMore).toBe(false);
    expect(body.meta.totalAvailable).toBe(40);
  });
});
