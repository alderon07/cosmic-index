import { describe, expect, test } from "bun:test";

import { parseGoogleAnalyticsId } from "@/lib/analytics";

describe("parseGoogleAnalyticsId", () => {
  test("accepts a valid GA4 measurement ID", () => {
    expect(parseGoogleAnalyticsId("G-ABC1234567")).toBe("G-ABC1234567");
  });

  test("rejects missing and malformed IDs", () => {
    expect(parseGoogleAnalyticsId(undefined)).toBeNull();
    expect(parseGoogleAnalyticsId("UA-123456-1")).toBeNull();
    expect(parseGoogleAnalyticsId("G-invalid id")).toBeNull();
  });
});
