import { dedupeSpaceWeatherEvents } from "../nasa-donki";
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
});
