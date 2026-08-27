import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createObservatoryEvaluatorPost } from "@/app/api/internal/observatory/evaluate/handler";
import type { ObservatoryEvaluatorStore } from "@/lib/observatory-evaluator";

const evaluatorResult = {
  domain: "space_weather" as const,
  status: "ok" as const,
  processedWatches: 1,
  skippedWatches: 0,
  candidateCount: 2,
  inserted: 1,
  updated: 0,
  deduplicated: 1,
};

const POST = createObservatoryEvaluatorPost({
  evaluate: async () => evaluatorResult,
  createStore: () => ({}) as ObservatoryEvaluatorStore,
});

beforeEach(() => {
  process.env.OBSERVATORY_CRON_SECRET = "test-secret";
});

afterEach(() => {
  delete process.env.OBSERVATORY_CRON_SECRET;
});

function request(body: string, secret = "test-secret") {
  return new Request("http://localhost/api/internal/observatory/evaluate", {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json",
    },
    body,
  });
}

describe("POST /api/internal/observatory/evaluate", () => {
  it("fails closed when the evaluator secret is not configured", async () => {
    delete process.env.OBSERVATORY_CRON_SECRET;
    const response = await POST(request(JSON.stringify({ domain: "space_weather" })));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "evaluator_unavailable" });
  });

  it("rejects an incorrect bearer secret", async () => {
    const response = await POST(request(JSON.stringify({ domain: "space_weather" }), "wrong"));
    expect(response.status).toBe(401);
  });

  it("strictly validates the request body", async () => {
    const response = await POST(request(JSON.stringify({ domain: "space_weather", userId: "leak" })));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("invalid_request");
  });

  it("returns aggregate metrics without user data", async () => {
    const response = await POST(request(JSON.stringify({ domain: "space_weather" })));
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json).toEqual(evaluatorResult);
    expect(JSON.stringify(json)).not.toContain("user_");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
