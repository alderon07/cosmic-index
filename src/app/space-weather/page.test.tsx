import { describe, expect, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("@/lib/space-weather/overview", () => ({
  SPACE_WEATHER_EVENT_WINDOW_DAYS: 90,
  SPACE_WEATHER_NOTIFICATIONS_WINDOW_DAYS: 30,
  buildSpaceWeatherOverviewSnapshot: async () => ({
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
    },
    notificationSummary: {
      total: 3,
      latestIssuedAt: "2026-04-12T10:00:00Z",
      warning: null,
      sourcesIncluded: ["donki", "swpc"],
    },
  }),
}));

const { metadata, default: SpaceWeatherOverviewPage } = await import(
  "@/app/space-weather/page"
);

describe("SpaceWeatherOverviewPage", () => {
  it("renders the observatory overview with deep links", async () => {
    const html = renderToStaticMarkup(await SpaceWeatherOverviewPage());

    expect(html).toContain("Space Weather Observatory");
    expect(html).toContain("/space-weather/events");
    expect(html).toContain("/space-weather/alerts");
    expect(html).toContain("/space-weather/solar");
    expect(html).toContain("/space-weather/geomagnetic");
    expect(html).toContain("90-day DONKI event window");
    expect(html).toContain("GOES SUVI");
    expect(html).toContain("GFZ Hp30");
  });

  it("publishes observatory metadata on the root route", () => {
    expect(metadata.title).toBe("Space Weather Observatory");
    expect(metadata.alternates).toMatchObject({
      canonical: "https://cosmicindex.dev/space-weather",
    });
  });
});
