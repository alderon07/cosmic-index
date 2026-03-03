import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

const redisStore = new Map<string, unknown>();

mock.module("@upstash/redis", () => ({
  Redis: class Redis {
    async get<T>(key: string): Promise<T | null> {
      return (redisStore.get(key) as T | undefined) ?? null;
    }

    async set<T>(key: string, value: T): Promise<void> {
      redisStore.set(key, value);
    }

    async del(key: string): Promise<void> {
      redisStore.delete(key);
    }
  },
}));

function buildFlrStaleKey(startDate: string, endDate: string): string {
  const env = process.env.NODE_ENV || "unknown";
  const context = `${env}:donki`;
  return `sw:flr:v3:${context}:${startDate}:${endDate}:stale`;
}

describe("DONKI distributed stale fallback", () => {
  const originalFetch = globalThis.fetch;
  const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const originalNasaApiKey = process.env.NASA_API_KEY;

  beforeEach(async () => {
    redisStore.clear();
    process.env.UPSTASH_REDIS_REST_URL = "https://redis.example.test";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    process.env.NASA_API_KEY = "test_nasa_key";
    globalThis.fetch = originalFetch;
    const { __resetDonkiTransientStateForTests } = await import("../nasa-donki");
    __resetDonkiTransientStateForTests();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;

    if (originalRedisUrl) {
      process.env.UPSTASH_REDIS_REST_URL = originalRedisUrl;
    } else {
      delete process.env.UPSTASH_REDIS_REST_URL;
    }

    if (originalRedisToken) {
      process.env.UPSTASH_REDIS_REST_TOKEN = originalRedisToken;
    } else {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    }

    if (originalNasaApiKey) {
      process.env.NASA_API_KEY = originalNasaApiKey;
    } else {
      delete process.env.NASA_API_KEY;
    }
  });

  it("uses Redis stale fallback when DONKI fetch fails", async () => {
    const { fetchSpaceWeather } = await import("../nasa-donki");
    const { setCached, CACHE_TTL } = await import("../cache");

    const startDate = "2024-07-03";
    const endDate = "2024-07-04";
    const staleKey = buildFlrStaleKey(startDate, endDate);

    await setCached(
      staleKey,
      {
        cachedAt: Date.now(),
        events: [
          {
            id: "2024-07-03T10:00:00-FLR-001",
            eventType: "FLR",
            startTime: "2024-07-03T10:00:00Z",
            classType: "M1.0",
          },
        ],
      },
      CACHE_TTL.SPACE_WEATHER * 4,
    );

    globalThis.fetch = async () => {
      throw new TypeError("fetch failed");
    };

    const result = await fetchSpaceWeather({
      startDate,
      endDate,
      eventTypes: ["FLR"],
      limit: 21,
      page: 1,
    });

    expect(result.events).toHaveLength(1);
    expect(result.meta.typesIncluded).toEqual(["FLR"]);
    expect(
      result.meta.warnings?.some((warning) =>
        warning.includes("stale cached data due to DONKI unavailability"),
      ),
    ).toBe(true);
  });

  it("does not use stale fallback older than the max stale age", async () => {
    const { fetchSpaceWeather, DonkiUpstreamUnavailableError } = await import("../nasa-donki");
    const { setCached, CACHE_TTL } = await import("../cache");

    const startDate = "2024-07-03";
    const endDate = "2024-07-04";
    const staleKey = buildFlrStaleKey(startDate, endDate);

    await setCached(
      staleKey,
      {
        cachedAt: Date.now() - (CACHE_TTL.SPACE_WEATHER * 4 * 1000) - 5_000,
        events: [
          {
            id: "2024-07-03T10:00:00-FLR-001",
            eventType: "FLR",
            startTime: "2024-07-03T10:00:00Z",
            classType: "M1.0",
          },
        ],
      },
      CACHE_TTL.SPACE_WEATHER * 4,
    );

    globalThis.fetch = async () => {
      throw new TypeError("fetch failed");
    };

    await expect(
      fetchSpaceWeather({
        startDate,
        endDate,
        eventTypes: ["FLR"],
        limit: 21,
        page: 1,
      }),
    ).rejects.toBeInstanceOf(DonkiUpstreamUnavailableError);
  });
});
