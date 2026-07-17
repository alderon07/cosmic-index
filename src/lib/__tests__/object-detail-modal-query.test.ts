import { afterEach, describe, expect, it, mock } from "bun:test";
import { QueryClient } from "@tanstack/react-query";
import {
  getModalStarDetailQueryOptions,
  MODAL_STAR_DETAIL_GC_TIME_MS,
  MODAL_STAR_DETAIL_STALE_TIME_MS,
  resolveModalDetailObject,
} from "@/lib/object-detail-modal-query";
import type { ExoplanetData, StarData } from "@/lib/types";

const originalFetch = globalThis.fetch;

const compactStar: StarData = {
  id: "11%20UMi",
  type: "STAR",
  displayName: "11 UMi",
  aliases: [],
  source: "NASA_EXOPLANET_ARCHIVE",
  sourceId: "11 UMi",
  summary: "11 UMi is a host star.",
  keyFacts: [],
  links: [],
  hostname: "11 UMi",
  planetCount: 1,
};

const exoplanet: ExoplanetData = {
  id: "11%20UMi%20b",
  type: "EXOPLANET",
  displayName: "11 UMi b",
  aliases: [],
  source: "NASA_EXOPLANET_ARCHIVE",
  sourceId: "11 UMi b",
  summary: "11 UMi b is an exoplanet.",
  keyFacts: [],
  links: [],
  hostStar: "11 UMi",
  discoveryMethod: "Radial Velocity",
};

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("getModalStarDetailQueryOptions", () => {
  it("only enables enrichment for an open star modal", () => {
    expect(getModalStarDetailQueryOptions(compactStar, false).enabled).toBe(false);
    expect(getModalStarDetailQueryOptions(exoplanet, true).enabled).toBe(false);
    expect(getModalStarDetailQueryOptions(null, true).enabled).toBe(false);

    const options = getModalStarDetailQueryOptions(compactStar, true);
    expect(options.enabled).toBe(true);
    expect(options.queryKey).toEqual(["objects", "stars", "detail", "11%20UMi"]);
    expect(options.staleTime).toBe(MODAL_STAR_DETAIL_STALE_TIME_MS);
    expect(options.gcTime).toBe(MODAL_STAR_DETAIL_GC_TIME_MS);
    expect(options.retry).toBe(false);
  });

  it("deduplicates repeated modal detail reads through the query cache", async () => {
    const enrichedStar: StarData = {
      ...compactStar,
      aliases: ["HIP 74793"],
      stellarParameters: {
        identifiers: { hip: "HIP 74793" },
        coordinates: {},
        photometry: [],
        abundances: [],
        solutions: [{ reference: "Gaia DR2", effectiveTemperatureK: { value: 4248.7 } }],
      },
    };
    const fetchMock = mock(async () => Response.json({ data: enrichedStar }));
    globalThis.fetch = fetchMock as typeof fetch;

    const client = new QueryClient();
    const options = getModalStarDetailQueryOptions(compactStar, true);
    const [first, second] = await Promise.all([
      client.fetchQuery(options),
      client.fetchQuery(options),
    ]);
    const third = await client.fetchQuery(options);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/stars/11%20UMi");
    expect(first.stellarParameters?.solutions).toHaveLength(1);
    expect(second).toEqual(first);
    expect(third).toEqual(first);
  });

  it("only replaces the compact object with matching star detail", () => {
    const enrichedStar: StarData = {
      ...compactStar,
      aliases: ["HIP 74793"],
      stellarParameters: {
        identifiers: { hip: "HIP 74793" },
        coordinates: {},
        photometry: [],
        abundances: [],
        solutions: [],
      },
    };

    expect(resolveModalDetailObject(compactStar, enrichedStar)).toBe(enrichedStar);
    expect(resolveModalDetailObject(exoplanet, enrichedStar)).toBe(exoplanet);
    expect(resolveModalDetailObject(compactStar, { ...enrichedStar, id: "other" })).toBe(compactStar);
  });
});
