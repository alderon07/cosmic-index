import {
  DonkiUpstreamUnavailableError,
  dedupeSpaceWeatherEvents,
  fetchSpaceWeather,
  fetchSpaceWeatherNotifications,
  fetchSpaceWeatherEventById,
  normalizeSpaceWeatherResultSet,
  parseEventType,
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

describe("space weather type expansion", () => {
  it("parses IPS/HSS/SEP event ids", () => {
    expect(parseEventType("2026-01-19T18:55:00-IPS-001")).toBe("IPS");
    expect(parseEventType("2026-01-28T08:08:00-HSS-001")).toBe("HSS");
    expect(parseEventType("2026-01-18T22:33:00-SEP-001")).toBe("SEP");
  });

  it("fetches IPS/HSS/SEP when requested", async () => {
    const originalFetch = globalThis.fetch;
    const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    globalThis.fetch = async (input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (url.includes("/IPS")) {
        return new Response(
          JSON.stringify([
            {
              activityID: "2026-01-19T18:55:00-IPS-001",
              eventTime: "2026-01-19T18:55Z",
              location: "Earth",
              instruments: [{ displayName: "ACE: MAG" }],
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/HSS")) {
        return new Response(
          JSON.stringify([
            {
              hssID: "2026-01-28T08:08:00-HSS-001",
              eventTime: "2026-01-28T08:08Z",
              instruments: [{ displayName: "ACE: SWEPAM" }],
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/SEP")) {
        return new Response(
          JSON.stringify([
            {
              sepID: "2026-01-18T22:33:00-SEP-001",
              eventTime: "2026-01-18T22:33Z",
              instruments: [{ displayName: "SOHO: COSTEP" }],
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const result = await fetchSpaceWeather({
      startDate: "2026-01-15",
      endDate: "2026-01-31",
      eventTypes: ["IPS", "HSS", "SEP"],
      limit: 21,
      page: 1,
    });

    expect(result.events).toHaveLength(3);
    expect(result.meta.typesIncluded).toEqual(["IPS", "HSS", "SEP"]);

    globalThis.fetch = originalFetch;
    if (originalRedisUrl) process.env.UPSTASH_REDIS_REST_URL = originalRedisUrl;
    if (originalRedisToken) process.env.UPSTASH_REDIS_REST_TOKEN = originalRedisToken;
  });
});

describe("notifications integration", () => {
  const originalFetch = globalThis.fetch;
  const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    globalThis.fetch = originalFetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
    if (originalRedisUrl) {
      process.env.UPSTASH_REDIS_REST_URL = originalRedisUrl;
    } else {
      delete process.env.UPSTASH_REDIS_REST_URL;
    }
    if (originalRedisToken) {
      process.env.UPSTASH_REDIS_REST_TOKEN = originalRedisToken;
    } else {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    }
  });

  it("clamps notification windows to DONKI's 30-day range", async () => {
    const requestedUrls: string[] = [];

    globalThis.fetch = async (input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      requestedUrls.push(url);

      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const result = await fetchSpaceWeatherNotifications({
      startDate: "2025-11-01",
      endDate: "2026-02-17",
      type: "CME",
      limit: 8,
      page: 1,
    });

    expect(requestedUrls).toHaveLength(1);
    expect(requestedUrls[0]).toContain("startDate=2026-01-18");
    expect(requestedUrls[0]).toContain("endDate=2026-02-17");
    expect(result.meta.warnings?.length).toBeGreaterThan(0);
  });

  it("maps unsupported notification messageType values to 'other'", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify([
          {
            messageType: "MPC",
            messageID: "20260120-AL-001",
            messageIssueTime: "2026-01-20T20:00Z",
            messageBody:
              "Activity ID: 2026-01-19T22:49:00-MPC-001\\nAdditional message body",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );

    const result = await fetchSpaceWeatherNotifications({
      endDate: "2026-01-21",
      type: "all",
      limit: 8,
      page: 1,
    });

    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0].type).toBe("other");
    expect(result.meta.warnings?.some((warning) => warning.includes("other"))).toBe(true);
  });
});

describe("DONKI upstream failure handling", () => {
  const originalFetch = globalThis.fetch;
  const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const originalNasaApiKey = process.env.NASA_API_KEY;
  const originalDonkiBaseUrl = process.env.DONKI_BASE_URL;

  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.NASA_API_KEY;
    delete process.env.DONKI_BASE_URL;
    globalThis.fetch = originalFetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
    if (originalRedisUrl) {
      process.env.UPSTASH_REDIS_REST_URL = originalRedisUrl;
    } else {
      delete process.env.UPSTASH_REDIS_REST_URL;
    }
    if (originalRedisToken) {
      process.env.UPSTASH_REDIS_REST_TOKEN = originalRedisToken;
    } else {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    }
    if (originalNasaApiKey) {
      process.env.NASA_API_KEY = originalNasaApiKey;
    } else {
      delete process.env.NASA_API_KEY;
    }
    if (originalDonkiBaseUrl) {
      process.env.DONKI_BASE_URL = originalDonkiBaseUrl;
    } else {
      delete process.env.DONKI_BASE_URL;
    }
  });

  it("throws DonkiUpstreamUnavailableError when all requested event types fail", async () => {
    globalThis.fetch = async () => {
      throw new TypeError("fetch failed");
    };

    await expect(
      fetchSpaceWeather({
        startDate: "2026-02-01",
        endDate: "2026-02-02",
        eventTypes: ["FLR", "CME", "GST"],
        limit: 21,
        page: 1,
      })
    ).rejects.toBeInstanceOf(DonkiUpstreamUnavailableError);
  });

  it("returns partial data with warnings when at least one source succeeds", async () => {
    globalThis.fetch = async (input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (url.includes("/FLR")) {
        return new Response(
          JSON.stringify([
            {
              flrID: "2026-02-16T04:24:00-FLR-001",
              beginTime: "2026-02-16T04:24:00Z",
              classType: "M1.0",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      throw new TypeError("fetch failed");
    };

    const result = await fetchSpaceWeather({
      startDate: "2026-02-01",
      endDate: "2026-02-02",
      eventTypes: ["FLR", "CME", "GST"],
      limit: 21,
      page: 1,
    });

    expect(result.events).toHaveLength(1);
    expect(result.meta.typesIncluded).toEqual(["FLR"]);
    expect(result.meta.warnings?.length).toBe(2);
  });

  it("throws DonkiUpstreamUnavailableError for detail lookup when upstream fetch fails", async () => {
    globalThis.fetch = async () => {
      throw new TypeError("fetch failed");
    };

    await expect(
      fetchSpaceWeatherEventById("2026-02-16T18:00:00-GST-001")
    ).rejects.toBeInstanceOf(DonkiUpstreamUnavailableError);
  });

  it("defaults to NASA DONKI gateway when NASA_API_KEY is set", async () => {
    process.env.NASA_API_KEY = "test_nasa_key";
    delete process.env.DONKI_BASE_URL;

    const requestedUrls: string[] = [];
    globalThis.fetch = async (input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      requestedUrls.push(url);
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    await fetchSpaceWeather({
      startDate: "2026-02-01",
      endDate: "2026-02-02",
      eventTypes: ["FLR"],
      limit: 21,
      page: 1,
    });

    expect(requestedUrls).toHaveLength(1);
    expect(requestedUrls[0]).toContain("api.nasa.gov/DONKI/FLR");
    expect(requestedUrls[0]).toContain("api_key=test_nasa_key");
  });
});
