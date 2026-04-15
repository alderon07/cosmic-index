import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { __resetCacheStateForTests } from "@/lib/cache";
import { __resetDonkiTransientStateForTests, __setDonkiFetchForTests } from "@/lib/nasa-donki";

let seenEndpoints: string[] = [];

mock.module("@/app/space-weather/space-weather-page-client", () => ({
  SpaceWeatherLoadingSkeleton: () => <div>Loading space weather events</div>,
  SpaceWeatherPageClient: ({
    initialData,
    initialFetchKey,
  }: {
    initialData: { total: number } | null;
    initialFetchKey: string;
  }) => (
    <div data-fetch-key={initialFetchKey} data-total={initialData?.total ?? -1}>
      Space weather event browser
    </div>
  ),
}));

const { default: SpaceWeatherEventsPage, generateMetadata } = await import(
  "@/app/space-weather/events/page"
);

beforeEach(() => {
  seenEndpoints = [];
  __resetCacheStateForTests();
  __resetDonkiTransientStateForTests();
  __setDonkiFetchForTests(async (input) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
    const endpoint = url.pathname.split("/").pop() ?? "";
    seenEndpoints.push(endpoint);

    if (endpoint === "FLR") {
      return new Response(JSON.stringify([
        {
          flrID: "2026-04-12T09:00:00-FLR-001",
          beginTime: "2026-04-12T09:00:00Z",
          classType: "M2.1",
        },
      ]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    if (endpoint === "CME") {
      return new Response(JSON.stringify([
        {
          activityID: "2026-04-12T08:00:00-CME-001",
          startTime: "2026-04-12T08:00:00Z",
          cmeAnalyses: [{ speed: 980, isMostAccurate: true }],
        },
      ]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
});

afterAll(() => {
  __setDonkiFetchForTests(null);
  __resetDonkiTransientStateForTests();
  __resetCacheStateForTests();
  mock.restore();
});

describe("SpaceWeatherEventsPage", () => {
  it("renders the moved event browser under /space-weather/events", async () => {
    const html = renderToStaticMarkup(
      await SpaceWeatherEventsPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain("Space weather event browser");
    expect(html).toContain('data-fetch-key="v=2&amp;limit=21&amp;page=1"');
    expect(html).toContain('data-total="2"');
    expect(seenEndpoints.sort()).toEqual(["CME", "FLR", "GST", "HSS", "IPS", "SEP"]);
  });

  it("publishes canonical metadata for the events route", async () => {
    const metadata = await generateMetadata({
      searchParams: Promise.resolve({}),
    });

    expect(metadata.title).toBe("Space Weather Events");
    expect(metadata.alternates).toMatchObject({
      canonical: "https://cosmicindex.dev/space-weather/events",
    });
  });
});
