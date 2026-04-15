import {
  __resetDonkiTransientStateForTests,
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
  const originalNasaApiKey = process.env.NASA_API_KEY;

  beforeEach(() => {
    __resetDonkiTransientStateForTests();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.NASA_API_KEY;
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

  it("maps RBE and MPC notification messageType values without falling back to 'other'", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify([
          {
            messageType: "RBE",
            messageID: "20260120-AL-001",
            messageIssueTime: "2026-01-20T20:00Z",
            messageBody:
              "Activity ID: 2026-01-19T22:49:00-RBE-001\\nAdditional message body",
          },
          {
            messageType: "MPC",
            messageID: "20260120-AL-002",
            messageIssueTime: "2026-01-20T19:00Z",
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

    expect(result.notifications).toHaveLength(2);
    expect(result.notifications.map((notification) => notification.type)).toEqual(["RBE", "MPC"]);
    expect(result.meta.warnings).toBeUndefined();
  });

  it("accepts snake_case DONKI notification payloads and preserves CME entries", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify([
          {
            notification_id: "20260414-AL-001",
            message_type: "CME",
            message_issue_time: "2026-04-14T00:03:00+00:00",
            message_body:
              "## Message Type: Space Weather Notification - CME (Mars)\nActivity ID: 2026-04-13T18:24:00-CME-001",
            message_url: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/Alert/45655/1",
            created_at: "2026-04-14T00:30:03.224651+00:00",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );

    const result = await fetchSpaceWeatherNotifications({
      endDate: "2026-04-14",
      type: "all",
      limit: 8,
      page: 1,
    });

    expect(result.notifications).toHaveLength(1);
    expect(result.notifications[0]).toMatchObject({
      id: "20260414-AL-001",
      type: "CME",
      issuedAt: "2026-04-14T00:03:00+00:00",
      url: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/Alert/45655/1",
      activityIDs: ["2026-04-13T18:24:00-CME-001"],
    });
  });

  it("uses stale notifications when DONKI notifications are temporarily unavailable", async () => {
    let mode: "success" | "fail" = "success";

    globalThis.fetch = async () => {
      if (mode === "fail") {
        throw new TypeError("fetch failed");
      }

      return new Response(
        JSON.stringify([
          {
            messageType: "FLR",
            messageID: "20260121-AL-001",
            messageIssueTime: "2026-01-21T20:00Z",
            messageBody: "Activity ID: 2026-01-21T19:59:00-FLR-001",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const initial = await fetchSpaceWeatherNotifications({
      endDate: "2026-01-21",
      type: "all",
      limit: 8,
      page: 1,
    });
    expect(initial.notifications).toHaveLength(1);
    expect(initial.meta.warnings).toBeUndefined();

    mode = "fail";

    const fallback = await fetchSpaceWeatherNotifications({
      endDate: "2026-01-21",
      type: "all",
      limit: 8,
      page: 1,
    });

    expect(fallback.notifications).toHaveLength(1);
    expect(
      fallback.meta.warnings?.some((warning) =>
        warning.includes("Notifications are using stale cached data due to DONKI unavailability"),
      ),
    ).toBe(true);
  });

  it("fails over notifications to NASA when CCMC DONKI returns 503", async () => {
    process.env.NASA_API_KEY = "test_nasa_key";

    const requestedUrls: string[] = [];
    globalThis.fetch = async (input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      requestedUrls.push(url);

      if (url.includes("kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/notifications")) {
        return new Response("Service Unavailable", {
          status: 503,
          statusText: "Service Unavailable",
        });
      }

      if (url.includes("api.nasa.gov/DONKI/notifications")) {
        return new Response(
          JSON.stringify([
            {
              messageType: "FLR",
              messageID: "20260121-AL-002",
              messageIssueTime: "2026-01-21T21:00Z",
              messageBody: "Activity ID: 2026-01-21T20:59:00-FLR-001",
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

    const result = await fetchSpaceWeatherNotifications({
      endDate: "2026-01-21",
      type: "all",
      limit: 8,
      page: 1,
    });

    expect(result.notifications).toHaveLength(1);
    expect(
      requestedUrls.some((url) => url.includes("kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/notifications")),
    ).toBe(true);
    expect(requestedUrls.some((url) => url.includes("api.nasa.gov/DONKI/notifications"))).toBe(true);
  });
});

describe("DONKI upstream failure handling", () => {
  const originalFetch = globalThis.fetch;
  const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const originalNasaApiKey = process.env.NASA_API_KEY;

  beforeEach(() => {
    __resetDonkiTransientStateForTests();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.NASA_API_KEY;
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

  it("clamps overly large event windows to the maximum range", async () => {
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

    const result = await fetchSpaceWeather({
      startDate: "2025-01-01",
      endDate: "2026-02-17",
      eventTypes: ["FLR"],
      limit: 21,
      page: 1,
    });

    expect(requestedUrls).toHaveLength(1);
    expect(requestedUrls[0]).toContain("startDate=2025-11-19");
    expect(result.meta.dateRange.start).toBe("2025-11-19");
    expect(result.meta.dateRange.end).toBe("2026-02-17");
    expect(result.meta.warnings?.some((warning) => warning.includes("limited to 90 days"))).toBe(true);
  });

  it("uses a 90-day default event window when startDate is omitted", async () => {
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

    const result = await fetchSpaceWeather({
      endDate: "2026-02-17",
      eventTypes: ["FLR"],
      limit: 21,
      page: 1,
    });

    expect(requestedUrls).toHaveLength(1);
    expect(requestedUrls[0]).toContain("startDate=2025-11-19");
    expect(result.meta.dateRange.start).toBe("2025-11-19");
    expect(result.meta.dateRange.end).toBe("2026-02-17");
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

  it("reuses a cached exact-query event result for identical repeated requests", async () => {
    let fetchCallCount = 0;

    globalThis.fetch = async (input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      fetchCallCount += 1;

      if (!url.includes("/FLR")) {
        throw new Error(`Unexpected endpoint requested during exact-query cache test: ${url}`);
      }

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
    };

    const first = await fetchSpaceWeather({
      startDate: "2026-02-01",
      endDate: "2026-02-02",
      eventTypes: ["FLR"],
      limit: 21,
      page: 1,
    });
    const second = await fetchSpaceWeather({
      startDate: "2026-02-01",
      endDate: "2026-02-02",
      eventTypes: ["FLR"],
      limit: 21,
      page: 1,
    });

    expect(first.events).toHaveLength(1);
    expect(second.events).toHaveLength(1);
    expect(fetchCallCount).toBe(1);
  });

  it("allows slower CME responses without marking the source unavailable", async () => {
    globalThis.fetch = async (input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (!url.includes("/CME")) {
        throw new Error(`Unexpected endpoint requested during CME timeout test: ${url}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 8_500));

      return new Response(
        JSON.stringify([
          {
            activityID: "2026-04-14T19:12:00-CME-001",
            startTime: "2026-04-14T19:12:00Z",
            cmeAnalyses: [{ speed: 580, isMostAccurate: true }],
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const result = await fetchSpaceWeather({
      startDate: "2026-04-14",
      endDate: "2026-04-15",
      eventTypes: ["CME"],
      limit: 21,
      page: 1,
    });

    expect(result.events).toHaveLength(1);
    expect(result.meta.typesIncluded).toEqual(["CME"]);
    expect(result.meta.warnings).toBeUndefined();
  }, 15_000);

  it("restores a complete multi-type result from stale per-type caches after the exact-query cache ages out", async () => {
    let mode: "success" | "fail" = "success";
    const originalDateNow = Date.now;

    globalThis.fetch = async (input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;

      if (mode === "fail") {
        throw new TypeError("fetch failed");
      }

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

      if (url.includes("/CME")) {
        return new Response(
          JSON.stringify([
            {
              activityID: "2026-02-16T05:00:00-CME-001",
              startTime: "2026-02-16T05:00:00Z",
              cmeAnalyses: [{ speed: 900, isMostAccurate: true }],
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      throw new Error(`Unexpected endpoint requested during exact-query stale fallback test: ${url}`);
    };

    const initial = await fetchSpaceWeather({
      startDate: "2026-02-01",
      endDate: "2026-02-02",
      eventTypes: ["FLR", "CME"],
      limit: 21,
      page: 1,
    });

    expect(initial.events.map((event) => event.id)).toEqual([
      "2026-02-16T05:00:00-CME-001",
      "2026-02-16T04:24:00-FLR-001",
    ]);

    mode = "fail";
    Date.now = () => originalDateNow() + (31 * 60 * 1000);

    try {
      const fallback = await fetchSpaceWeather({
        startDate: "2026-02-01",
        endDate: "2026-02-02",
        eventTypes: ["FLR", "CME"],
        limit: 21,
        page: 1,
      });

      expect(fallback.events.map((event) => event.id)).toEqual([
        "2026-02-16T05:00:00-CME-001",
        "2026-02-16T04:24:00-FLR-001",
      ]);
      expect(fallback.meta.typesIncluded).toEqual(["FLR", "CME"]);
      expect(
        fallback.meta.warnings?.some((warning) =>
          warning.includes("stale cached data due to DONKI unavailability"),
        ),
      ).toBe(true);
    } finally {
      Date.now = originalDateNow;
    }
  });

  it("throws DonkiUpstreamUnavailableError for detail lookup when upstream fetch fails", async () => {
    globalThis.fetch = async () => {
      throw new TypeError("fetch failed");
    };

    await expect(
      fetchSpaceWeatherEventById("2026-02-16T18:00:00-GST-001")
    ).rejects.toBeInstanceOf(DonkiUpstreamUnavailableError);
  });

  it("falls back to stale per-type data when DONKI temporarily fails", async () => {
    let mode: "success" | "fail" = "success";
    const originalDateNow = Date.now;

    globalThis.fetch = async () => {
      if (mode === "fail") {
        throw new TypeError("fetch failed");
      }
      return new Response(
        JSON.stringify([
          {
            flrID: "2026-02-16T04:24:00-FLR-001",
            beginTime: "2026-02-16T04:24:00Z",
            classType: "M1.0",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const initial = await fetchSpaceWeather({
      startDate: "2026-02-01",
      endDate: "2026-02-02",
      eventTypes: ["FLR"],
      limit: 21,
      page: 1,
    });
    expect(initial.events).toHaveLength(1);
    expect(initial.meta.warnings).toBeUndefined();

    mode = "fail";
    Date.now = () => originalDateNow() + (31 * 60 * 1000);

    try {
      const fallback = await fetchSpaceWeather({
        startDate: "2026-02-01",
        endDate: "2026-02-02",
        eventTypes: ["FLR"],
        limit: 21,
        page: 1,
      });

      expect(fallback.events).toHaveLength(1);
      expect(fallback.meta.typesIncluded).toEqual(["FLR"]);
      expect(
        fallback.meta.warnings?.some((warning) => warning.includes("stale cached data due to DONKI unavailability")),
      ).toBe(true);
    } finally {
      Date.now = originalDateNow;
    }
  });

  it("prefers the CCMC DONKI gateway when NASA_API_KEY is set", async () => {
    process.env.NASA_API_KEY = "test_nasa_key";

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
    expect(requestedUrls[0]).toContain("kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR");
  });

  it("fails over event fetches to NASA when CCMC DONKI returns 503", async () => {
    process.env.NASA_API_KEY = "test_nasa_key";

    const requestedUrls: string[] = [];
    globalThis.fetch = async (input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      requestedUrls.push(url);

      if (url.includes("kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR")) {
        return new Response("Service Unavailable", {
          status: 503,
          statusText: "Service Unavailable",
        });
      }

      if (url.includes("api.nasa.gov/DONKI/FLR")) {
        return new Response(
          JSON.stringify([
            {
              flrID: "2026-02-16T04:24:00-FLR-001",
              beginTime: "2026-02-16T04:24:00Z",
              classType: "M1.0",
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
      startDate: "2026-02-01",
      endDate: "2026-02-02",
      eventTypes: ["FLR"],
      limit: 21,
      page: 1,
    });

    expect(result.events).toHaveLength(1);
    expect(requestedUrls.some((url) => url.includes("kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR"))).toBe(true);
    expect(requestedUrls.some((url) => url.includes("api.nasa.gov/DONKI/FLR"))).toBe(true);
  });

  it("applies base cooldown after retryable failures to reduce repeated pressure on failing upstreams", async () => {
    process.env.NASA_API_KEY = "test_nasa_key";

    const requestedUrls: string[] = [];
    globalThis.fetch = async (input: string | URL | Request) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      requestedUrls.push(url);

      if (url.includes("kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/SEP")) {
        return new Response("Service Unavailable", {
          status: 503,
          statusText: "Service Unavailable",
        });
      }

      if (url.includes("api.nasa.gov/DONKI/SEP")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    await fetchSpaceWeather({
      startDate: "2026-02-01",
      endDate: "2026-02-02",
      eventTypes: ["SEP"],
      limit: 21,
      page: 1,
    });

    await fetchSpaceWeather({
      startDate: "2026-02-03",
      endDate: "2026-02-04",
      eventTypes: ["SEP"],
      limit: 21,
      page: 1,
    });

    const ccmcSepCalls = requestedUrls.filter((url) =>
      url.includes("kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/SEP")
    );
    const nasaSepCalls = requestedUrls.filter((url) => url.includes("api.nasa.gov/DONKI/SEP"));

    expect(ccmcSepCalls).toHaveLength(1);
    expect(nasaSepCalls).toHaveLength(2);
  });

  it("limits concurrent upstream event requests across event types", async () => {
    process.env.NASA_API_KEY = "test_nasa_key";

    let inFlight = 0;
    let maxInFlight = 0;

    globalThis.fetch = async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);

      await new Promise((resolve) => setTimeout(resolve, 15));

      inFlight -= 1;
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    await fetchSpaceWeather({
      startDate: "2026-02-01",
      endDate: "2026-02-02",
      eventTypes: ["FLR", "CME", "GST", "IPS", "HSS", "SEP"],
      limit: 21,
      page: 1,
    });

    expect(maxInFlight).toBeLessThanOrEqual(4);
    expect(maxInFlight).toBeGreaterThanOrEqual(2);
  });
});
