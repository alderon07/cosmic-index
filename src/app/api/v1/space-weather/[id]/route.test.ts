import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { __resetCacheStateForTests } from "@/lib/cache";
import {
  __resetDonkiTransientStateForTests,
  __setDonkiFetchForTests,
} from "@/lib/nasa-donki";

const eventId = "2026-09-17T01:24:00-IPS-001";
const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
let requests = 0;
let client = 0;

function request(id: string, userAgent = `donki-detail-test-${client++}`) {
  return GET(new NextRequest(`http://localhost:3000/api/v1/space-weather/${id}`, {
    headers: { "User-Agent": userAgent },
  }), { params: Promise.resolve({ id }) });
}

beforeEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  __resetCacheStateForTests();
  __resetDonkiTransientStateForTests();
  requests = 0;
  __setDonkiFetchForTests(async () => {
    requests += 1;
    return Response.json([{
      activityID: eventId,
      eventTime: "2026-09-17T01:24:00Z",
      location: "Earth",
    }]);
  });
});

afterEach(() => {
  __resetCacheStateForTests();
  __resetDonkiTransientStateForTests();
  if (originalRedisUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = originalRedisUrl;
  if (originalRedisToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = originalRedisToken;
});

describe("GET /api/v1/space-weather/{id}", () => {
  it("returns event details and migrated reference links for an encoded ID", async () => {
    const response = await request(encodeURIComponent(eventId));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.event.id).toBe(eventId);
    expect(body.data.links.donkiSearch).toBe("https://ccmc.gsfc.nasa.gov/DONKI/search/");
    expect(response.headers.get("RateLimit-Limit")).not.toBeNull();
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=");
    expect(requests).toBe(1);
  });

  it.each(["%invalid", "a".repeat(257), "bad%2Fid", "%0A"])(
    "rejects invalid path parameters without contacting NASA: %s", async (id) => {
      const response = await request(id);

      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
      expect(requests).toBe(0);
    },
  );

  it("returns 404 for an event absent from a healthy upstream", async () => {
    __setDonkiFetchForTests(async () => Response.json([]));

    const response = await request(eventId);

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("NOT_FOUND");
  });

  it("returns 503 and retry guidance when both upstreams return HTML", async () => {
    __setDonkiFetchForTests(async () => {
      requests += 1;
      return new Response("<!DOCTYPE html><html>Unavailable</html>", {
        headers: { "Content-Type": "text/html" },
      });
    });

    const response = await request(eventId);

    expect(response.status).toBe(503);
    expect((await response.json()).error.code).toBe("UPSTREAM_UNAVAILABLE");
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(requests).toBe(2);
  });

  it("rate-limits repeated detail requests before fetching upstream data", async () => {
    const userAgent = `donki-burst-test-${client++}`;
    let blocked: Response | null = null;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const before = requests;
      const response = await request(eventId, userAgent);
      if (response.status === 429) {
        blocked = response;
        expect(requests).toBe(before);
        break;
      }
      expect(response.status).toBe(200);
    }
    expect(blocked?.status).toBe(429);
    expect(blocked?.headers.get("Retry-After")).not.toBeNull();
  });
});
