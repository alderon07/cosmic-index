import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import SpaceWeatherDetailPage, { generateMetadata } from "./page";
import { __resetCacheStateForTests } from "@/lib/cache";
import {
  __resetDonkiTransientStateForTests,
  __setDonkiFetchForTests,
} from "@/lib/nasa-donki";

const eventId = "2026-09-17T01:24:00-IPS-001";
const pageProps = () => ({ params: Promise.resolve({ id: encodeURIComponent(eventId) }) });
const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

beforeEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  __resetCacheStateForTests();
  __resetDonkiTransientStateForTests();
});

afterEach(() => {
  __resetCacheStateForTests();
  __resetDonkiTransientStateForTests();
  if (originalRedisUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = originalRedisUrl;
  if (originalRedisToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = originalRedisToken;
});

describe("space weather event detail page", () => {
  it("renders event details and metadata when the upstream is available", async () => {
    __setDonkiFetchForTests(async () => Response.json([{
      activityID: eventId,
      eventTime: "2026-09-17T01:24:00Z",
      location: "Earth",
    }]));

    const metadata = await generateMetadata(pageProps());
    const html = renderToStaticMarkup(await SpaceWeatherDetailPage(pageProps()));

    expect(metadata.title).toContain("Interplanetary Shock");
    expect(html).toContain("Interplanetary Shock");
    expect(html).not.toContain("Event data is temporarily unavailable");
  });

  it("renders a retryable unavailable state and safe metadata during a DONKI outage", async () => {
    __setDonkiFetchForTests(async () => {
      throw new TypeError("fetch failed");
    });

    const metadata = await generateMetadata(pageProps());
    const html = renderToStaticMarkup(await SpaceWeatherDetailPage(pageProps()));

    expect(metadata.title).toBe("Space Weather Event Temporarily Unavailable");
    expect(metadata.robots).toMatchObject({ index: false, follow: true });
    expect(html).toContain("Event data is temporarily unavailable");
    expect(html).toContain("Try again");
    expect(html).toContain(`href="/space-weather/${encodeURIComponent(eventId)}"`);
    expect(html).toContain('href="/space-weather/events"');
    expect(html).toContain("data-no-ads");
    expect(html).not.toContain("Event Not Found");
  });

  it("keeps genuine missing events as 404s", async () => {
    __setDonkiFetchForTests(async () => Response.json([]));

    expect((await generateMetadata(pageProps())).title).toBe("Event Not Found");
    await expect(SpaceWeatherDetailPage(pageProps())).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });

  it("does not hide unrelated errors as upstream outages", async () => {
    const props = () => ({ params: Promise.resolve({ id: "%invalid" }) });

    await expect(generateMetadata(props())).rejects.toBeInstanceOf(URIError);
    await expect(SpaceWeatherDetailPage(props())).rejects.toBeInstanceOf(URIError);
  });
});
