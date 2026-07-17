import { describe, expect, it } from "bun:test";
import {
  buildExoplanetDetailNarrative,
  buildExoplanetJsonLd,
  buildExoplanetMetaDescription,
  getRelatedExoplanets,
} from "@/lib/exoplanet-detail";
import type { ExoplanetData } from "@/lib/types";

function makeExoplanet(overrides: Partial<ExoplanetData> = {}): ExoplanetData {
  return {
    id: "kepler-22-b",
    type: "EXOPLANET",
    displayName: "Kepler-22 b",
    aliases: [],
    source: "NASA_EXOPLANET_ARCHIVE",
    sourceId: "Kepler-22 b",
    summary: "Kepler-22 b is an exoplanet.",
    keyFacts: [],
    links: [],
    hostStar: "Kepler-22",
    discoveryMethod: "Transit",
    discoveredYear: 2011,
    ...overrides,
  };
}

describe("exoplanet detail helpers", () => {
  it("builds fact-based narrative sentences from available fields", () => {
    const narrative = buildExoplanetDetailNarrative(
      makeExoplanet({
        radiusEarth: 2.38,
        massEarth: 6.4,
        massIsEstimated: true,
        orbitalPeriodDays: 289.86,
        equilibriumTempK: 262,
        distanceParsecs: 190.1,
        spectralType: "G5",
        planetsInSystem: 3,
      })
    );

    expect(narrative[0]).toContain("Kepler-22 b orbits Kepler-22");
    expect(narrative[0]).toContain("2011");
    expect(narrative[0]).toContain("Transit");
    expect(narrative[1]).toContain("2.38 Earth radii");
    expect(narrative[1]).toContain("6.4 Earth masses (estimated)");
    expect(narrative[1]).toContain("289.86 days");
    expect(narrative[2]).toContain("190.1 parsecs");
    expect(narrative[2]).toContain("G5");
    expect(narrative[2]).toContain("3 known planets");
  });

  it("does not describe an M sin(i) minimum as a true planet mass", () => {
    const exoplanet = makeExoplanet({
      massEarth: 91.79,
      planetaryParameters: {
        massEarth: { value: 91.79, errorPlus: 6.11, errorMinus: 7.32 },
        massProvenance: "Msini",
      },
    });

    expect(buildExoplanetDetailNarrative(exoplanet)[1]).toContain(
      "a minimum mass of 91.79 Earth masses (M sin i)",
    );

    const jsonLd = buildExoplanetJsonLd(exoplanet, "dmpp-2-d");
    expect(jsonLd["@graph"][1].additionalProperty).toContainEqual(
      expect.objectContaining({ name: "Minimum Mass (M sin i)" }),
    );
  });

  it("returns related planets without the current page object", () => {
    const related = getRelatedExoplanets(
      [
        makeExoplanet({ id: "b", displayName: "Kepler-22 b" }),
        makeExoplanet({ id: "d", displayName: "Kepler-22 d" }),
        makeExoplanet({ id: "c", displayName: "Kepler-22 c" }),
      ],
      "b",
      8
    );

    expect(related.map((planet) => planet.id)).toEqual(["c", "d"]);
  });

  it("builds a concise metadata description from the strongest facts", () => {
    const description = buildExoplanetMetaDescription(
      makeExoplanet({
        radiusEarth: 2.38,
        orbitalPeriodDays: 289.86,
        distanceParsecs: 190.1,
      })
    );

    expect(description).toContain("Kepler-22 b is an exoplanet orbiting Kepler-22.");
    expect(description).toContain("reported in 2011");
    expect(description).toContain("via Transit");
    expect(description).toContain("2.38 Earth radii");
    expect(description.length).toBeLessThanOrEqual(158);
  });

  it("builds a graph-based json-ld payload for detail pages", () => {
    const jsonLd = buildExoplanetJsonLd(
      makeExoplanet({
        aliases: ["KOI-087"],
        radiusEarth: 2.38,
        massEarth: 6.4,
        distanceParsecs: 190.1,
      }),
      "kepler-22-b"
    );

    expect(jsonLd["@graph"]).toHaveLength(2);
    expect(jsonLd["@graph"][0]).toMatchObject({
      "@type": "WebPage",
      "@id": "https://cosmicindex.dev/exoplanets/kepler-22-b#webpage",
    });
    expect(jsonLd["@graph"][1]).toMatchObject({
      "@type": "Thing",
      "@id": "https://cosmicindex.dev/exoplanets/kepler-22-b#exoplanet",
      identifier: "Kepler-22 b",
      alternateName: ["KOI-087"],
    });
  });
});
