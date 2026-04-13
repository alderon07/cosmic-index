import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { __resetCacheStateForTests } from "@/lib/cache";

const originalFetch = globalThis.fetch;

const { buildSpaceWeatherSolarSnapshot, fetchSolarDrapSnapshot, fetchSolarFlareForecastSnapshot, fetchSolarSuviSnapshot } =
  await import("@/lib/space-weather/solar");

describe("space-weather solar adapters", () => {
  beforeEach(() => {
    __resetCacheStateForTests();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    __resetCacheStateForTests();
  });

  it("normalizes SUVI latest panels with source freshness", async () => {
    globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      expect(init?.method).toBe("HEAD");

      if (url.includes("/131/")) {
        return new Response(null, {
          status: 200,
          headers: { "last-modified": "Sun, 12 Apr 2026 12:04:00 GMT" },
        });
      }

      if (url.includes("/195/")) {
        return new Response(null, {
          status: 200,
          headers: { "last-modified": "Sun, 12 Apr 2026 12:08:00 GMT" },
        });
      }

      return new Response(null, {
        status: 200,
        headers: { "last-modified": "Sun, 12 Apr 2026 12:12:00 GMT" },
      });
    };

    const result = await fetchSolarSuviSnapshot();

    expect(result.panels).toHaveLength(3);
    expect(result.panels.map((panel) => panel.variant)).toEqual(["131", "195", "map"]);
    expect(result.panels[0]).toMatchObject({
      title: "131A quicklook",
      imageUrl: "https://services.swpc.noaa.gov/images/animations/suvi/secondary/131/latest.png",
    });
    expect(result.panels[2].source.observedAt).toBe("2026-04-12T12:12:00.000Z");
    expect(result.panels[0].source.quality).toBe("quicklook");
  });

  it("parses D-RAP status text into a media snapshot", async () => {
    globalThis.fetch = async () =>
      new Response(
        [
          "# DRAP Tabular Values",
          "# Product Valid At : 2026-04-13 01:41 UTC",
          "#",
          "# Estimated Recovery Time : No Estimate",
          "#",
          "#  X-RAY Message : Normal X-ray Background",
          "#",
          "#  X-RAY Warning : NO NEW X-RAY FLUX FOR 2 MINUTES",
          "#",
          "#  Proton Message : Normal Proton Background",
        ].join("\n"),
        { status: 200 },
      );

    const result = await fetchSolarDrapSnapshot();

    expect(result).toMatchObject({
      imageUrl: "https://services.swpc.noaa.gov/images/animations/d-rap/global/latest.png",
      estimatedRecoveryTime: "No Estimate",
      xrayMessage: "Normal X-ray Background",
      protonMessage: "Normal Proton Background",
    });
    expect(result.source.observedAt).toBe("2026-04-13T01:41:00.000Z");
    expect(result.warnings).toEqual(["NO NEW X-RAY FLUX FOR 2 MINUTES"]);
  });

  it("reduces SWPC flare probabilities into the next three forecast days", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify([
          {
            date: "2026-04-12T00:00:00",
            c_class_1_day: 75,
            c_class_2_day: 60,
            c_class_3_day: 60,
            m_class_1_day: 10,
            m_class_2_day: 10,
            m_class_3_day: 10,
            x_class_1_day: 1,
            x_class_2_day: 1,
            x_class_3_day: 1,
            "10mev_protons_1_day": 1,
            "10mev_protons_2_day": 1,
            "10mev_protons_3_day": 1,
            polar_cap_absorption: "green",
          },
        ]),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );

    const result = await fetchSolarFlareForecastSnapshot();

    expect(result.days).toHaveLength(3);
    expect(result.days[0]).toMatchObject({
      date: "2026-04-12",
      cClassProbability: 75,
      mClassProbability: 10,
      xClassProbability: 1,
      protonProbability: 1,
    });
    expect(result.days[1]).toMatchObject({
      date: "2026-04-13",
      cClassProbability: 60,
      mClassProbability: 10,
      xClassProbability: 1,
      protonProbability: 1,
    });
    expect(result.summary).toContain("75% C");
    expect(result.source.quality).toBe("forecast");
  });

  it("degrades the solar page snapshot when one upstream product fails", async () => {
    globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith("solar_probabilities.json")) {
        throw new Error("flare feed offline");
      }

      if (url.endsWith("drap_global_frequencies.txt")) {
        return new Response("# Product Valid At : 2026-04-13 01:41 UTC", { status: 200 });
      }

      if (init?.method === "HEAD") {
        return new Response(null, {
          status: 200,
          headers: { "last-modified": "Sun, 12 Apr 2026 12:12:00 GMT" },
        });
      }

      throw new Error(`Unexpected fetch URL in test: ${url}`);
    };

    const result = await buildSpaceWeatherSolarSnapshot();

    expect(result.suvi).not.toBeNull();
    expect(result.drap).not.toBeNull();
    expect(result.flareForecast).toBeNull();
    expect(result.warnings?.some((warning) => warning.includes("flare forecast"))).toBe(true);
  });
});
