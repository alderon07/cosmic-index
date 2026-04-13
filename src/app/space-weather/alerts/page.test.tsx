import { describe, expect, it, mock } from "bun:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("@/lib/space-weather/alerts", () => ({
  fetchUnifiedSpaceWeatherAlerts: async () => ({
    alerts: [
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
      {
        id: "swpc:K05W:2223",
        source: "swpc",
        category: "gst",
        title: "Geomagnetic K-index of 5 expected",
        summary: "SWPC warning for geomagnetic activity.",
        severity: "minor",
        issuedAt: "2026-04-10T14:26:04.470Z",
        sourceUrl: "https://services.swpc.noaa.gov/products/alerts.json",
        activityCount: 0,
        relatedEventIds: [],
        relatedEvents: [],
      },
    ],
    count: 2,
    totalAvailable: 2,
    limitApplied: 10,
    page: 1,
    meta: {
      dateRange: {
        requestedStart: "2026-04-05",
        requestedEnd: "2026-04-12",
        effectiveStart: "2026-04-05",
        effectiveEnd: "2026-04-12",
      },
      typeIncluded: "all",
      sourcesIncluded: ["donki", "swpc"],
      relatedEventsResolved: 1,
      warnings: [],
      totalCapApplied: false,
      totalCap: 300,
    },
  }),
}));

const { metadata, default: SpaceWeatherAlertsPage } = await import(
  "@/app/space-weather/alerts/page"
);

describe("SpaceWeatherAlertsPage", () => {
  it("renders alerts page with educational context", async () => {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        {await SpaceWeatherAlertsPage()}
      </QueryClientProvider>,
    );

    expect(html).toContain("Space Weather Alerts");
    expect(html).toContain("Monitor space weather alerts from NASA DONKI and NOAA SWPC");
    expect(html).toContain("What are space weather alerts?");
    expect(html).toContain("DONKI vs. SWPC");
    expect(html).toContain("Browse Space Weather Events");
    expect(html).toContain('"@type":"CollectionPage"');
    expect(html).toContain("https://cosmicindex.dev/space-weather/alerts");
  });

  it("publishes canonical metadata for the alerts route", () => {
    expect(metadata.title).toBe("Space Weather Alerts");
    expect(metadata.alternates).toMatchObject({
      canonical: "https://cosmicindex.dev/space-weather/alerts",
    });
    expect(metadata.openGraph).toMatchObject({
      url: "https://cosmicindex.dev/space-weather/alerts",
      title: "Space Weather Alerts | Cosmic Index",
    });
  });
});
