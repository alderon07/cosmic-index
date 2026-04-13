import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import type { Redis } from "@upstash/redis";

let getCallCount = 0;

const cacheModule = await import("../cache");
const { __resetCacheStateForTests, __setRedisClientForTests, getCached } = cacheModule;

const originalWarn = console.warn;
const originalError = console.error;
const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let warnings: string[] = [];
let errors: string[] = [];

beforeEach(() => {
  __resetCacheStateForTests();
  getCallCount = 0;
  warnings = [];
  errors = [];
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(" "));
  };
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
  };
  __setRedisClientForTests({
    async get<T>(): Promise<T | null> {
      getCallCount += 1;
      throw new TypeError("fetch failed");
    },
    async set(): Promise<void> {
      throw new TypeError("fetch failed");
    },
    async del(): Promise<void> {
      throw new TypeError("fetch failed");
    },
  } as Redis);
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
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
  __resetCacheStateForTests();
});

describe("cache fallback behavior", () => {
  it("returns null and avoids console.error when Redis fetch fails", async () => {
    const first = await getCached("sw:test:one");
    const second = await getCached("sw:test:two");

    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(getCallCount).toBe(1);
    expect(errors).toHaveLength(0);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain("Redis get failed");
  });
});
