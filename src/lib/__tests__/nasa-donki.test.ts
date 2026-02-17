import {
  dedupeSpaceWeatherEvents,
  normalizeSpaceWeatherResultSet,
  SPACE_WEATHER_MAX_TOTAL_RESULTS,
} from "../nasa-donki";
import { AnySpaceWeatherEvent } from "../types";

describe("dedupeSpaceWeatherEvents", () => {
  it("removes duplicate IDs", () => {
    const events: AnySpaceWeatherEvent[] = [
      {
        id: "2026-02-16T04:24:00-CME-001",
        eventType: "CME",
        startTime: "2026-02-16T04:24:00",
      },
      {
        id: "2026-02-16T04:24:00-CME-001",
        eventType: "CME",
        startTime: "2026-02-16T04:24:00",
      },
      {
        id: "2026-02-16T04:00:00-FLR-001",
        eventType: "FLR",
        startTime: "2026-02-16T04:00:00",
        classType: "M1.0",
      },
    ];

    const deduped = dedupeSpaceWeatherEvents(events);
    expect(deduped).toHaveLength(2);
    expect(deduped.map((event) => event.id)).toEqual([
      "2026-02-16T04:24:00-CME-001",
      "2026-02-16T04:00:00-FLR-001",
    ]);
  });

  it("keeps the most complete duplicate record", () => {
    const events: AnySpaceWeatherEvent[] = [
      {
        id: "2026-02-16T04:24:00-CME-001",
        eventType: "CME",
        startTime: "2026-02-16T04:24:00",
      },
      {
        id: "2026-02-16T04:24:00-CME-001",
        eventType: "CME",
        startTime: "2026-02-16T04:24:00",
        sourceLocation: "N12W22",
        speed: 1450,
      },
    ];

    const [event] = dedupeSpaceWeatherEvents(events);
    expect(event.eventType).toBe("CME");
    if (event.eventType !== "CME") {
      throw new Error("Expected CME event");
    }
    expect(event.speed).toBe(1450);
    expect(event.sourceLocation).toBe("N12W22");
  });

  it("keeps the first occurrence when completeness is equal", () => {
    const events: AnySpaceWeatherEvent[] = [
      {
        id: "2026-02-16T04:24:00-CME-001",
        eventType: "CME",
        startTime: "2026-02-16T04:24:00",
        sourceLocation: "N12W22",
      },
      {
        id: "2026-02-16T04:24:00-CME-001",
        eventType: "CME",
        startTime: "2026-02-16T04:24:00",
        sourceLocation: "S14E05",
      },
    ];

    const [event] = dedupeSpaceWeatherEvents(events);
    expect(event.sourceLocation).toBe("N12W22");
  });

  it("normalizes surrounding whitespace in event IDs", () => {
    const events: AnySpaceWeatherEvent[] = [
      {
        id: "2026-02-16T04:24:00-CME-001",
        eventType: "CME",
        startTime: "2026-02-16T04:24:00",
      },
      {
        id: " 2026-02-16T04:24:00-CME-001 ",
        eventType: "CME",
        startTime: "2026-02-16T04:24:00",
        speed: 900,
      },
    ];

    const [event] = dedupeSpaceWeatherEvents(events);
    expect(event.id).toBe("2026-02-16T04:24:00-CME-001");
    expect(event.eventType).toBe("CME");
    if (event.eventType !== "CME") {
      throw new Error("Expected CME event");
    }
    expect(event.speed).toBe(900);
  });
});

describe("normalizeSpaceWeatherResultSet", () => {
  it("sorts by startTime descending and pushes invalid timestamps to the end", () => {
    const events: AnySpaceWeatherEvent[] = [
      {
        id: "2026-01-01T00:00:00-CME-001",
        eventType: "CME",
        startTime: "2026-01-01T00:00:00",
      },
      {
        id: "invalid-ts-FLR-001",
        eventType: "FLR",
        startTime: "not-a-date",
        classType: "M1.0",
      },
      {
        id: "2026-02-01T00:00:00-GST-001",
        eventType: "GST",
        startTime: "2026-02-01T00:00:00",
        kpIndex: 6,
        allKpReadings: [],
      },
    ];

    const result = normalizeSpaceWeatherResultSet(events, 10, 1);
    expect(result.events.map((event) => event.id)).toEqual([
      "2026-02-01T00:00:00-GST-001",
      "2026-01-01T00:00:00-CME-001",
      "invalid-ts-FLR-001",
    ]);
  });

  it("applies offset-style paging when page is provided", () => {
    const events: AnySpaceWeatherEvent[] = [
      {
        id: "2026-02-03T00:00:00-CME-003",
        eventType: "CME",
        startTime: "2026-02-03T00:00:00",
      },
      {
        id: "2026-02-02T00:00:00-CME-002",
        eventType: "CME",
        startTime: "2026-02-02T00:00:00",
      },
      {
        id: "2026-02-01T00:00:00-CME-001",
        eventType: "CME",
        startTime: "2026-02-01T00:00:00",
      },
    ];

    const pageOne = normalizeSpaceWeatherResultSet(events, 2, 1);
    expect(pageOne.events.map((event) => event.id)).toEqual([
      "2026-02-03T00:00:00-CME-003",
      "2026-02-02T00:00:00-CME-002",
    ]);

    const pageTwo = normalizeSpaceWeatherResultSet(events, 2, 2);
    expect(pageTwo.events.map((event) => event.id)).toEqual([
      "2026-02-01T00:00:00-CME-001",
    ]);
    expect(pageTwo.totalAvailable).toBe(3);
  });

  it("caps total available events to the hard maximum", () => {
    const baseTime = Date.parse("2026-02-17T00:00:00Z");
    const events: AnySpaceWeatherEvent[] = Array.from(
      { length: SPACE_WEATHER_MAX_TOTAL_RESULTS + 5 },
      (_, index): AnySpaceWeatherEvent => {
        const timestamp = new Date(baseTime - index * 60_000).toISOString();
        return {
          id: `${timestamp}-CME-${String(index).padStart(3, "0")}`,
          eventType: "CME",
          startTime: timestamp,
        };
      }
    );

    const result = normalizeSpaceWeatherResultSet(events, SPACE_WEATHER_MAX_TOTAL_RESULTS, 1);
    expect(result.totalAvailable).toBe(SPACE_WEATHER_MAX_TOTAL_RESULTS);
    expect(result.events).toHaveLength(SPACE_WEATHER_MAX_TOTAL_RESULTS);
    expect(result.totalCapApplied).toBe(true);
  });

  it("returns an empty page when page is out of range", () => {
    const events: AnySpaceWeatherEvent[] = [
      {
        id: "2026-02-03T00:00:00-CME-003",
        eventType: "CME",
        startTime: "2026-02-03T00:00:00",
      },
      {
        id: "2026-02-02T00:00:00-CME-002",
        eventType: "CME",
        startTime: "2026-02-02T00:00:00",
      },
    ];

    const result = normalizeSpaceWeatherResultSet(events, 21, 5);
    expect(result.events).toHaveLength(0);
    expect(result.totalAvailable).toBe(2);
  });

  it("uses legacy limit behavior when page is omitted", () => {
    const events: AnySpaceWeatherEvent[] = [
      {
        id: "2026-02-03T00:00:00-CME-003",
        eventType: "CME",
        startTime: "2026-02-03T00:00:00",
      },
      {
        id: "2026-02-02T00:00:00-CME-002",
        eventType: "CME",
        startTime: "2026-02-02T00:00:00",
      },
      {
        id: "2026-02-01T00:00:00-CME-001",
        eventType: "CME",
        startTime: "2026-02-01T00:00:00",
      },
    ];

    const result = normalizeSpaceWeatherResultSet(events, 2);
    expect(result.events.map((event) => event.id)).toEqual([
      "2026-02-03T00:00:00-CME-003",
      "2026-02-02T00:00:00-CME-002",
    ]);
    expect(result.totalAvailable).toBe(3);
  });
});
