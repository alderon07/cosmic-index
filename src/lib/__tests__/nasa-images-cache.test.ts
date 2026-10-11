import { afterEach, beforeEach, expect, it } from "bun:test";
import { searchImagesForObjectWithTtl } from "../nasa-images";
import { __resetCacheStateForTests } from "../cache";
const originalFetch = globalThis.fetch;
const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
let assetCalls = 0;
let cached: Map<string, string>;
beforeEach(() => {
  cached = new Map(); assetCalls = 0;
  process.env.UPSTASH_REDIS_REST_URL = "https://test-cache.upstash.io";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  __resetCacheStateForTests();
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.startsWith("https://test-cache.upstash.io")) {
      const payload = JSON.parse(String(init?.body)) as string[] | string[][];
      const execute = (command: string[]) => {
        if (command[0] === "get") return { result: cached.get(command[1]) ?? null };
        if (command[0] === "set") { cached.set(command[1], command[2]); return { result: "OK" }; }
        throw new Error(`Unexpected cache command ${command[0]}`);
      };
      return Response.json(Array.isArray(payload[0]) ? (payload as string[][]).map(execute) : execute(payload as string[]));
    }
    if (url.includes("/asset/")) { assetCalls++; return Response.json({ collection: { items: [{ href: "https://images-assets.nasa.gov/ceres~orig.jpg" }] } }); }
    return Response.json({ collection: { items: [{
      data: [{ nasa_id: "Ceres", title: "Ceres asteroid surface crater" }],
      links: [{ href: "https://images-assets.nasa.gov/ceres~thumb.jpg", rel: "preview" }],
    }] } });
  };
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL; else process.env.UPSTASH_REDIS_REST_URL = originalUrl;
  if (originalToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN; else process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
  __resetCacheStateForTests();
});
it("reuses the asset manifest across object searches", async () => {
  for (const name of ["Ceres", "1 Ceres"]) {
    const result = await searchImagesForObjectWithTtl({ type: "SMALL_BODY", name });
    expect(result.images[0]?.imageUrl).toBe("https://images-assets.nasa.gov/ceres~orig.jpg");
  }
  expect(assetCalls).toBe(1);
});
it("only exposes approved HTTPS NASA image URLs", async () => {
  const safeFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith("https://test-cache.upstash.io")) return safeFetch(input, init);
    if (String(input).includes("/asset/")) return Response.json({ collection: { items: [{ href: "https://evil.test/ceres~orig.jpg" }] } });
    return Response.json({ collection: { items: [{ data: [{ nasa_id: "Ceres", title: "Ceres asteroid surface crater" }],
      links: [{ href: "http://images-assets.nasa.gov/ceres.jpg", rel: "preview" }] }] } });
  };
  const data = await searchImagesForObjectWithTtl({ type: "SMALL_BODY", name: "Ceres" });
  expect(data.images[0]?.imageUrl).toBe("https://images-assets.nasa.gov/ceres.jpg");
});
