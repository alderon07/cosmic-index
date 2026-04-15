import { describe, expect, it } from "bun:test";
import { SPACE_WEATHER_NOTIFICATION_FILTER_TYPES } from "@/lib/types";

describe("SPACE_WEATHER_NOTIFICATION_FILTER_TYPES", () => {
  it("exposes the DONKI notification types currently supported by the app", () => {
    expect(SPACE_WEATHER_NOTIFICATION_FILTER_TYPES).toEqual([
      "all",
      "FLR",
      "SEP",
      "CME",
      "IPS",
      "GST",
      "RBE",
      "MPC",
    ]);
  });
});
