import { describe, expect, it } from "bun:test";
import type { ExoplanetData, SmallBodyData, StarData } from "@/lib/types";
import {
  compareDomainFromObject,
  createCompareItem,
  getCompareFactSchema,
  normalizeSmallBodyId,
} from "@/lib/compare-facts";

const baseLinks = [{ label: "source", url: "https://example.com" }];

const exoplanet: ExoplanetData = {
  id: "Kepler-22b",
  type: "EXOPLANET",
  displayName: "Kepler-22b",
  aliases: [],
  source: "NASA_EXOPLANET_ARCHIVE",
  sourceId: "Kepler-22 b",
  summary: "",
  keyFacts: [],
  links: baseLinks,
  hostStar: "Kepler-22",
  discoveryMethod: "Transit",
  discoveredYear: 2011,
  radiusEarth: 2.4,
  massEarth: 5.2,
};

const star: StarData = {
  id: "TRAPPIST-1",
  type: "STAR",
  displayName: "TRAPPIST-1",
  aliases: [],
  source: "NASA_EXOPLANET_ARCHIVE",
  sourceId: "TRAPPIST-1",
  summary: "",
  keyFacts: [],
  links: baseLinks,
  hostname: "TRAPPIST-1",
  planetCount: 7,
  spectralClass: "M",
};

const smallBody: SmallBodyData = {
  id: "433-Eros",
  type: "SMALL_BODY",
  displayName: "433 Eros",
  aliases: [],
  source: "JPL_SBDB",
  sourceId: "  433   Eros ",
  summary: "",
  keyFacts: [],
  links: baseLinks,
  bodyKind: "asteroid",
  orbitClass: "Apollo",
  isNeo: true,
  isPha: false,
};

describe("compare facts", () => {
  it("maps objects to compare domains", () => {
    expect(compareDomainFromObject(exoplanet)).toBe("exoplanets");
    expect(compareDomainFromObject(star)).toBe("stars");
    expect(compareDomainFromObject(smallBody)).toBe("small-bodies");
  });

  it("creates namespaced compare ids", () => {
    expect(createCompareItem(exoplanet)?.id).toBe("exoplanets:Kepler-22b");
    expect(createCompareItem(star)?.id).toBe("stars:TRAPPIST-1");
    expect(createCompareItem(smallBody)?.id).toBe(
      `small-bodies:${normalizeSmallBodyId("433 Eros")}`
    );
  });

  it("normalizes small body IDs aggressively", () => {
    expect(normalizeSmallBodyId(" 433  Eros ")).toBe(normalizeSmallBodyId("433 eros"));
    expect(normalizeSmallBodyId("433   Eros")).toBe("433-eros");
    expect(normalizeSmallBodyId(433)).toBe("433");
  });

  it("keeps schema ordering stable", () => {
    const first = getCompareFactSchema("small-bodies").map((fact) => fact.key);
    const second = getCompareFactSchema("small-bodies").map((fact) => fact.key);
    expect(first).toEqual(second);
    expect(first).toEqual([
      "body-kind",
      "orbit-class",
      "diameter-km",
      "absolute-magnitude-h",
      "is-neo",
      "is-pha",
      "discovered-year",
    ]);
  });
});
