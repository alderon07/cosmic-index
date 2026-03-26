import { afterAll, describe, expect, it, mock } from "bun:test";

mock.module("@/lib/pro-access", () => ({
  getFeatureRetiredResponse: (feature: "waitlist") =>
    new Response(JSON.stringify({ error: "feature_retired", feature }), { status: 410 }),
}));

const { GET } = await import("@/app/api/waitlist/status/route");

afterAll(() => {
  mock.restore();
});

describe("GET /api/waitlist/status", () => {
  it("returns 410 because the waitlist has been retired", async () => {
    const response = await GET();

    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({
      error: "feature_retired",
      feature: "waitlist",
    });
  });
});
