import { describe, expect, it } from "bun:test";
import { SPACE_WEATHER_NOTIFICATION_FILTER_TYPES } from "@/lib/types";

describe("SPACE_WEATHER_NOTIFICATION_FILTER_TYPES", () => {
  it("exposes only the DONKI notification types currently normalized by the app", () => {
    expect(SPACE_WEATHER_NOTIFICATION_FILTER_TYPES).toEqual([
      "all",
      "FLR",
      "SEP",
      "CME",
      "IPS",
      "GST",
    ]);
  });
});
