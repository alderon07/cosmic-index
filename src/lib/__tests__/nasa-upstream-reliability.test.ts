import { afterEach, describe, expect, it, jest } from "bun:test";
import { executeTAPQuery } from "../nasa-exoplanet";
import { fetchFireballs, getEnergySizeCategory } from "../cneos-fireball";
import { fetchCloseApproaches } from "../cneos-close-approach";
import { fetchSmallBodyByIdentifier, isUpstreamFailure } from "../jpl-sbdb";
import { __resetCacheStateForTests } from "../cache";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; jest.useRealTimers(); __resetCacheStateForTests(); });

it("retries transient TAP HTTP failures, but not invalid queries", async () => {
  let calls = 0;
  globalThis.fetch = async () => ++calls === 1 ? new Response("down", { status: 503 }) : Response.json([]);
  expect(await executeTAPQuery("select top 1 pl_name from ps")).toEqual([]);
  expect(calls).toBe(2);
  calls = 0;
  globalThis.fetch = async () => { calls++; return new Response("invalid", { status: 400 }); };
  await expect(executeTAPQuery("invalid query")).rejects.toThrow(/400/);
  expect(calls).toBe(1);
});

it("classifies closed upstream sockets for fallback and a 503 response", () => {
  expect(isUpstreamFailure(new TypeError("fetch failed", { cause: { code: "UND_ERR_SOCKET" } }))).toBe(true);
  expect(isUpstreamFailure(new Error("Invalid query"))).toBe(false);
});

it("uses the CNEOS radiated energy unit when estimating meteor size", () => {
  expect(getEnergySizeCategory(undefined, 100)).toBe("Large meteor");
});

describe("JPL request deadlines", () => {
  for (const [name, fetchData, timeout] of [
    ["fireballs", () => fetchFireballs({ limit: 1 }), 15_000],
    ["close approaches", () => fetchCloseApproaches({ limit: 1 }), 15_000],
    ["small body lookup", () => fetchSmallBodyByIdentifier("1"), 10_000],
  ] as const) {
    it(`aborts a stalled ${name} response body after headers arrive`, async () => {
      __resetCacheStateForTests();
      jest.useFakeTimers();
      let signal: AbortSignal | null | undefined;
      let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
      globalThis.fetch = async (_input, init) => {
        signal = init?.signal;
        return new Response(new ReadableStream<Uint8Array>({ start(controller) {
          streamController = controller;
          signal?.addEventListener("abort", () => controller.error(new DOMException("Aborted", "AbortError")), { once: true });
        } }));
      };
      const pending = fetchData().catch(() => null);
      for (let i = 0; i < 30; i++) await Promise.resolve();
      jest.advanceTimersByTime(timeout);
      try { expect(signal?.aborted).toBe(true); }
      finally {
        if (!signal?.aborted) { streamController?.enqueue(new TextEncoder().encode('{"count":"0"}')); streamController?.close(); }
        await pending;
      }
    });
  }
});

it("submits one SSD API request at a time, including body reads", async () => {
  __resetCacheStateForTests();
  let active = 0;
  let peak = 0;
  globalThis.fetch = async () => {
    active++;
    peak = Math.max(peak, active);
    return new Response(new ReadableStream<Uint8Array>({ start(controller) {
      setTimeout(() => {
        active--;
        controller.enqueue(new TextEncoder().encode('{"count":"0"}'));
        controller.close();
      }, 10);
    } }));
  };
  await Promise.all([fetchFireballs({ limit: 2 }), fetchSmallBodyByIdentifier("2")]);
  expect(peak).toBe(1);
});

it("treats a valid empty SBDB response as no results without invoking fallback", async () => {
  __resetCacheStateForTests();
  let calls = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ count: "0" }); };
  const { fetchSmallBodies } = await import("../jpl-sbdb");
  expect((await fetchSmallBodies({ query: "missing", limit: 1 })).objects).toEqual([]);
  expect(calls).toBe(1);
});
it("rejects malformed small-body lookup data as an upstream contract error", async () => {
  __resetCacheStateForTests();
  globalThis.fetch = async () => Response.json({ object: {} });
  await expect(fetchSmallBodyByIdentifier("broken")).rejects.toThrow(/Invalid JPL/);
});
it("accepts JPL objects without a name and nullable discovery fields", async () => {
  __resetCacheStateForTests();
  globalThis.fetch = async () => Response.json({ object: {
    des: "2024 YR4", fullname: "(2024 YR4)", kind: "au", spkid: "54509621",
    orbit_class: { name: "Apollo", code: "APO" }, prefix: null, neo: true, pha: false,
  }, discovery: { date: null, location: null, who: null } });
  expect((await fetchSmallBodyByIdentifier("2024 YR4"))?.sourceId).toBe("54509621");
});
