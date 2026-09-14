import { describe, expect, it } from "bun:test";
import {
  RANDOM_OBJECT_PATHS,
  getRandomObjectPath,
} from "@/lib/random-object";

describe("getRandomObjectPath", () => {
  it("selects across the complete candidate range", () => {
    expect(getRandomObjectPath(() => 0)).toBe(RANDOM_OBJECT_PATHS[0]);
    expect(getRandomObjectPath(() => 0.999999)).toBe(
      RANDOM_OBJECT_PATHS[RANDOM_OBJECT_PATHS.length - 1],
    );
  });

  it("only exposes canonical object detail routes", () => {
    expect(RANDOM_OBJECT_PATHS.length).toBeGreaterThan(3);
    expect(RANDOM_OBJECT_PATHS).toContain("/exoplanets/TRAPPIST-1%20e");
    expect(RANDOM_OBJECT_PATHS).toContain("/stars/TRAPPIST-1");
    expect(RANDOM_OBJECT_PATHS).toContain("/small-bodies/433");

    for (const path of RANDOM_OBJECT_PATHS) {
      expect(path).toMatch(/^\/(exoplanets|stars|small-bodies)\/[^/]+$/);
    }
  });
});
