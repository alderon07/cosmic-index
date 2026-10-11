import { afterEach, expect, it } from "bun:test";
import { fetchJpl } from "../jpl-fetch";
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
it("cancels a queued request promptly without allowing later requests to overlap", async () => {
  let releaseFirst: () => void = () => {};
  let firstStarted: () => void = () => {};
  const started = new Promise<void>((resolve) => { firstStarted = resolve; });
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    if (calls > 1) return Response.json([]);
    return new Response(new ReadableStream<Uint8Array>({ start(controller) {
      releaseFirst = () => { controller.enqueue(new TextEncoder().encode("[]")); controller.close(); };
      firstStarted();
    } }));
  };
  const first = fetchJpl("https://ssd-api.jpl.nasa.gov/sbdb_query.api", {});
  await started;
  const controller = new AbortController();
  const second = fetchJpl("https://ssd-api.jpl.nasa.gov/sbdb.api", { signal: controller.signal }).catch(() => "cancelled");
  const third = fetchJpl("https://ssd-api.jpl.nasa.gov/fireball.api", {});
  controller.abort();
  try {
    const result = await Promise.race([second, new Promise<string>((resolve) => setTimeout(() => resolve("still queued"), 50))]);
    expect(result).toBe("cancelled");
    expect(calls).toBe(1);
  } finally { releaseFirst(); await Promise.allSettled([first, second, third]); }
  expect(calls).toBe(2);
});
