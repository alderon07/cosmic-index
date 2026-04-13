import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";
import { __resetCacheStateForTests } from "@/lib/cache";
import { __resetDonkiTransientStateForTests, __setDonkiFetchForTests } from "@/lib/nasa-donki";

let notificationPayloads: unknown[] = [];
let seenUrls: string[] = [];

function buildNotificationPayload(count: number, messageType = "CME"): unknown[] {
  return Array.from({ length: count }, (_, index) => ({
    messageID: `20260216-AL-${String(index + 1).padStart(3, "0")}`,
    messageType,
    messageIssueTime: `2026-02-${String(16 + Math.floor(index / 24)).padStart(2, "0")}T${String(index % 24).padStart(2, "0")}:49Z`,
    messageURL: `https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/Alert/${44706 + index}/1`,
    messageBody: "Activity ID: 2026-02-16T14:08:00-CME-001\nSample notification body",
  }));
}

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
  apiSuccess: (data: unknown) => Response.json({ data }, { status: 200 }),
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
  notificationPayloads = buildNotificationPayload(1);
  seenUrls = [];
  __resetCacheStateForTests();
  __resetDonkiTransientStateForTests();
  __setDonkiFetchForTests(async (input) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    seenUrls.push(url);
    return new Response(JSON.stringify(notificationPayloads), {
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
    expect(seenUrls).toHaveLength(1);
    expect(seenUrls[0]).toContain("/notifications?");
  });

  it("returns pagination mode 'offset' when page is present", async () => {
    notificationPayloads = buildNotificationPayload(30);

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
    expect(seenUrls[0]).toContain("type=CME");
  });

  it("returns 400 for invalid type", async () => {
    const request = new NextRequest(
      "http://localhost:3000/api/v1/space-weather/notifications?type=MPC",
    );
    const response = await GET(request);

    expect(response.status).toBe(400);
    expect(seenUrls).toHaveLength(0);
  });
});
