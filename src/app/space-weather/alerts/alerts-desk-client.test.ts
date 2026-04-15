import { describe, expect, it } from "bun:test";
import { resolveAlertsDeskFreshnessTimestamp } from "@/app/space-weather/alerts/alerts-desk-client";

describe("resolveAlertsDeskFreshnessTimestamp", () => {
  it("falls back to the server-generated timestamp before the query has updated", () => {
    expect(resolveAlertsDeskFreshnessTimestamp("2026-04-14T18:00:00.000Z", 0)).toBe(
      "2026-04-14T18:00:00.000Z",
    );
  });

  it("uses the latest query update time after a refetch succeeds", () => {
    expect(
      resolveAlertsDeskFreshnessTimestamp(
        "2026-04-14T18:00:00.000Z",
        Date.parse("2026-04-14T18:07:00.000Z"),
      ),
    ).toBe(
      "2026-04-14T18:07:00.000Z",
    );
  });
});
