import { describe, expect, it } from "bun:test";
import { buildExoplanetInterpretation } from "@/lib/exoplanet-interpretation";

describe("exoplanet measurement interpretation", () => {
  it("explains a spherical size comparison and short orbital periods", () => {
    const notes = buildExoplanetInterpretation({
      radiusEarth: 2,
      orbitalPeriodDays: 10,
    });
    expect(notes.find((note) => note.id === "size")?.text).toContain(
      "8 times Earth's volume",
    );
    expect(notes.find((note) => note.id === "orbit")?.text).toContain("36.5");
  });

  it("uses Earth years for a longer orbit", () => {
    const notes = buildExoplanetInterpretation({ orbitalPeriodDays: 730.5 });
    expect(notes.find((note) => note.id === "orbit")?.text).toContain(
      "2 Earth years",
    );
  });

  it.each([0, -1, NaN, Infinity, -Infinity])(
    "omits invalid physical measurements %s",
    (value) => {
      expect(
        buildExoplanetInterpretation({
          radiusEarth: value,
          orbitalPeriodDays: value,
          equilibriumTempK: value,
          massEarth: value,
        }),
      ).toEqual([]);
    },
  );

  it("does not turn a period bound into an exact orbital comparison", () => {
    const notes = buildExoplanetInterpretation({
      orbitalPeriodDays: 10,
      planetaryParameters: { orbitalPeriodDays: { value: 10, limit: "upper" } },
    });
    expect(notes.some((note) => note.id === "orbit")).toBe(false);
  });

  it("distinguishes minimum mass and estimates from measured mass", () => {
    const minimum = buildExoplanetInterpretation({
      massEarth: 5,
      planetaryParameters: { massProvenance: "Msini" },
    });
    expect(minimum.find((note) => note.id === "mass")?.text).toContain(
      "lower bound",
    );
    const estimated = buildExoplanetInterpretation({
      massEarth: 5,
      massIsEstimated: true,
    });
    expect(estimated.find((note) => note.id === "mass")?.text).toContain(
      "estimated",
    );
  });

  it("keeps a bound on M sin i distinct from a bound on the true mass", () => {
    const notes = buildExoplanetInterpretation({
      massEarth: 5,
      planetaryParameters: {
        massProvenance: "Msini",
        massEarth: { value: 5, limit: "upper" },
      },
    });
    const text = notes.find((note) => note.id === "mass")?.text;
    expect(text).toContain("M sin i");
    expect(text).toContain("viewing angle");
    expect(text).not.toContain("The mass is reported as an upper bound");
  });

  it("does not interpret equilibrium temperature as a surface measurement", () => {
    const notes = buildExoplanetInterpretation({ equilibriumTempK: 280 });
    expect(notes.find((note) => note.id === "temperature")?.text).toContain(
      "not a measured surface temperature",
    );
  });

  it("leaves missing data unclassified and avoids overflowing comparisons", () => {
    expect(buildExoplanetInterpretation({})).toEqual([]);
    expect(
      buildExoplanetInterpretation({
        radiusEarth: Number.MAX_VALUE,
        orbitalPeriodDays: Number.MIN_VALUE,
      }).some((note) => /Infinity|NaN/.test(note.text)),
    ).toBe(false);
  });
});
