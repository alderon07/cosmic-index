import { describe, expect, it } from "bun:test";
import { shouldIndexSmallBody } from "@/lib/small-body-seo";
import type { SmallBodyData } from "@/lib/types";

function smallBody(overrides: Partial<SmallBodyData> = {}): SmallBodyData {
  return {
    id: "2026-mq2",
    type: "SMALL_BODY",
    displayName: "2026 MQ2",
    aliases: [],
    source: "JPL_SBDB",
    sourceId: "2026 MQ2",
    summary: "A small body.",
    keyFacts: [],
    links: [],
    bodyKind: "asteroid",
    orbitClass: "Main-belt Asteroid",
    isNeo: false,
    isPha: false,
    ...overrides,
  };
}

describe("shouldIndexSmallBody", () => {
  it("indexes priority and distinctive catalog records", () => {
    expect(shouldIndexSmallBody(smallBody({ isPha: true }))).toBe(true);
    expect(shouldIndexSmallBody(smallBody({ isNeo: true }))).toBe(true);
    expect(shouldIndexSmallBody(smallBody({ bodyKind: "comet" }))).toBe(true);
    expect(shouldIndexSmallBody(smallBody({ displayName: "Pallas" }))).toBe(true);
    expect(shouldIndexSmallBody(smallBody({ diameterKm: 12, discoveredYear: 1984 }))).toBe(true);
  });

  it("does not index an unnamed, low-information main-belt record", () => {
    expect(shouldIndexSmallBody(smallBody())).toBe(false);
    expect(shouldIndexSmallBody(smallBody({ displayName: "144898" }))).toBe(false);
  });
});
