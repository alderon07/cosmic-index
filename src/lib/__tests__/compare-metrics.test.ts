import {
  hasAbandonAfterCompareAdd,
  hasCompareCompletion,
  hasCompareEntry,
  hasDetailFollowthrough,
  isEligibleCompareSession,
  type CompareMetricEvent,
} from "@/lib/compare-metrics";

function events(types: CompareMetricEvent["type"][]): CompareMetricEvent[] {
  return types.map((type) => ({ type }));
}

describe("compare metrics eligibility", () => {
  it("marks session eligible after two detail/list interactions", () => {
    expect(
      isEligibleCompareSession(
        events(["object_card_viewed", "object_detail_viewed"])
      )
    ).toBe(true);
  });

  it("is not eligible with one interaction", () => {
    expect(isEligibleCompareSession(events(["object_card_viewed"]))).toBe(false);
  });

  it("detects compare entry and completion separately", () => {
    const eventSet = events([
      "object_card_viewed",
      "object_detail_viewed",
      "compare_open",
      "compare_expand",
    ]);
    expect(hasCompareEntry(eventSet)).toBe(true);
    expect(hasCompareCompletion(eventSet)).toBe(true);
  });

  it("detects followthrough and abandon guardrail", () => {
    expect(
      hasDetailFollowthrough(events(["compare_add", "detail_followthrough"]))
    ).toBe(true);
    expect(
      hasAbandonAfterCompareAdd(
        events(["compare_add", "session_end_without_followthrough"])
      )
    ).toBe(true);
  });
});
