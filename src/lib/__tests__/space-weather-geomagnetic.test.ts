import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { __resetCacheStateForTests } from "@/lib/cache";

const originalFetch = globalThis.fetch;

const {
  buildSpaceWeatherGeomagneticSnapshot,
  fetchGeomagneticAeSnapshot,
  fetchGeomagneticHp30Snapshot,
} = await import("@/lib/space-weather/geomagnetic");

const HP30_SAMPLE = [
  "# PURPOSE: This file distributes the Hp30 index and ap30 index of the geomagnetic Hpo index family",
  "# 30 header lines, all starting with #",
  "2026 04 13 22.5 22.75 34436.93750 34436.94792 2.333 7 0",
  "2026 04 13 23.0 23.25 34436.95833 34436.96875 3.667 15 0",
  "2026 04 13 23.5 23.75 34436.97917 34436.98958 4.000 18 0",
].join("\n");

const AE_YEAR_INDEX = `
<a href="2026/">2026/</a>
`;

const AE_MONTH_INDEX = `
<a href="03/">03/</a>
`;

const AE_DAY_INDEX = `
<a href="08/">08/</a>
`;

const AE_DAY_FILE = [
  "AEALAOAU    260308E00AE QUICKLK      100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100   100",
  "AEALAOAU    260308E01AE QUICKLK      200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200   200",
  "AEALAOAU    260308E02AE QUICKLK      300   305   310   315   320   325   330   335   340   345   350   355   360   365   370   375   380   385   390   395   400   405   410   415   420   425   430   435   440   445   450   455   460   465   470   475   480   485   490   495   500   505   510   515   520   525   530   535   540   545   550   555   560   565   570   575   580   585   590   595   404",
].join("\n");

describe("space-weather geomagnetic adapters", () => {
  beforeEach(() => {
    __resetCacheStateForTests();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    __resetCacheStateForTests();
  });

  it("normalizes the GFZ Hp30 nowcast feed into a trend snapshot", async () => {
    globalThis.fetch = async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith("Hp30_ap30_nowcast.txt")) {
        return new Response(HP30_SAMPLE, { status: 200 });
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    };

    const result = await fetchGeomagneticHp30Snapshot();

    expect(result.currentValue).toBe(4);
    expect(result.maxValue24h).toBe(4);
    expect(result.trend).toHaveLength(3);
    expect(result.trend[2]).toMatchObject({
      observedAt: "2026-04-13T23:45:00.000Z",
      hp30: 4,
      ap30: 18,
    });
    expect(result.source.label).toContain("GFZ");
  });

  it("normalizes the Kyoto AE quicklook feed into hourly buckets", async () => {
    globalThis.fetch = async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith("/ae_realtime/data_dir/")) {
        return new Response(AE_YEAR_INDEX, { status: 200 });
      }

      if (url.endsWith("/ae_realtime/data_dir/2026/03/")) {
        return new Response(AE_DAY_INDEX, { status: 200 });
      }

      if (url.endsWith("/ae_realtime/data_dir/2026/03/08/ae260308")) {
        return new Response(AE_DAY_FILE, { status: 200 });
      }

      if (url.endsWith("/ae_realtime/data_dir/2026/")) {
        return new Response(AE_MONTH_INDEX, { status: 200 });
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    };

    const result = await fetchGeomagneticAeSnapshot();

    expect(result.currentValue).toBe(595);
    expect(result.peakValue24h).toBe(595);
    expect(result.hourlySeries).toHaveLength(3);
    expect(result.hourlySeries[2]).toMatchObject({
      hourStart: "2026-03-08T02:00:00.000Z",
      meanValue: 447.5,
      peakValue: 595,
    });
    expect(result.source.quality).toBe("provisional");
    expect(result.warnings?.some((warning) => warning.includes("lag"))).toBe(true);
  });

  it("degrades the combined geomagnetic snapshot when one upstream fails", async () => {
    globalThis.fetch = async (input: string | URL | Request) => {
      const url = String(input);

      if (url.endsWith("Hp30_ap30_nowcast.txt")) {
        return new Response(HP30_SAMPLE, { status: 200 });
      }

      throw new Error(`offline: ${url}`);
    };

    const result = await buildSpaceWeatherGeomagneticSnapshot();

    expect(result.hp30).not.toBeNull();
    expect(result.ae).toBeNull();
    expect(result.warnings?.some((warning) => warning.includes("Kyoto AE"))).toBe(true);
  });
});
