import { describe, expect, it } from "bun:test";
import {
  canonicalizeWatchConfig,
  createCloseApproachTriggerKey,
  createSpaceWeatherTriggerKey,
  getWatchLimit,
  matchesCloseApproachWatch,
  matchesSpaceWeatherWatch,
  WatchInputSchema,
} from "@/lib/observatory";

describe("Observatory watch contracts", () => {
  it("accepts typed space-weather watches and rejects unknown fields", () => {
    expect(WatchInputSchema.safeParse({
      name: "Strong space weather",
      alertType: "space_weather",
      config: {
        schemaVersion: 1,
        categories: ["gst", "flr"],
        minimumSeverity: "strong",
      },
    }).success).toBe(true);

    expect(WatchInputSchema.safeParse({
      name: "Unsafe",
      alertType: "space_weather",
      config: {
        schemaVersion: 1,
        categories: ["gst"],
        minimumSeverity: "strong",
        arbitrary: true,
      },
    }).success).toBe(false);
  });

  it("accepts only guided close-approach presets", () => {
    expect(WatchInputSchema.safeParse({
      name: "Nearby objects",
      alertType: "close_approach",
      config: {
        schemaVersion: 1,
        maxDistanceLd: 5,
        leadTimeDays: 7,
        phaOnly: false,
      },
    }).success).toBe(true);

    expect(WatchInputSchema.safeParse({
      name: "Too custom",
      alertType: "close_approach",
      config: {
        schemaVersion: 1,
        maxDistanceLd: 4,
        leadTimeDays: 14,
        phaOnly: false,
      },
    }).success).toBe(false);
  });

  it("canonicalizes equivalent category order to the same hash", () => {
    const first = canonicalizeWatchConfig({
      schemaVersion: 1,
      categories: ["gst", "flr"],
      minimumSeverity: "strong",
    });
    const second = canonicalizeWatchConfig({
      schemaVersion: 1,
      categories: ["flr", "gst"],
      minimumSeverity: "strong",
    });

    expect(first).toEqual(second);
  });

  it("enforces one Free watch and fifty Pro watches", () => {
    expect(getWatchLimit("free")).toBe(1);
    expect(getWatchLimit("pro")).toBe(50);
  });
});

describe("Observatory matching", () => {
  it("matches weather by category and ordered severity", () => {
    const config = {
      schemaVersion: 1 as const,
      categories: ["gst"],
      minimumSeverity: "strong" as const,
    };

    expect(matchesSpaceWeatherWatch(config, {
      category: "gst",
      severity: "severe",
    })).toBe(true);
    expect(matchesSpaceWeatherWatch(config, {
      category: "gst",
      severity: "moderate",
    })).toBe(false);
    expect(matchesSpaceWeatherWatch(config, {
      category: "flr",
      severity: "extreme",
    })).toBe(false);
  });

  it("matches only future approaches in the distance, lead-time, and PHA rules", () => {
    const now = new Date("2026-07-12T12:00:00.000Z");
    const config = {
      schemaVersion: 1 as const,
      maxDistanceLd: 5 as const,
      leadTimeDays: 7 as const,
      phaOnly: true,
    };

    expect(matchesCloseApproachWatch(config, {
      jd: 2461238.5,
      distanceLd: 4.2,
      isPha: true,
    }, now)).toBe(true);
    expect(matchesCloseApproachWatch(config, {
      jd: 2461238.5,
      distanceLd: 4.2,
      isPha: undefined,
    }, now)).toBe(false);
    expect(matchesCloseApproachWatch(config, {
      jd: 2461220.5,
      distanceLd: 1,
      isPha: true,
    }, now)).toBe(false);
  });

  it("uses stable source-aware trigger identities", () => {
    expect(createSpaceWeatherTriggerKey("donki", "AL-123"))
      .toBe("space-weather:donki:AL-123");
    expect(createSpaceWeatherTriggerKey("swpc", "AL-123"))
      .toBe("space-weather:swpc:AL-123");

    expect(createCloseApproachTriggerKey(" 2026 AB ", 2461238.51))
      .toBe(createCloseApproachTriggerKey("2026 ab", 2461238.99));
  });
});
