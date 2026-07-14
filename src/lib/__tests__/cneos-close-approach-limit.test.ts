import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { __resetCacheStateForTests } from "@/lib/cache";
import { fetchCloseApproaches } from "@/lib/cneos-close-approach";

const originalFetch = globalThis.fetch;
let requestedUrls: string[] = [];

beforeEach(() => {
  requestedUrls = [];
  __resetCacheStateForTests();
  globalThis.fetch = async (input) => {
    requestedUrls.push(String(input));
    return Response.json({ count: "0" });
  };
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  __resetCacheStateForTests();
});

describe("fetchCloseApproaches", () => {
  it("sends the requested result limit to CNEOS", async () => {
    await fetchCloseApproaches({ limit: 37 });

    const cneosUrl = requestedUrls.find((url) => url.startsWith("https://ssd-api.jpl.nasa.gov/cad.api"));
    expect(cneosUrl).toBeDefined();
    expect(new URL(cneosUrl!).searchParams.get("limit")).toBe("37");
  });

  it("bounds and times out its secondary PHA lookup", async () => {
    const calls: Array<{ url: string; signal?: AbortSignal | null }> = [];
    globalThis.fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, signal: init?.signal });
      const parsed = new URL(url);
      if (parsed.hostname === "ssd-api.jpl.nasa.gov" && parsed.searchParams.get("pha") !== "true") {
        return Response.json({
          count: "1",
          fields: ["des", "orbit_id", "cd", "dist", "v_rel", "h"],
          data: [["2026 AB", "1", "2026-Apr-12 12:00", "0.01", "12", "20"]],
        });
      }
      return Response.json({ count: "0" });
    };

    await fetchCloseApproaches({ limit: 37 });

    const phaCall = calls.find(({ url }) => new URL(url).searchParams.get("pha") === "true");
    expect(phaCall).toBeDefined();
    expect(new URL(phaCall!.url).searchParams.get("limit")).toBe("500");
    expect(phaCall!.signal).toBeInstanceOf(AbortSignal);
  });
});
