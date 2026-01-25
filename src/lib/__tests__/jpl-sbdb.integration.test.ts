/**
 * Integration tests for JPL SBDB API
 *
 * These tests call the real JPL API and should only be run when needed.
 * Run with: RUN_INTEGRATION=1 pnpm test
 *
 * Note: These tests have a 30s timeout to account for real API latency.
 */

import { fetchSmallBodies, fetchSmallBodyByIdentifier } from "../jpl-sbdb";

const shouldRun = process.env.RUN_INTEGRATION === "1";
const describeIf = shouldRun ? describe : describe.skip;

describeIf(
  "JPL SBDB API contracts",
  () => {
    // Tolerant assertions - check for existence, not exact names
    it("search for 'halley' returns results containing 'halley'", async () => {
      const result = await fetchSmallBodies({ query: "halley" });

      expect(result.objects.length).toBeGreaterThan(0);
      expect(
        result.objects.some(
          (o) =>
            o.displayName.toLowerCase().includes("halley") ||
            o.aliases?.some((a) => a.toLowerCase().includes("halley"))
        )
      ).toBe(true);
    });

    it("search for 'ceres' returns results containing 'ceres'", async () => {
      const result = await fetchSmallBodies({ query: "ceres" });

      expect(result.objects.length).toBeGreaterThan(0);
      expect(
        result.objects.some(
          (o) =>
            o.displayName.toLowerCase().includes("ceres") ||
            o.aliases?.some((a) => a.toLowerCase().includes("ceres"))
        )
      ).toBe(true);
    });

    it("empty search returns paginated results", async () => {
      const result = await fetchSmallBodies({ limit: 10 });

      expect(result.objects.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.limit).toBe(10);
      expect(result.page).toBe(1);
    });

    it("filter by asteroids returns only asteroids", async () => {
      const result = await fetchSmallBodies({ kind: "asteroid", limit: 10 });

      expect(result.objects.length).toBeGreaterThan(0);
      result.objects.forEach((obj) => {
        expect(obj.bodyKind).toBe("asteroid");
      });
    });

    it("filter by comets returns only comets", async () => {
      const result = await fetchSmallBodies({ kind: "comet", limit: 10 });

      expect(result.objects.length).toBeGreaterThan(0);
      result.objects.forEach((obj) => {
        expect(obj.bodyKind).toBe("comet");
      });
    });

    it("filter by NEO returns NEOs", async () => {
      const result = await fetchSmallBodies({ neo: true, limit: 10 });

      expect(result.objects.length).toBeGreaterThan(0);
      result.objects.forEach((obj) => {
        expect(obj.isNeo).toBe(true);
      });
    });

    it("lookup by identifier finds known objects", async () => {
      // Test with a well-known asteroid
      const ceres = await fetchSmallBodyByIdentifier("1");

      expect(ceres).not.toBeNull();
      expect(ceres?.displayName.toLowerCase()).toContain("ceres");
    });

    it("pagination works correctly", async () => {
      const page1 = await fetchSmallBodies({ limit: 5, page: 1 });
      const page2 = await fetchSmallBodies({ limit: 5, page: 2 });

      expect(page1.objects.length).toBe(5);
      expect(page2.objects.length).toBe(5);
      expect(page1.page).toBe(1);
      expect(page2.page).toBe(2);

      // Ensure different results on different pages
      const page1Ids = page1.objects.map((o) => o.sourceId);
      const page2Ids = page2.objects.map((o) => o.sourceId);
      const overlap = page1Ids.filter((id) => page2Ids.includes(id));
      expect(overlap.length).toBe(0);
    });

    it("handles special characters in search", async () => {
      // This should not throw an error
      const result = await fetchSmallBodies({ query: "O'Brien" });

      // May or may not find results, but should not error
      expect(result).toBeDefined();
      expect(result.objects).toBeDefined();
    });

    it("handles very short queries", async () => {
      // Single character query - may be slow but should work
      const result = await fetchSmallBodies({ query: "a" });

      expect(result).toBeDefined();
      expect(result.objects).toBeDefined();
    });
  },
  30000 // 30s timeout for real API calls
);

// Always-run unit tests for utility functions
describe("JPL SBDB utility functions", () => {
  it("isContractMismatch identifies 400 errors", async () => {
    const { isContractMismatch } = await import("../jpl-sbdb");

    expect(isContractMismatch(new Error("JPL API error: 400 Bad Request"))).toBe(true);
    expect(isContractMismatch(new Error("Invalid response"))).toBe(true);
    expect(isContractMismatch(new Error("Failed to parse"))).toBe(true);
    expect(isContractMismatch(new Error("Request timed out"))).toBe(false);
  });

  it("isUpstreamFailure identifies timeout and 5xx errors", async () => {
    const { isUpstreamFailure } = await import("../jpl-sbdb");

    expect(isUpstreamFailure(new Error("Request to JPL API timed out"))).toBe(true);
    expect(isUpstreamFailure(new Error("500 Internal Server Error"))).toBe(true);
    expect(isUpstreamFailure(new Error("503 Service Unavailable"))).toBe(true);
    expect(isUpstreamFailure(new Error("400 Bad Request"))).toBe(false);
  });
});
