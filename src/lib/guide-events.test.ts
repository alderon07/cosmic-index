import { describe, expect, it } from "bun:test";
import { getGuideEngagementEvent } from "./guide-events";

describe("guide engagement events", () => {
  it("accepts known actions and published guide identifiers", () => {
    expect(getGuideEngagementEvent("guide_save", "comparing-exoplanets")).toEqual({ name: "guide_save", guide: "comparing-exoplanets" });
  });
  it.each([
    ["email", "comparing-exoplanets"],
    ["guide_save", "private-user-input"],
    ["guide_save", "__proto__"],
    [undefined, undefined],
  ])("rejects arbitrary event names or identifiers", (name, guide) => {
    expect(getGuideEngagementEvent(name, guide)).toBeNull();
  });
});
