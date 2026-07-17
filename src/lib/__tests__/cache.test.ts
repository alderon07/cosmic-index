import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import type { Redis } from "@upstash/redis";

let getCallCount = 0;

const cacheModule = await import("../cache");
const {
  __resetCacheStateForTests,
  __setRedisClientForTests,
  getCached,
  getCachedMany,
  setCachedMany,
  withCache,
} = cacheModule;

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
  } as unknown as Redis);
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
  it("reads and writes a stellar batch with one Redis command in each direction", async () => {
    let mgetCalls = 0;
    let pipelineExecutions = 0;
    const pipelineWrites: Array<{ key: string; value: unknown; ttl?: number }> = [];
    __setRedisClientForTests({
      async mget(): Promise<Array<{ value: number } | null>> {
        mgetCalls += 1;
        return [{ value: 1 }, null];
      },
      pipeline() {
        return {
          set(key: string, value: unknown, options?: { ex?: number }) {
            pipelineWrites.push({ key, value, ttl: options?.ex });
            return this;
          },
          async exec() {
            pipelineExecutions += 1;
            return [];
          },
        };
      },
    } as unknown as Redis);

    const cached = await getCachedMany<{ value: number }>(["star:one", "star:two"]);
    await setCachedMany(
      [
        { key: "star:one", data: { value: 1 } },
        { key: "star:two", data: { value: 2 } },
      ],
      3600,
    );

    expect(cached).toEqual([{ value: 1 }, null]);
    expect(mgetCalls).toBe(1);
    expect(pipelineExecutions).toBe(1);
    expect(pipelineWrites).toEqual([
      { key: "star:one", value: { value: 1 }, ttl: 3600 },
      { key: "star:two", value: { value: 2 }, ttl: 3600 },
    ]);
  });

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

  it("treats an undefined adapter result as a cache miss", async () => {
    __setRedisClientForTests({
      async get(): Promise<undefined> {
        return undefined;
      },
      async set(): Promise<void> {},
      async del(): Promise<void> {},
    } as unknown as Redis);

    let fetches = 0;
    const result = await withCache("sw:test:undefined", 60, async () => {
      fetches += 1;
      return { ok: true };
    });

    expect(result).toEqual({ ok: true });
    expect(fetches).toBe(1);
  });
});
