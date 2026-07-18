import { describe, expect, it } from "bun:test";
import { buildStarJsonLd } from "@/lib/star-seo";
import type { StarData } from "@/lib/types";

const star: StarData = {
  id: "11-umi",
  type: "STAR",
  displayName: "11 UMi",
  aliases: ["HD 136726"],
  source: "NASA_EXOPLANET_ARCHIVE",
  sourceId: "11 UMi",
  summary: "11 UMi is a host star.",
  keyFacts: [],
  links: [],
  hostname: "11 UMi",
  planetCount: 1,
  stellarParameters: {
    systemReference: "Standing et al. 2026",
    identifiers: { hd: "HD 136726", hip: "HIP 74793", gaiaDR3: "Gaia DR3 1696798367260229376" },
    coordinates: { raDeg: 229.275, decDeg: 71.824 },
    parallaxMas: { value: 7.95, errorPlus: 0.12, errorMinus: -0.12 },
    photometry: [{ band: "V", magnitude: { value: 5.01 } }],
    abundances: [{ element: "Fe", notation: "[Fe/H]", medianDex: 0.01 }],
    solutions: [{ reference: "Dollinger et al. 2009", effectiveTemperatureK: { value: 4340 } }],
  },
};

describe("buildStarJsonLd", () => {
  it("includes enriched identifiers and published parameter provenance", () => {
    const jsonLd = buildStarJsonLd(star, "11-umi");

    expect(jsonLd.identifier).toContainEqual({
      "@type": "PropertyValue",
      propertyID: "HD",
      value: "HD 136726",
    });
    expect(jsonLd.additionalProperty).toContainEqual(expect.objectContaining({
      name: "Parallax",
      value: "7.95",
      unitText: "milliarcseconds",
    }));
    expect(jsonLd.additionalProperty).toContainEqual(expect.objectContaining({
      name: "Published stellar solutions",
      value: "1",
    }));
    expect(jsonLd.additionalProperty).toContainEqual(expect.objectContaining({
      name: "Stellar parameter source",
      value: "NASA Exoplanet Archive",
    }));
    expect(jsonLd.additionalProperty).toContainEqual(expect.objectContaining({
      name: "System reference",
      value: "Standing et al. 2026",
    }));
  });
});
