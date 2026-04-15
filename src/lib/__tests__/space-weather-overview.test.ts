import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { __resetCacheStateForTests } from "@/lib/cache";

const fetchSpaceWeatherMock = mock(async (params?: { limit?: number; page?: number }) => {
  const fullWindowEvents = [
    ...Array.from({ length: 12 }, (_, index) => ({
      id: `2026-04-12T${String(12 - index).padStart(2, "0")}:00:00-FLR-${String(index + 1).padStart(3, "0")}`,
      eventType: "FLR" as const,
      startTime: `2026-04-12T${String(12 - index).padStart(2, "0")}:00:00Z`,
      classType: "M1.0",
    })),
    ...Array.from({ length: 13 }, (_, index) => ({
      id: `2026-04-10T${String(12 - index).padStart(2, "0")}:00:00-CME-${String(index + 1).padStart(3, "0")}`,
      eventType: "CME" as const,
      startTime: `2026-04-10T${String(12 - index).padStart(2, "0")}:00:00Z`,
      speed: 900,
    })),
  ];

  const events = (params?.limit ?? 0) >= 25 ? fullWindowEvents : fullWindowEvents.slice(0, 12);

  return {
    events,
    count: events.length,
    totalAvailable: fullWindowEvents.length,
    limitApplied: params?.limit ?? 100,
    ...(typeof params?.page === "number" ? { page: params.page } : {}),
    meta: {
      dateRange: { start: "2026-01-15", end: "2026-04-14" },
      typesIncluded: ["FLR", "CME"],
      totalCapApplied: false,
      totalCap: 420,
    },
  };
});

const fetchUnifiedSpaceWeatherAlertsMock = mock(async () => ({
  alerts: [
    {
      id: "20260412-AL-001",
      issuedAt: "2026-04-12T12:30:00Z",
    },
  ],
  count: 1,
  totalAvailable: 1,
  limitApplied: 8,
  page: 1,
  meta: {
    dateRange: {
      requestedStart: "2026-04-07",
      requestedEnd: "2026-04-14",
      effectiveStart: "2026-04-07",
      effectiveEnd: "2026-04-14",
    },
    typeIncluded: "all",
    sourcesIncluded: ["donki", "swpc"],
    relatedEventsResolved: 0,
    totalCapApplied: false,
    totalCap: 300,
  },
}));

mock.module("@/lib/nasa-donki", () => ({
  SPACE_WEATHER_MAX_TOTAL_RESULTS: 420,
  fetchSpaceWeather: (...args: Parameters<typeof fetchSpaceWeatherMock>) =>
    fetchSpaceWeatherMock(...args),
}));

mock.module("@/lib/space-weather/alerts", () => ({
  fetchUnifiedSpaceWeatherAlerts: (...args: Parameters<typeof fetchUnifiedSpaceWeatherAlertsMock>) =>
    fetchUnifiedSpaceWeatherAlertsMock(...args),
}));

const { buildSpaceWeatherOverviewSnapshot } = await import("@/lib/space-weather/overview");

describe("buildSpaceWeatherOverviewSnapshot", () => {
  beforeEach(() => {
    __resetCacheStateForTests();
    fetchSpaceWeatherMock.mockClear();
    fetchUnifiedSpaceWeatherAlertsMock.mockClear();
  });

  afterAll(() => {
    mock.restore();
  });

  it("derives the dominant event type from the full fetched event window", async () => {
    const snapshot = await buildSpaceWeatherOverviewSnapshot();

    expect(fetchSpaceWeatherMock).toHaveBeenCalledWith({
      eventTypes: ["FLR", "CME", "GST", "IPS", "HSS", "SEP"],
      limit: 420,
      page: 1,
    });
    expect(snapshot.latestEvent?.eventType).toBe("FLR");
    expect(snapshot.eventSummary.total).toBe(25);
    expect(snapshot.eventSummary.dominantType).toBe("CME");
  });
});
