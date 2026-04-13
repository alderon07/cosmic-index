import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";
import { __resetCacheStateForTests } from "@/lib/cache";
import { __resetDonkiTransientStateForTests, __setDonkiFetchForTests } from "@/lib/nasa-donki";

let seenEndpoints: string[] = [];
let endpointPayloads: Record<string, unknown[]> = {};

function buildCmePayload(count: number): unknown[] {
  return Array.from({ length: count }, (_, index) => ({
    activityID: `2026-02-${String(16 + Math.floor(index / 24)).padStart(2, "0")}T${String(index % 24).padStart(2, "0")}:24:00-CME-${String(index + 1).padStart(3, "0")}`,
    startTime: `2026-02-${String(16 + Math.floor(index / 24)).padStart(2, "0")}T${String(index % 24).padStart(2, "0")}:24:00Z`,
    sourceLocation: "N12W22",
    cmeAnalyses: [{ speed: 1200, halfAngle: 45, type: "H", isMostAccurate: true }],
  }));
}

function buildIpsPayload(id: string): unknown[] {
  return [{
    activityID: id,
    eventTime: "2026-02-16T04:24:00Z",
    location: "Earth",
    instruments: [{ displayName: "ACE: MAG" }],
  }];
}

function buildHssPayload(id: string): unknown[] {
  return [{
    hssID: id,
    eventTime: "2026-02-16T04:24:00Z",
    instruments: [{ displayName: "ACE: SWEPAM" }],
  }];
}

function buildSepPayload(id: string): unknown[] {
  return [{
    sepID: id,
    eventTime: "2026-02-16T04:24:00Z",
    instruments: [{ displayName: "SOHO: COSTEP" }],
  }];
}

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
  apiSuccess: (data: unknown) => Response.json({ data }, { status: 200 }),
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
  seenEndpoints = [];
  endpointPayloads = {
    FLR: [],
    CME: buildCmePayload(1),
    GST: [],
    IPS: [],
    HSS: [],
    SEP: [],
  };
  __resetCacheStateForTests();
  __resetDonkiTransientStateForTests();
  __setDonkiFetchForTests(async (input) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
    const endpoint = url.pathname.split("/").pop() ?? "";
    seenEndpoints.push(endpoint);
    return new Response(JSON.stringify(endpointPayloads[endpoint] ?? []), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
});

afterAll(() => {
  __setDonkiFetchForTests(null);
  __resetDonkiTransientStateForTests();
  __resetCacheStateForTests();
  mock.restore();
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
    expect(seenEndpoints.sort()).toEqual(["CME", "FLR", "GST", "HSS", "IPS", "SEP"]);
  });

  it("returns pagination mode 'offset' when page is present", async () => {
    endpointPayloads.CME = buildCmePayload(30);

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
    expect(seenEndpoints).toHaveLength(0);
  });

  it("returns 400 when startDate is after endDate", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/v1/space-weather?startDate=2026-02-17&endDate=2026-02-16"
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(seenEndpoints).toHaveLength(0);
  });

  it("returns hasMore false for out-of-range pages", async () => {
    endpointPayloads.CME = buildCmePayload(40);

    const request = new NextRequest("http://localhost:3000/api/v1/space-weather?page=3&limit=21");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.pagination.mode).toBe("offset");
    expect(body.pagination.page).toBe(3);
    expect(body.pagination.hasMore).toBe(false);
    expect(body.meta.totalAvailable).toBe(40);
  });

  it("accepts IPS/HSS/SEP in eventTypes filter", async () => {
    endpointPayloads = {
      FLR: [],
      CME: [],
      GST: [],
      IPS: buildIpsPayload("2026-02-16T04:24:00-IPS-001"),
      HSS: buildHssPayload("2026-02-16T05:24:00-HSS-001"),
      SEP: buildSepPayload("2026-02-16T06:24:00-SEP-001"),
    };

    const request = new NextRequest(
      "http://localhost:3000/api/v1/space-weather?eventTypes=IPS,HSS,SEP&limit=21"
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(seenEndpoints.sort()).toEqual(["HSS", "IPS", "SEP"]);
  });
});
