import { describe, expect, it } from "bun:test";
import {
  evaluateObservatory,
  type ObservatoryEvaluatorDependencies,
  type ObservatoryEvaluatorStore,
  type ObservatorySignalDraft,
  type ObservatoryWatchRecord,
} from "@/lib/observatory-evaluator";
import { toJulianDate } from "@/lib/observatory";

function makeStore(watches: ObservatoryWatchRecord[]) {
  const recorded: ObservatorySignalDraft[] = [];
  const suppressedTriggers: string[] = [];
  let completedWatermark: string | null | undefined;
  const leaseOwners: string[] = [];
  const store: ObservatoryEvaluatorStore = {
    countEnabledWatches: async (domain) =>
      watches.filter((watch) => watch.alertType === domain).length,
    acquireLease: async ({ owner }) => {
      leaseOwners.push(owner);
      return { acquired: true, watermark: null };
    },
    listEnabledWatchesPage: async ({ domain, afterId, limit }) => {
      const page = watches
        .filter((watch) => watch.alertType === domain && watch.id > (afterId ?? 0))
        .slice(0, limit);
      return {
        watches: page,
        hasMore: watches.some(
          (watch) => watch.alertType === domain && watch.id > (page.at(-1)?.id ?? 0),
        ),
      };
    },
    recordSignalDurably: async ({ signal }) => {
      recorded.push(signal);
      return "inserted";
    },
    recordTriggerDurably: async ({ triggerKey }) => {
      suppressedTriggers.push(triggerKey);
      return "inserted";
    },
    completeLease: async ({ watermark }) => {
      completedWatermark = watermark;
    },
    failLease: async () => undefined,
    cleanupSignals: async () => ({ deleted: 0, hasMore: false }),
  };
  return {
    store,
    recorded,
    suppressedTriggers,
    leaseOwners,
    getCompletedWatermark: () => completedWatermark,
  };
}

function weatherWatch(overrides: Partial<ObservatoryWatchRecord> = {}): ObservatoryWatchRecord {
  return {
    id: 1,
    userId: "user_1",
    name: "Strong storms",
    alertType: "space_weather",
    configHash: "weather-hash",
    config: {
      schemaVersion: 1,
      categories: ["gst"],
      minimumSeverity: "strong",
    },
    enabledAt: "2026-07-12T00:00:00.000Z",
    lastMatchedAt: null,
    ...overrides,
  };
}

function closeWatch(overrides: Partial<ObservatoryWatchRecord> = {}): ObservatoryWatchRecord {
  return {
    id: 2,
    userId: "user_2",
    name: "Near Earth",
    alertType: "close_approach",
    configHash: "approach-hash",
    config: {
      schemaVersion: 1,
      maxDistanceLd: 5,
      leadTimeDays: 7,
      phaOnly: false,
    },
    enabledAt: "2026-07-12T00:00:00.000Z",
    lastMatchedAt: null,
    ...overrides,
  };
}

describe("evaluateObservatory", () => {
  it("exits before fetching an upstream source when no watches exist", async () => {
    const { store } = makeStore([]);
    let fetches = 0;
    const result = await evaluateObservatory(
      { domain: "space_weather" },
      {
        store,
        fetchSpaceWeatherCandidates: async () => {
          fetches += 1;
          return { candidates: [], complete: true };
        },
      },
    );

    expect(result.status).toBe("no_watches");
    expect(fetches).toBe(0);
  });

  it("keeps DONKI and SWPC identities separate and uses maximum related severity", async () => {
    const { store, recorded } = makeStore([weatherWatch()]);
    const dependencies: ObservatoryEvaluatorDependencies = {
      store,
      now: () => new Date("2026-07-12T12:00:00.000Z"),
      fetchSpaceWeatherCandidates: async () => ({
        complete: true,
        candidates: [
          {
            id: "AL-1",
            source: "donki",
            category: "gst",
            title: "DONKI storm",
            summary: "DONKI report",
            severity: "minor",
            issuedAt: "2026-07-12T11:00:00.000Z",
            sourceUrl: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/Alert/1/1",
            relatedEvents: [
              { severity: "moderate" },
              { severity: "severe" },
            ],
          },
          {
            id: "AL-1",
            source: "swpc",
            category: "gst",
            title: "SWPC storm",
            summary: "SWPC report",
            severity: "strong",
            issuedAt: "2026-07-12T11:05:00.000Z",
            sourceUrl: "https://services.swpc.noaa.gov/products/alerts.json",
            relatedEvents: [],
          },
        ],
      }),
    };

    const result = await evaluateObservatory({ domain: "space_weather" }, dependencies);

    expect(result).toMatchObject({ status: "ok", inserted: 2, candidateCount: 2 });
    expect(recorded.map((signal) => [signal.source, signal.triggerKey, signal.severity])).toEqual([
      ["donki", "space-weather:donki:AL-1", "severe"],
      ["swpc", "space-weather:swpc:AL-1", "strong"],
    ]);
  });

  it("does not backfill weather issued before the watch was enabled", async () => {
    const { store, recorded } = makeStore([weatherWatch()]);
    await evaluateObservatory(
      { domain: "space_weather" },
      {
        store,
        fetchSpaceWeatherCandidates: async () => ({
          complete: true,
          candidates: [{
            id: "old",
            source: "donki",
            category: "gst",
            title: "Old storm",
            summary: "Old",
            severity: "severe",
            issuedAt: "2026-07-11T23:59:59.000Z",
            relatedEvents: [],
          }],
        }),
      },
    );

    expect(recorded).toHaveLength(0);
  });

  it("creates ten initial approach signals and one stable overflow summary", async () => {
    const now = new Date("2026-07-12T12:00:00.000Z");
    const { store, recorded, suppressedTriggers } = makeStore([closeWatch()]);
    await evaluateObservatory(
      { domain: "close_approach" },
      {
        store,
        now: () => now,
        fetchCloseApproachCandidates: async () => ({
          complete: true,
          candidates: Array.from({ length: 13 }, (_, index) => ({
            id: `ui-${index}`,
            designation: `2026 A${index}`,
            orbitId: "1",
            approachTimeRaw: `2026-Jul-${String(13 + index).padStart(2, "0")} 12:00`,
            jd: toJulianDate(new Date(now.getTime() + (index + 1) * 60 * 60 * 1000)),
            distanceLd: 2,
            distanceKm: 768_800,
            relativeVelocityKmS: 12,
          })),
        }),
      },
    );

    expect(recorded).toHaveLength(11);
    expect(recorded.slice(0, 10).every((signal) => signal.eventType === "close_approach")).toBe(true);
    expect(recorded[0]?.eventAt).toMatch(/^2026-07-12T13:00:00\.000Z$/);
    expect(recorded[10]).toMatchObject({
      triggerKey: "close-approach:initial-summary",
      eventType: "close_approach_summary",
      title: "3 more close approaches matched",
    });
    expect(suppressedTriggers).toHaveLength(3);
  });

  it("does not advance the watermark when an upstream result is incomplete", async () => {
    const { store, recorded, getCompletedWatermark } = makeStore([closeWatch()]);
    const result = await evaluateObservatory(
      { domain: "close_approach" },
      {
        store,
        fetchCloseApproachCandidates: async () => ({ candidates: [], complete: false }),
      },
    );

    expect(result.status).toBe("incomplete");
    expect(recorded).toHaveLength(0);
    expect(getCompletedWatermark()).toBeUndefined();
  });

  it("returns a bounded continuation without advancing the watermark", async () => {
    const { store, getCompletedWatermark } = makeStore([
      weatherWatch({ id: 1 }),
      weatherWatch({ id: 2, userId: "user_2" }),
    ]);
    const result = await evaluateObservatory(
      { domain: "space_weather" },
      {
        store,
        watchPageSize: 1,
        fetchSpaceWeatherCandidates: async () => ({ candidates: [], complete: true }),
      },
    );

    expect(result.status).toBe("ok");
    expect(result.continuation).toBeDefined();
    expect(getCompletedWatermark()).toBeUndefined();

    const next = await evaluateObservatory(
      { domain: "space_weather", continuation: result.continuation },
      {
        store,
        watchPageSize: 1,
        fetchSpaceWeatherCandidates: async () => ({ candidates: [], complete: true }),
      },
    );
    expect(next.continuation).toBeUndefined();
    expect(getCompletedWatermark()).toBeString();
  });
});
