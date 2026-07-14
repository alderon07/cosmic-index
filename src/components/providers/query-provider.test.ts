import { describe, expect, it } from "bun:test";
import { getQueryCacheStorageKey } from "@/components/providers/query-provider";

describe("authenticated query cache isolation", () => {
  it("uses a different session key for each Clerk identity", () => {
    expect(getQueryCacheStorageKey("user_one"))
      .not.toBe(getQueryCacheStorageKey("user_two"));
  });

  it("does not assign signed-out data to an authenticated scope", () => {
    expect(getQueryCacheStorageKey(null)).toContain("signed-out");
    expect(getQueryCacheStorageKey("user_one")).toContain("user_one");
  });
});
