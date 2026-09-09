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
  {
    time_tag: "2026-04-14T17:02:00",
    active: false,
    source: "ACE",
    proton_density: 99,
    proton_speed: 999,
    proton_temperature: 999999,
  },
  {
    time_tag: "2026-04-14T17:02:00",
    active: true,
    source: "SOLAR1",
    proton_density: 2.6,
    proton_speed: 552.1,
    proton_temperature: 125000,
  },
  {
    time_tag: "2026-04-14T17:01:00",
    active: true,
    source: "SOLAR1",
    proton_density: null,
    proton_speed: 518.2,
    proton_temperature: 110000,
  },
  {
    time_tag: "2026-04-14T11:02:00",
    active: true,
    source: "SOLAR1",
    proton_density: null,
    proton_speed: 420.5,
    proton_temperature: 92500,
  },
  {
    time_tag: "2026-04-14T11:01:00",
    active: true,
    source: "SOLAR1",
    proton_density: 2.1,
    proton_speed: 419,
    proton_temperature: 91000,
  },
  { time_tag: "invalid", active: true, proton_speed: "bad" },
]);

const IMF_SAMPLE = JSON.stringify([
  {
    time_tag: "2026-04-14T17:02:00",
    active: false,
    source: "ACE",
    bx_gsm: 12,
    by_gsm: 13,
    bz_gsm: 14,
    phi_gsm: 15,
    theta_gsm: 16,
    bt: 17,
  },
  {
    time_tag: "2026-04-14T17:02:00",
    active: true,
    source: "SOLAR1",
    bx_gsm: -1.8,
    by_gsm: 5.3,
    bz_gsm: -11.4,
    phi_gsm: 108.8,
    theta_gsm: -31.1,
    bt: 9.3,
  },
  {
    time_tag: "2026-04-14T17:01:00",
    active: true,
    source: "SOLAR1",
    bx_gsm: -1.4,
    by_gsm: 5.1,
    bz_gsm: -7.2,
    phi_gsm: 106.5,
    theta_gsm: -23.5,
    bt: 7.8,
  },
  {
    time_tag: "2026-04-14T11:02:00",
    active: true,
    source: "SOLAR1",
    bx_gsm: -1.2,
    by_gsm: 4.8,
    bz_gsm: -3.5,
    phi_gsm: 104.1,
    theta_gsm: -12.3,
    bt: 6.1,
  },
  {
    time_tag: "2026-04-14T11:01:00",
    active: true,
    source: "SOLAR1",
    bx_gsm: null,
    by_gsm: null,
    bz_gsm: null,
    phi_gsm: null,
    theta_gsm: null,
    bt: null,
  },
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
      if (!url.endsWith("/json/rtsw/rtsw_wind_1m.json")) {
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
    expect(result.trend.map((point) => point.observedAt)).toEqual([
      "2026-04-14T11:02:00.000Z",
      "2026-04-14T17:01:00.000Z",
      "2026-04-14T17:02:00.000Z",
    ]);
    expect(result.trend[1]?.densityPerCc).toBeNull();
    expect(result.source.quality).toBe("realtime");
  });

  it("normalizes the SWPC IMF feed into a latest-field snapshot", async () => {
    globalThis.fetch = async (input: string | URL | Request) => {
      const url = String(input);
      if (!url.endsWith("/json/rtsw/rtsw_mag_1m.json")) {
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
    expect(result.currentValue?.lonGsmDeg).toBe(108.8);
    expect(result.source.label).toContain("IMF");
  });

  it("rejects active real-time records when NOAA's required measurement fields are missing", async () => {
    globalThis.fetch = async () => new Response(JSON.stringify([{
      time_tag: "2026-04-14T17:02:00",
      active: true,
      source: "SOLAR1",
    }]), { status: 200 });

    await expect(fetchSolarWindPlasmaSnapshot()).rejects.toThrow("no valid active plasma records");
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

      if (url.endsWith("/json/rtsw/rtsw_wind_1m.json")) {
        return new Response(PLASMA_SAMPLE, {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.endsWith("/json/rtsw/rtsw_mag_1m.json")) {
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

      if (url.endsWith("/json/rtsw/rtsw_wind_1m.json")) {
        return new Response(PLASMA_SAMPLE, {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.endsWith("/json/rtsw/rtsw_mag_1m.json")) {
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

  it("keeps propagated context when both real-time feeds are unavailable", async () => {
    globalThis.fetch = async (input: string | URL | Request) => {
      const url = String(input);

      if (
        url.endsWith("/json/rtsw/rtsw_wind_1m.json") ||
        url.endsWith("/json/rtsw/rtsw_mag_1m.json")
      ) {
        throw new Error("real-time feed offline");
      }

      if (url.endsWith("/geospace/propagated-solar-wind-1-hour.json")) {
        return new Response(PROPAGATED_SAMPLE, {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      throw new Error(`Unexpected propagated fallback URL: ${url}`);
    };

    const result = await buildSpaceWeatherSolarWindSnapshot();

    expect(result.snapshot).not.toBeNull();
    expect(result.snapshot?.plasma).toBeNull();
    expect(result.snapshot?.imf).toBeNull();
    expect(result.snapshot?.propagated?.currentValue?.speedKms).toBe(548.5);
    expect(result.snapshot?.interpretation.couplingRisk).toBe("unknown");
    expect(result.warnings).toHaveLength(2);
  });
});
