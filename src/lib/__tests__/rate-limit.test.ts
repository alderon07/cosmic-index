import { afterEach, describe, expect, it } from "bun:test";

import { checkRateLimit } from "@/lib/rate-limit";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const ORIGINAL_REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;

  if (ORIGINAL_REDIS_URL === undefined) {
    delete process.env.UPSTASH_REDIS_REST_URL;
  } else {
    process.env.UPSTASH_REDIS_REST_URL = ORIGINAL_REDIS_URL;
  }

  if (ORIGINAL_REDIS_TOKEN === undefined) {
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  } else {
    process.env.UPSTASH_REDIS_REST_TOKEN = ORIGINAL_REDIS_TOKEN;
  }
});

describe("checkRateLimit", () => {
  it("fails closed in production when Redis is unavailable", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const result = await checkRateLimit("client", "BROWSE", "unknown");

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.effectiveLimit).toBe(0);
  });
});
