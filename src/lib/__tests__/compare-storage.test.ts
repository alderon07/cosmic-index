import { describe, expect, it } from "bun:test";
import { parseCompareState } from "@/lib/compare-storage";

function stateJson(payload: unknown): string {
  return JSON.stringify(payload);
}

const exoplanetItem = {
  id: "exoplanets:Kepler-22b",
  domain: "exoplanets",
  displayName: "Kepler-22b",
  snapshotLevel: "list",
  facts: [{ key: "radius-earth", value: "2.4", unit: "R⊕" }],
};

const starItem = {
  id: "stars:TRAPPIST-1",
  domain: "stars",
  displayName: "TRAPPIST-1",
  snapshotLevel: "detail",
  facts: [{ key: "planet-count", value: "7" }],
};

describe("compare storage parsing", () => {
  it("accepts empty-but-valid state without reset", () => {
    const parsed = parseCompareState(
      stateJson({ version: 1, revision: 3, updatedAt: 1, domain: null, items: [] })
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.repaired).toBe(false);
      expect(parsed.state.items).toHaveLength(0);
      expect(parsed.state.domain).toBeNull();
    }
  });

  it("repairs stored domain mismatch from item id prefix", () => {
    const parsed = parseCompareState(
      stateJson({
        version: 1,
        revision: 1,
        updatedAt: 1,
        domain: "stars",
        items: [exoplanetItem],
      })
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.repaired).toBe(true);
      expect(parsed.state.domain).toBe("exoplanets");
      expect(parsed.state.items[0]?.domain).toBe("exoplanets");
    }
  });

  it("resets on mixed domains", () => {
    const parsed = parseCompareState(
      stateJson({
        version: 1,
        revision: 1,
        updatedAt: 1,
        domain: "exoplanets",
        items: [exoplanetItem, starItem],
      })
    );

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.reason).toBe("mixed-domains");
    }
  });

  it("resets on unknown id domain prefix", () => {
    const parsed = parseCompareState(
      stateJson({
        version: 1,
        revision: 1,
        updatedAt: 1,
        domain: "exoplanets",
        items: [
          {
            ...exoplanetItem,
            id: "unknown:foo",
          },
        ],
      })
    );

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.reason).toBe("unknown-domain");
    }
  });

  it("resets when parsed mode is disabled", () => {
    const parsed = parseCompareState(
      stateJson({
        version: 1,
        revision: 1,
        updatedAt: 1,
        domain: "stars",
        items: [starItem],
      }),
      { allowedDomains: ["exoplanets"] }
    );

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.reason).toBe("mode-disabled");
    }
  });

  it("rejects unknown versions", () => {
    const parsed = parseCompareState(stateJson({ version: 2, items: [] }));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.reason).toBe("unknown-version");
    }
  });
});
