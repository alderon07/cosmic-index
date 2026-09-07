import { describe, expect, it } from "bun:test";
import { calculateOrbitCount } from "@/lib/guide-tools";
import { parseReadingList, toggleReadingList } from "@/lib/reading-list";

describe("guide tools", () => {
  it("calculates orbits for a time interval, without rounding partial orbits away", () => {
    expect(calculateOrbitCount({ earthDays: 30, periodDays: 1.5 })).toBe(20);
    expect(calculateOrbitCount({ earthDays: 30, periodDays: 6.1 })).toBeCloseTo(4.918, 3);
  });
  it.each([0, -1, NaN, Infinity])("rejects invalid physical inputs %s", (value) => {
    expect(calculateOrbitCount({ earthDays: value, periodDays: 1 })).toBeNull();
    expect(calculateOrbitCount({ earthDays: 30, periodDays: value })).toBeNull();
  });
  it("rejects overflowing results", () => {
    expect(calculateOrbitCount({ earthDays: 365.25, periodDays: Number.MIN_VALUE })).toBeNull();
  });
});

describe("reading list", () => {
  it("only restores published guides and removes duplicates", () => {
    expect(parseReadingList(JSON.stringify(["comparing-exoplanets", "//evil.example", "comparing-exoplanets", "constructor"]))).toEqual(["comparing-exoplanets"]);
  });
  it.each([null, "bad json", "{}", "null", '[42]', '"comparing-exoplanets"', "x".repeat(5000)])("handles corrupt or oversized storage", (input) => {
    expect(parseReadingList(input)).toEqual([]);
  });
  it("adds and removes a guide without losing other saved guides", () => {
    const saved = toggleReadingList(["reading-space-weather"], "comparing-exoplanets");
    expect(saved).toEqual(["reading-space-weather", "comparing-exoplanets"]);
    expect(toggleReadingList(saved, "comparing-exoplanets")).toEqual(["reading-space-weather"]);
  });
});
