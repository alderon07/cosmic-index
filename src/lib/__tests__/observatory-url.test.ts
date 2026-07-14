import { describe, expect, it } from "bun:test";
import {
  closeApproachAnchorId,
  closeApproachDestination,
  InternalDestinationSchema,
  ObservatorySourceUrlSchema,
} from "@/lib/observatory-url";

describe("Observatory navigation contracts", () => {
  it("uses the same single-encoded close-approach anchor in links and cards", () => {
    const alreadyEncodedId = "2026%20AB_1_2026-Apr-12%2012%3A00";
    const anchor = closeApproachAnchorId(alreadyEncodedId);
    const destination = closeApproachDestination({
      leadTimeDays: 1,
      maxDistanceLd: 1,
      phaOnly: false,
    }, alreadyEncodedId);

    expect(anchor).toBe("approach-2026%20AB_1_2026-Apr-12%2012%3A00");
    expect(new URL(destination, "https://cosmicindex.dev").hash).toBe(`#${anchor}`);
  });

  it("allows only local, single-slash Signal destinations", () => {
    expect(InternalDestinationSchema.safeParse("/space-weather/alerts").success).toBe(true);
    expect(InternalDestinationSchema.safeParse("//evil.example/path").success).toBe(false);
    expect(InternalDestinationSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(InternalDestinationSchema.safeParse("/ok\njavascript:bad").success).toBe(false);
  });

  it("allows source links only from the upstream hosts Observatory uses", () => {
    expect(ObservatorySourceUrlSchema.safeParse("https://api.nasa.gov/DONKI/CME").success).toBe(true);
    expect(ObservatorySourceUrlSchema.safeParse("https://services.swpc.noaa.gov/products/foo.json").success).toBe(true);
    expect(ObservatorySourceUrlSchema.safeParse("https://evil.example/nasa").success).toBe(false);
    expect(ObservatorySourceUrlSchema.safeParse("http://api.nasa.gov/DONKI/CME").success).toBe(false);
  });
});
