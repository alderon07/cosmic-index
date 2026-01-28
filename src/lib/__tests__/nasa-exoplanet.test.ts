/**
 * Unit tests for NASA Exoplanet Archive ADQL query generation
 *
 * These test structural invariants of buildBrowseQuery:
 * - Input sanitization (quote escaping, wildcard stripping)
 * - Filter conditions appear in the WHERE clause
 * - Pagination clamping
 * - SQL injection prevention
 */

import { buildBrowseQuery } from "../nasa-exoplanet";

describe("ADQL query generation", () => {
  describe("buildBrowseQuery", () => {
    it("escapes single quotes in query (case-insensitive)", () => {
      const result = buildBrowseQuery({ query: "O'Brien" });
      // Query is lowercased for LIKE matching, but quotes must be escaped
      expect(result.query).toContain("o''brien");
      expect(result.query).not.toMatch(/o'brien[^']/);
    });

    it("escapes multiple single quotes", () => {
      const result = buildBrowseQuery({ query: "It's a planet's name" });
      expect(result.query).toContain("it''s a planet''s name");
    });

    it("strips percent wildcards from search query", () => {
      const result = buildBrowseQuery({ query: "test%name" });
      // The user's % is stripped; only the LIKE wrapper %...% should remain
      expect(result.query).toContain("testname");
      // Should not have three consecutive % (LIKE % + injected %)
      expect(result.query).not.toMatch(/%{2,}/);
    });

    it("strips underscore wildcards from search query", () => {
      const result = buildBrowseQuery({ query: "test_name_here" });
      expect(result.query).toContain("testnamehere");
    });

    it("handles both quotes and wildcards", () => {
      const result = buildBrowseQuery({ query: "O'Brien_%test" });
      expect(result.query).toContain("o''brientest");
    });

    it("escapes quotes in discovery method", () => {
      const result = buildBrowseQuery({ discoveryMethod: "Transit's Method" });
      expect(result.query).toContain("Transit''s Method");
    });

    it("uses exact match for discovery method", () => {
      const result = buildBrowseQuery({ discoveryMethod: "Transit" });
      expect(result.query).toContain("discoverymethod='Transit'");
    });

    it("generates valid base query without params", () => {
      const result = buildBrowseQuery({});
      expect(result.query).toContain("default_flag=1");
      expect(result.query).toContain("order by disc_year desc");
    });

    it("applies pagination correctly", () => {
      const result = buildBrowseQuery({ page: 2, limit: 10 });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(10);
    });

    it("clamps page to maximum", () => {
      const result = buildBrowseQuery({ page: 1000 });
      expect(result.page).toBeLessThanOrEqual(500);
    });

    it("clamps limit to MAX_PAGE_SIZE", () => {
      const result = buildBrowseQuery({ limit: 500 });
      expect(result.limit).toBeLessThanOrEqual(48);
    });

    it("includes year filter when provided", () => {
      const result = buildBrowseQuery({ year: 2020 });
      expect(result.query).toContain("disc_year=2020");
    });

    it("includes radius filter when requested", () => {
      const result = buildBrowseQuery({ hasRadius: true });
      expect(result.query).toContain("pl_rade is not null");
    });

    it("includes mass filter when requested", () => {
      const result = buildBrowseQuery({ hasMass: true });
      expect(result.query).toContain("pl_masse is not null");
    });

    it("includes distance filter when provided", () => {
      const result = buildBrowseQuery({ maxDistancePc: 100 });
      expect(result.query).toContain("sy_dist is not null and sy_dist <= 100");
    });

    it("does not include distance filter when absent", () => {
      const result = buildBrowseQuery({});
      expect(result.query).not.toContain("sy_dist <=");
      expect(result.query).not.toContain("sy_dist is not null");
    });

    it("combines distance filter with other filters", () => {
      const result = buildBrowseQuery({ maxDistancePc: 500, habitable: true });
      expect(result.query).toContain("sy_dist <= 500");
      expect(result.query).toContain("pl_eqt >= 200");
    });
  });
});

describe("SQL injection prevention", () => {
  it("cannot break out of string with single quote", () => {
    const result = buildBrowseQuery({ query: "'); DROP TABLE ps; --" });
    // The quote must be escaped — no unescaped single quote in the query value
    expect(result.query).toContain("''); drop table ps; --");
    expect(result.query).toContain("like '%");
  });

  it("cannot inject via discovery method", () => {
    const result = buildBrowseQuery({
      discoveryMethod: "Transit'; DROP TABLE ps; --",
    });
    expect(result.query).toContain("Transit''; DROP TABLE ps; --");
  });

  it("wildcards don't enable pattern injection", () => {
    // If someone tries to use % to match everything
    const result = buildBrowseQuery({ query: "%" });
    // The % should be stripped, leaving empty string → no query condition
    expect(result.query).not.toContain("pl_name like");
  });
});
