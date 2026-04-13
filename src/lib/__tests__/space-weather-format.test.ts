import { describe, expect, it } from "bun:test";
import {
  formatRelativeTime,
  formatSpaceWeatherTimestamp,
} from "@/lib/space-weather/format";

describe("formatSpaceWeatherTimestamp", () => {
  it("formats valid timestamps in UTC", () => {
    expect(formatSpaceWeatherTimestamp("2026-04-12T09:00:00Z")).toBe(
      "Apr 12, 9:00 AM UTC",
    );
  });

  it("returns a fallback for missing timestamps", () => {
    expect(formatSpaceWeatherTimestamp(null)).toBe("Unavailable");
  });

  it("returns the original value when the timestamp is invalid", () => {
    expect(formatSpaceWeatherTimestamp("not-a-date")).toBe("not-a-date");
  });
});

describe("formatRelativeTime", () => {
  it("returns a minute-based freshness label", () => {
    const timestamp = new Date(Date.now() - 70_000).toISOString();

    expect(formatRelativeTime(timestamp)).toBe("1 minute ago");
  });

  it("returns a day-based freshness label for older timestamps", () => {
    const timestamp = new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString();

    expect(formatRelativeTime(timestamp)).toBe("9 days ago");
  });

  it("returns unknown for invalid timestamps", () => {
    expect(formatRelativeTime("bad-timestamp")).toBe("Unknown");
  });
});
