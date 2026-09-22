import { describe, expect, it } from "bun:test";
import {
  getCuratedCatalogPaths,
  shouldIndexCatalogDetail,
} from "@/lib/catalog-index-policy";

describe("catalog detail indexing policy", () => {
  it.each([
    ["exoplanet", "TRAPPIST-1%20b"],
    ["star", "TRAPPIST-1"],
    ["small-body", "2023%20BU"],
  ] as const)("keeps generated %s records out of Search by default", (kind, id) => {
    expect(shouldIndexCatalogDetail(kind, id)).toBe(false);
  });

  it("starts with no manually reviewed catalog detail pages", () => {
    expect(getCuratedCatalogPaths("exoplanet")).toEqual([]);
    expect(getCuratedCatalogPaths("star")).toEqual([]);
    expect(getCuratedCatalogPaths("small-body")).toEqual([]);
  });
});
