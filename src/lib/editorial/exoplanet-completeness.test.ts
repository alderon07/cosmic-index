import { describe, expect, it } from "bun:test";
import { summarizeCompleteness } from "./exoplanet-completeness";

const planet = {
  pl_name: "Example b", discoverymethod: "Transit",
  pl_rade: 1, pl_radelim: 0, pl_masse: 2, pl_masselim: 0,
  pl_msinie: null, pl_msinielim: null,
};

describe("editorial measurement completeness", () => {
  it("keeps minimum masses separate and excludes limits and missing flags", () => {
    const result = summarizeCompleteness([
      planet,
      { ...planet, pl_name: "Limit b", pl_masselim: 1 },
      { ...planet, pl_name: "Minimum b", pl_masse: null, pl_msinie: 3, pl_msinielim: 0 },
      { ...planet, pl_name: "Unknown b", pl_radelim: null, pl_masse: null },
      { ...planet, pl_name: "Zero b", pl_rade: 0, pl_masse: -1 },
    ]);
    expect(result).toEqual([{ method: "Transit", total: 5, radius: 3, mass: 1, both: 1, minimumMass: 1 }]);
  });

  it("rejects duplicate planets so multiple literature solutions cannot inflate counts", () => {
    expect(() => summarizeCompleteness([planet, planet])).toThrow("Duplicate planet");
  });

  it("rejects empty, malformed, and non-finite upstream data", () => {
    for (const input of [[], {}, [{ ...planet, pl_rade: "1" }], [{ ...planet, pl_masse: Infinity }]]) {
      expect(() => summarizeCompleteness(input)).toThrow();
    }
  });

  it("keeps small discovery groups and orders them deterministically", () => {
    expect(summarizeCompleteness([
      planet,
      { ...planet, pl_name: "Other b", discoverymethod: "Astrometry" },
    ]).map((group) => group.method)).toEqual(["Astrometry", "Transit"]);
  });
});
