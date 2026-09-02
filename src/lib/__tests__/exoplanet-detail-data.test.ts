import { describe, expect, test } from "bun:test";
import type { ExoplanetData, StarData } from "@/lib/types";
import {
  loadExoplanetDetail,
  loadExoplanetSystemContext,
  type ExoplanetDetailSources,
  type ExoplanetSystemContextSources,
} from "@/lib/exoplanet-detail-data";

const indexedPlanet: ExoplanetData = {
  id: "kepler-22-b",
  type: "EXOPLANET",
  displayName: "Kepler-22 b",
  aliases: [],
  source: "NASA_EXOPLANET_ARCHIVE",
  sourceId: "Kepler-22 b",
  summary: "An indexed exoplanet.",
  keyFacts: [],
  links: [],
  hostStar: "Kepler-22",
  discoveryMethod: "Transit",
};

const upstreamPlanet: ExoplanetData = {
  ...indexedPlanet,
  summary: "An upstream exoplanet.",
};

const hostStar: StarData = {
  id: "kepler-22",
  type: "STAR",
  displayName: "Kepler-22",
  aliases: [],
  source: "NASA_EXOPLANET_ARCHIVE",
  sourceId: "Kepler-22",
  summary: "A host star.",
  keyFacts: [],
  links: [],
  hostname: "Kepler-22",
  planetCount: 1,
};

describe("loadExoplanetDetail", () => {
  test("uses the local index without calling NASA when the planet is indexed", async () => {
    let upstreamCalls = 0;
    const sources: ExoplanetDetailSources = {
      getIndexedExoplanet: async () => indexedPlanet,
      fetchUpstreamExoplanet: async () => {
        upstreamCalls += 1;
        return upstreamPlanet;
      },
    };

    await expect(loadExoplanetDetail("kepler-22-b", sources)).resolves.toBe(
      indexedPlanet,
    );
    expect(upstreamCalls).toBe(0);
  });

  test("falls back to NASA when the local index has no matching row", async () => {
    const sources: ExoplanetDetailSources = {
      getIndexedExoplanet: async () => null,
      fetchUpstreamExoplanet: async () => upstreamPlanet,
    };

    await expect(loadExoplanetDetail("kepler-22-b", sources)).resolves.toBe(
      upstreamPlanet,
    );
  });

  test("falls back to NASA when Turso has a transient failure", async () => {
    const failures: string[] = [];
    const sources: ExoplanetDetailSources = {
      getIndexedExoplanet: async () => {
        throw new Error("Turso returned 502");
      },
      fetchUpstreamExoplanet: async () => upstreamPlanet,
      reportFailure: (source) => failures.push(source),
    };

    await expect(loadExoplanetDetail("kepler-22-b", sources)).resolves.toBe(
      upstreamPlanet,
    );
    expect(failures).toEqual(["index"]);
  });
});

describe("loadExoplanetSystemContext", () => {
  test("loads independent host-star and sibling-planet data", async () => {
    const sources: ExoplanetSystemContextSources = {
      getHostStar: async () => hostStar,
      getSystemPlanets: async () => [indexedPlanet],
    };

    await expect(
      loadExoplanetSystemContext("Kepler-22", sources),
    ).resolves.toEqual({ hostStar, systemPlanets: [indexedPlanet] });
  });

  test("keeps sibling planets when the optional host-star lookup fails", async () => {
    const failures: string[] = [];
    const sources: ExoplanetSystemContextSources = {
      getHostStar: async () => {
        throw new Error("Turso returned 502");
      },
      getSystemPlanets: async () => [indexedPlanet],
      reportFailure: (source) => failures.push(source),
    };

    await expect(
      loadExoplanetSystemContext("Kepler-22", sources),
    ).resolves.toEqual({ hostStar: null, systemPlanets: [indexedPlanet] });
    expect(failures).toEqual(["host-star"]);
  });

  test("keeps the host star when the optional sibling-planet lookup fails", async () => {
    const failures: string[] = [];
    const sources: ExoplanetSystemContextSources = {
      getHostStar: async () => hostStar,
      getSystemPlanets: async () => {
        throw new Error("Turso returned 502");
      },
      reportFailure: (source) => failures.push(source),
    };

    await expect(
      loadExoplanetSystemContext("Kepler-22", sources),
    ).resolves.toEqual({ hostStar, systemPlanets: [] });
    expect(failures).toEqual(["system-planets"]);
  });
});
