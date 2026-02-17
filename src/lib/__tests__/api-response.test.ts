import { describe, expect, it } from "bun:test";
import { handleRouteError } from "../api-response";
import { DonkiUpstreamUnavailableError } from "../nasa-donki";

describe("handleRouteError", () => {
  it("maps DONKI upstream unavailable errors to 503", async () => {
    const response = handleRouteError(
      new DonkiUpstreamUnavailableError("all sources failed"),
      "req_test_donki"
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe("UPSTREAM_UNAVAILABLE");
    expect(body.error.message).toContain("temporarily unavailable");
  });
});
