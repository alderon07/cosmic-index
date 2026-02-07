import {
  buildTimelineBuckets,
  parseCloseApproachTimestamp,
} from "@/lib/timeline-buckets";

describe("timeline bucket utilities", () => {
  it("builds daily buckets for short ranges", () => {
    const buckets = buildTimelineBuckets({
      events: [
        { timestamp: "2026-01-01T00:00:00.000Z" },
        { timestamp: "2026-01-01T08:00:00.000Z" },
        { timestamp: "2026-01-02T00:00:00.000Z" },
      ],
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-01-03T00:00:00.000Z"),
    });

    expect(buckets.length).toBe(3);
    expect(buckets[0].count).toBe(2);
    expect(buckets[1].count).toBe(1);
    expect(buckets[2].count).toBe(0);
  });

  it("parses CNEOS close approach timestamp format", () => {
    expect(parseCloseApproachTimestamp("2026-Jan-12 05:24")).toBe(
      "2026-01-12T05:24:00.000Z"
    );
  });
});
