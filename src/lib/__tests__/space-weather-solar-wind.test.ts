import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { __resetCacheStateForTests } from "@/lib/cache";

const originalFetch = globalThis.fetch;

const {
  buildSpaceWeatherSolarWindSnapshot,
  fetchPropagatedSolarWindSnapshot,
  fetchSolarWindImfSnapshot,
  fetchSolarWindPlasmaSnapshot,
} = await import("@/lib/space-weather/solar-wind");

const PLASMA_SAMPLE = JSON.stringify([
  ["time_tag", "density", "speed", "temperature"],
  ["2026-04-14 17:00:00.000", "2.10", "420.5", "92500"],
  ["2026-04-14 17:01:00.000", "2.45", "518.2", "110000"],
  ["2026-04-14 17:02:00.000", "2.60", "552.1", "125000"],
]);

const IMF_SAMPLE = JSON.stringify([
  ["time_tag", "bx_gsm", "by_gsm", "bz_gsm", "lon_gsm", "lat_gsm", "bt"],
  ["2026-04-14 17:00:00.000", "-1.2", "4.8", "-3.5", "104.1", "-12.3", "6.1"],
  ["2026-04-14 17:01:00.000", "-1.4", "5.1", "-7.2", "106.5", "-23.5", "7.8"],
  ["2026-04-14 17:02:00.000", "-1.8", "5.3", "-11.4", "108.8", "-31.1", "9.3"],
]);

const PROPAGATED_SAMPLE = JSON.stringify([
  ["time_tag", "speed", "density", "temperature", "bx", "by", "bz", "bt", "vx", "vy", "vz", "propagated_time_tag"],
  ["2026-04-14 17:00:00.000", "510.2", "2.30", "101000", "-2.4", "3.7", "-8.4", "8.8", null, null, null, "2026-04-14 17:53:00.000"],
  ["2026-04-14 17:01:00.000", "525.0", "2.45", "109500", "-2.1", "4.1", "-9.2", "9.4", null, null, null, "2026-04-14 17:54:00.000"],
  ["2026-04-14 17:02:00.000", "548.5", "2.61", "123500", "-1.8", "4.5", "-10.1", "10.0", null, null, null, "2026-04-14 17:55:00.000"],
]);

describe("space-weather solar-wind adapters", () => {
  beforeEach(() => {
    __resetCacheStateForTests();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    __resetCacheStateForTests();
  });

  it("normalizes the SWPC plasma feed into a latest-value snapshot", async () => {
    globalThis.fetch = async (input: string | URL | Request) => {
      const url = String(input);
      if (!url.endsWith("/solar-wind/plasma-6-hour.json")) {
        throw new Error(`Unexpected plasma URL: ${url}`);
      }

      return new Response(PLASMA_SAMPLE, {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const result = await fetchSolarWindPlasmaSnapshot();

    expect(result.currentValue).toMatchObject({
      observedAt: "2026-04-14T17:02:00.000Z",
      speedKms: 552.1,
      densityPerCc: 2.6,
      temperatureK: 125000,
    });
    expect(result.trend).toHaveLength(3);
    expect(result.source.quality).toBe("realtime");
  });

  it("normalizes the SWPC IMF feed into a latest-field snapshot", async () => {
    globalThis.fetch = async (input: string | URL | Request) => {
      const url = String(input);
      if (!url.endsWith("/solar-wind/mag-6-hour.json")) {
        throw new Error(`Unexpected IMF URL: ${url}`);
      }

      return new Response(IMF_SAMPLE, {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const result = await fetchSolarWindImfSnapshot();

    expect(result.currentValue).toMatchObject({
      observedAt: "2026-04-14T17:02:00.000Z",
      bzNt: -11.4,
      btNt: 9.3,
      byNt: 5.3,
      latGsmDeg: -31.1,
    });
    expect(result.trend).toHaveLength(3);
    expect(result.source.label).toContain("IMF");
  });

  it("normalizes the propagated solar-wind geospace feed", async () => {
    globalThis.fetch = async (input: string | URL | Request) => {
      const url = String(input);
      if (!url.endsWith("/geospace/propagated-solar-wind-1-hour.json")) {
        throw new Error(`Unexpected propagated URL: ${url}`);
      }

      return new Response(PROPAGATED_SAMPLE, {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const result = await fetchPropagatedSolarWindSnapshot();

    expect(result.currentValue).toMatchObject({
      observedAt: "2026-04-14T17:02:00.000Z",
      propagatedAt: "2026-04-14T17:55:00.000Z",
      speedKms: 548.5,
      bzNt: -10.1,
      btNt: 10,
    });
    expect(result.trend).toHaveLength(3);
    expect(result.source.quality).toBe("operational");
  });

  it("builds a storm-favorable combined snapshot from southward Bz and elevated speed", async () => {
    globalThis.fetch = async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith("/solar-wind/plasma-6-hour.json")) {
        return new Response(PLASMA_SAMPLE, {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.endsWith("/solar-wind/mag-6-hour.json")) {
        return new Response(IMF_SAMPLE, {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.endsWith("/geospace/propagated-solar-wind-1-hour.json")) {
        return new Response(PROPAGATED_SAMPLE, {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      throw new Error(`Unexpected combined URL: ${url}`);
    };

    const result = await buildSpaceWeatherSolarWindSnapshot();

    expect(result.snapshot?.current).toMatchObject({
      speedKms: 552.1,
      densityPerCc: 2.6,
      temperatureK: 125000,
      btNt: 9.3,
      bzNt: -11.4,
    });
    expect(result.snapshot?.interpretation).toMatchObject({
      bzState: "southward",
      couplingRisk: "storm-favorable",
    });
    expect(result.snapshot?.interpretation.summary).toContain("geomagnetic");
    expect(result.snapshot?.propagated?.currentValue?.propagatedAt).toBe("2026-04-14T17:55:00.000Z");
  });

  it("degrades gracefully when the propagated feed is unavailable", async () => {
    globalThis.fetch = async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith("/solar-wind/plasma-6-hour.json")) {
        return new Response(PLASMA_SAMPLE, {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.endsWith("/solar-wind/mag-6-hour.json")) {
        return new Response(IMF_SAMPLE, {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.endsWith("/geospace/propagated-solar-wind-1-hour.json")) {
        throw new Error("propagation offline");
      }

      throw new Error(`Unexpected degraded URL: ${url}`);
    };

    const result = await buildSpaceWeatherSolarWindSnapshot();

    expect(result.snapshot).not.toBeNull();
    expect(result.snapshot?.propagated).toBeNull();
    expect(result.warnings?.some((warning) => warning.includes("Propagated solar wind"))).toBe(true);
  });
});
