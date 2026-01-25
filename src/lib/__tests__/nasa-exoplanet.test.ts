/**
 * Unit tests for NASA Exoplanet Archive ADQL query generation
 */

import { buildBrowseQuery } from "../nasa-exoplanet";

describe("ADQL query generation", () => {
  describe("buildBrowseQuery", () => {
    it("escapes single quotes in query", () => {
      const result = buildBrowseQuery({ query: "O'Brien" });
      expect(result.query).toContain("O''Brien");
      expect(result.query).not.toContain("O'Brien");
    });

    it("escapes multiple single quotes", () => {
      const result = buildBrowseQuery({ query: "It's a planet's name" });
      expect(result.query).toContain("It''s a planet''s name");
    });

    it("strips percent wildcards from query", () => {
      const result = buildBrowseQuery({ query: "test%name" });
      expect(result.query).not.toContain("%test");
      expect(result.query).toContain("testname");
    });

    it("strips underscore wildcards from query", () => {
      const result = buildBrowseQuery({ query: "test_name_here" });
      expect(result.query).not.toContain("_");
      expect(result.query).toContain("testnamehere");
    });

    it("handles both quotes and wildcards", () => {
      const result = buildBrowseQuery({ query: "O'Brien_%test" });
      expect(result.query).toContain("O''Brientest");
      expect(result.query).not.toContain("%");
      expect(result.query).not.toContain("_");
    });

    it("escapes quotes in discovery method", () => {
      const result = buildBrowseQuery({ discoveryMethod: "Transit's Method" });
      expect(result.query).toContain("Transit''s Method");
    });

    it("does not strip wildcards from discovery method (exact match)", () => {
      // Discovery method uses = not LIKE, so wildcards are literal
      const result = buildBrowseQuery({ discoveryMethod: "Transit" });
      expect(result.query).toContain("discoverymethod='Transit'");
    });

    it("generates valid query without search params", () => {
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
      expect(result.page).toBe(500); // MAX_PAGE
    });

    it("clamps limit to maximum", () => {
      const result = buildBrowseQuery({ limit: 500 });
      expect(result.limit).toBe(100); // Max limit
    });

    it("includes year filters when provided", () => {
      const result = buildBrowseQuery({ yearFrom: 2020, yearTo: 2024 });
      expect(result.query).toContain("disc_year>=2020");
      expect(result.query).toContain("disc_year<=2024");
    });

    it("includes radius filter when requested", () => {
      const result = buildBrowseQuery({ hasRadius: true });
      expect(result.query).toContain("pl_rade is not null");
    });

    it("includes mass filter when requested", () => {
      const result = buildBrowseQuery({ hasMass: true });
      expect(result.query).toContain("pl_masse is not null");
    });
  });
});

describe("SQL injection prevention", () => {
  it("cannot break out of string with single quote", () => {
    const result = buildBrowseQuery({ query: "'); DROP TABLE ps; --" });
    // The quote should be escaped, not allowing SQL injection
    expect(result.query).toContain("''); DROP TABLE ps; --");
    // The query should still be a valid LIKE pattern
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
    // The % should be stripped
    expect(result.query).not.toMatch(/like '%'/);
    // Empty query after stripping means no query condition
    expect(result.query).not.toContain("pl_name like");
  });
});
