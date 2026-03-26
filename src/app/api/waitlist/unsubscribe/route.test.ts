import { afterAll, describe, expect, it, mock } from "bun:test";

mock.module("@/lib/pro-access", () => ({
  getFeatureRetiredResponse: (feature: "waitlist") =>
    new Response(JSON.stringify({ error: "feature_retired", feature }), { status: 410 }),
}));

const { POST } = await import("@/app/api/waitlist/unsubscribe/route");

afterAll(() => {
  mock.restore();
});

describe("POST /api/waitlist/unsubscribe", () => {
  it("returns 410 because the waitlist has been retired", async () => {
    const response = await POST();

    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({
      error: "feature_retired",
      feature: "waitlist",
    });
  });
});
