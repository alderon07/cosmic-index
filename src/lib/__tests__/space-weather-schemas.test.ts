import { describe, expect, it } from "bun:test";
import {
  AlertsPaginatedResultSchema,
  SpaceWeatherOverviewSnapshotSchema,
} from "@/lib/space-weather/schemas";

describe("SpaceWeatherOverviewSnapshotSchema", () => {
  it("parses the overview snapshot used by the observatory dashboard", () => {
    const result = SpaceWeatherOverviewSnapshotSchema.parse({
      generatedAt: "2026-04-12T12:00:00.000Z",
      latestEvent: {
        id: "2026-04-12T09:00:00-FLR-001",
        eventType: "FLR",
        startTime: "2026-04-12T09:00:00Z",
        classType: "M2.1",
      },
      eventSummary: {
        total: 4,
        dominantType: "FLR",
        windowDays: 90,
        warning: null,
      },
      notificationSummary: {
        total: 2,
        latestIssuedAt: "2026-04-12T10:00:00Z",
        warning: null,
        sourcesIncluded: ["donki", "swpc"],
      },
    });

    expect(result.latestEvent?.eventType).toBe("FLR");
    expect(result.notificationSummary.sourcesIncluded).toEqual(["donki", "swpc"]);
  });
});

describe("AlertsPaginatedResultSchema", () => {
  it("parses the unwrapped alerts result used by the alerts desk", () => {
    const result = AlertsPaginatedResultSchema.parse({
      objects: [
        {
          id: "20260412-AL-001",
          source: "donki",
          category: "cme",
          title: "Coronal Mass Ejection alert",
          summary: "CME watch remains elevated.",
          severity: "severe",
          issuedAt: "2026-04-12T12:00:00Z",
          sourceUrl: "https://example.com/donki/alert/1",
          activityCount: 1,
          relatedEventIds: ["2026-04-12T09:00:00-CME-001"],
          relatedEvents: [
            {
              id: "2026-04-12T09:00:00-CME-001",
              eventType: "CME",
              typeLabel: "Coronal Mass Ejection",
              severity: "severe",
              startTime: "2026-04-12T09:00:00Z",
            },
          ],
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      hasMore: false,
      mode: "offset",
      meta: {
        warnings: [],
        dateRange: {
          requestedStart: "2026-04-05",
          requestedEnd: "2026-04-12",
        },
      },
    });

    expect(result.objects).toHaveLength(1);
    expect(result.objects[0]?.relatedEvents[0]?.eventType).toBe("CME");
  });

  it("rejects invalid alert severities", () => {
    expect(() =>
      AlertsPaginatedResultSchema.parse({
        objects: [
          {
            id: "bad-alert",
            source: "swpc",
            category: "other",
            title: "Bad alert",
            summary: "Unsupported severity should fail validation.",
            severity: "warning",
            issuedAt: "2026-04-12T12:00:00Z",
            activityCount: 0,
            relatedEventIds: [],
            relatedEvents: [],
          },
        ],
        limit: 10,
        hasMore: false,
        mode: "offset",
      }),
    ).toThrow();
  });
});
