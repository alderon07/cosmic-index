import { describe, expect, it } from "bun:test";
import { getExportSourceNotice } from "@/components/export-button";

describe("getExportSourceNotice", () => {
  it("identifies both on-demand sources for research star exports", () => {
    const notice = getExportSourceNotice("stars", "research");

    expect(notice).toContain("NASA Exoplanet Archive");
    expect(notice).toContain("Hypatia Catalog");
    expect(notice).toContain("on demand");
  });

  it("does not show the enrichment notice for compact export profiles", () => {
    expect(getExportSourceNotice("stars", "basic")).toBeNull();
    expect(getExportSourceNotice("exoplanets", "research")).toBeNull();
  });
});
