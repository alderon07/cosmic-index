import { describe, expect, it } from "bun:test";
import { getIPSDisplayMetrics } from "@/lib/space-weather-display";

describe("getIPSDisplayMetrics", () => {
  it("uses provided location and strips matching location prefix from instrument", () => {
    const result = getIPSDisplayMetrics("STEREO A", "STEREO A: IMPACT");
    expect(result).toEqual({
      location: "STEREO A",
      instrument: "IMPACT",
    });
  });

  it("drops instrument when it is identical to location", () => {
    const result = getIPSDisplayMetrics("Earth", "Earth");
    expect(result).toEqual({
      location: "Earth",
    });
  });

  it("infers location from instrument prefix when location is missing", () => {
    const result = getIPSDisplayMetrics(undefined, "ACE: MAG");
    expect(result).toEqual({
      location: "ACE",
      instrument: "MAG",
    });
  });

  it("preserves instrument when no matching location prefix exists", () => {
    const result = getIPSDisplayMetrics("Earth", "ACE: MAG");
    expect(result).toEqual({
      location: "Earth",
      instrument: "ACE: MAG",
    });
  });

  it("falls back to Unknown when neither location nor instrument is available", () => {
    const result = getIPSDisplayMetrics(undefined, undefined);
    expect(result).toEqual({
      location: "Unknown",
    });
  });
});
