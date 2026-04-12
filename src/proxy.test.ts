import { describe, expect, it } from "bun:test";
import { isProtectedPagePath } from "@/proxy";

describe("proxy auth protection", () => {
  it("keeps billing publicly reachable", () => {
    expect(isProtectedPagePath("/settings/billing")).toBe(false);
  });

  it("keeps other settings pages protected", () => {
    expect(isProtectedPagePath("/settings/internal/pro-rollout")).toBe(true);
  });

  it("keeps user pages protected", () => {
    expect(isProtectedPagePath("/user/saved-objects")).toBe(true);
  });
});
