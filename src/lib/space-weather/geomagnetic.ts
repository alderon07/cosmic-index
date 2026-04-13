import { CACHE_KEYS, CACHE_TTL, withCache } from "@/lib/cache";
import { fetchSpaceWeather } from "@/lib/nasa-donki";
import type {
  AnySpaceWeatherEvent,
  SpaceWeatherGeomagneticAeHour,
  SpaceWeatherGeomagneticAeSnapshot,
  SpaceWeatherGeomagneticHp30Point,
  SpaceWeatherGeomagneticHp30Snapshot,
  SpaceWeatherGeomagneticSnapshot,
  SpaceWeatherSourceMeta,
} from "@/lib/types";

const GFZ_HP30_URL = "https://www-app3.gfz.de/kp_index/Hp30_ap30_nowcast.txt";
const GFZ_HP30_PRODUCT_URL = "https://kp.gfz.de/en/hp30-hp60/data";
const KYOTO_AE_BASE_URL = "https://wdc.kugi.kyoto-u.ac.jp/ae_realtime/data_dir";
const KYOTO_AE_PRODUCT_URL = "https://wdc.kugi.kyoto-u.ac.jp/ae_realtime/index.html";
const GEOMAGNETIC_TIMEOUT_MS = 10_000;

function uniqueWarnings(warnings: Array<string | undefined>): string[] | undefined {
  const values = Array.from(new Set(warnings.filter(Boolean))) as string[];
  return values.length > 0 ? values : undefined;
}

function formatErrorMessage(prefix: string, error: unknown): string {
  if (error instanceof Error && error.message) {
    return `${prefix} (${error.message}).`;
  }
  return `${prefix}.`;
}

function buildSourceMeta(
  label: string,
  sourceUrl: string,
  observedAt: string | null,
  quality: SpaceWeatherSourceMeta["quality"],
): SpaceWeatherSourceMeta {
  return {
    label,
    sourceUrl,
    observedAt,
    fetchedAt: new Date().toISOString(),
    quality,
  };
}

async function fetchWithTimeout(input: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEOMAGNETIC_TIMEOUT_MS);

  try {
    const response = await fetch(input, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`request failed (${response.status})`);
    }
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchText(input: string): Promise<string> {
  const response = await fetchWithTimeout(input);
  return response.text();
}

function toIsoFromDecimalHour(year: number, month: number, day: number, decimalHour: number): string {
  const hours = Math.trunc(decimalHour);
  const minutes = Math.round((decimalHour - hours) * 60);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0)).toISOString();
}

function parseHp30Line(line: string): SpaceWeatherGeomagneticHp30Point | null {
  if (!line || line.startsWith("#")) return null;

  const parts = line.trim().split(/\s+/);
  if (parts.length < 10) return null;

  const [year, month, day, , midHour, , , hp30, ap30] = parts;
  const hp30Value = Number(hp30);
  const ap30Value = Number(ap30);

  if (!Number.isFinite(hp30Value) || hp30Value < 0 || !Number.isFinite(ap30Value) || ap30Value < 0) {
    return null;
  }

  return {
    observedAt: toIsoFromDecimalHour(
      Number(year),
      Number(month),
      Number(day),
      Number(midHour),
    ),
    hp30: hp30Value,
    ap30: ap30Value,
  };
}

function parseDirectoryNames(html: string): string[] {
  return Array.from(html.matchAll(/href="(\d{2,4})\/"/g), (match) => match[1] ?? "");
}

function parseAeHour(line: string): SpaceWeatherGeomagneticAeHour | { currentValue: number } | null {
  const match = line.match(/^AEALAOAU\s+(\d{6})E(\d{2})AE\s+QUICKLK\s+(.*)$/);
  if (!match) return null;

  const [, yymmdd, hour, remainder] = match;
  const tokens = remainder.trim().split(/\s+/).map((token) => Number(token)).filter(Number.isFinite);
  if (tokens.length < 2) return null;

  const minuteValues = tokens.slice(0, 60);
  const currentValue = minuteValues.at(-1) ?? tokens.at(-1) ?? 0;
  const meanValue = Number(
    (minuteValues.reduce((sum, value) => sum + value, 0) / minuteValues.length).toFixed(1),
  );
  const peakValue = Math.max(...minuteValues);

  const year = Number(`20${yymmdd.slice(0, 2)}`);
  const month = Number(yymmdd.slice(2, 4));
  const day = Number(yymmdd.slice(4, 6));

  return {
    hourStart: new Date(Date.UTC(year, month - 1, day, Number(hour), 0, 0, 0)).toISOString(),
    meanValue,
    peakValue,
    currentValue,
  } as SpaceWeatherGeomagneticAeHour & { currentValue: number };
}

export async function fetchGeomagneticHp30Snapshot(): Promise<SpaceWeatherGeomagneticHp30Snapshot> {
  return withCache(
    CACHE_KEYS.SPACE_WEATHER_GEOMAGNETIC_HP30,
    CACHE_TTL.SPACE_WEATHER_GEOMAGNETIC_HP30,
    async () => {
      const text = await fetchText(GFZ_HP30_URL);
      const trend = text
        .split(/\r?\n/)
        .map(parseHp30Line)
        .filter((point): point is SpaceWeatherGeomagneticHp30Point => point !== null)
        .slice(-48);

      const currentPoint = trend.at(-1) ?? null;
      return {
        currentValue: currentPoint?.hp30 ?? null,
        maxValue24h: trend.length > 0 ? Math.max(...trend.map((point) => point.hp30)) : null,
        trend,
        source: buildSourceMeta(
          "GFZ Hp30",
          GFZ_HP30_PRODUCT_URL,
          currentPoint?.observedAt ?? null,
          "realtime",
        ),
      };
    },
  );
}

async function fetchLatestAeFileText(): Promise<string> {
  const yearIndex = await fetchText(`${KYOTO_AE_BASE_URL}/`);
  const years = parseDirectoryNames(yearIndex).filter((value) => value.length === 4).sort();
  const latestYear = years.at(-1);
  if (!latestYear) {
    throw new Error("Kyoto AE year listing was empty");
  }

  const monthIndex = await fetchText(`${KYOTO_AE_BASE_URL}/${latestYear}/`);
  const months = parseDirectoryNames(monthIndex).filter((value) => value.length === 2).sort();
  const latestMonth = months.at(-1);
  if (!latestMonth) {
    throw new Error("Kyoto AE month listing was empty");
  }

  const dayIndex = await fetchText(`${KYOTO_AE_BASE_URL}/${latestYear}/${latestMonth}/`);
  const days = parseDirectoryNames(dayIndex).filter((value) => value.length === 2).sort();
  const latestDay = days.at(-1);
  if (!latestDay) {
    throw new Error("Kyoto AE day listing was empty");
  }

  const fileName = `ae${latestYear.slice(2)}${latestMonth}${latestDay}`;
  return fetchText(`${KYOTO_AE_BASE_URL}/${latestYear}/${latestMonth}/${latestDay}/${fileName}`);
}

export async function fetchGeomagneticAeSnapshot(): Promise<SpaceWeatherGeomagneticAeSnapshot> {
  return withCache(
    CACHE_KEYS.SPACE_WEATHER_GEOMAGNETIC_AE,
    CACHE_TTL.SPACE_WEATHER_GEOMAGNETIC_AE,
    async () => {
      const text = await fetchLatestAeFileText();
      const parsedHours = text
        .split(/\r?\n/)
        .map(parseAeHour)
        .filter((value): value is SpaceWeatherGeomagneticAeHour & { currentValue: number } => value !== null);

      if (parsedHours.length === 0) {
        throw new Error("Kyoto AE quicklook file did not contain AE rows");
      }

      const currentHour = parsedHours.at(-1)!;
      const observedAt = new Date(new Date(currentHour.hourStart).getTime() + 59 * 60_000).toISOString();

      return {
        currentValue: currentHour.currentValue,
        peakValue24h: Math.max(...parsedHours.map((hour) => hour.peakValue)),
        hourlySeries: parsedHours
          .map((hour) => ({
            hourStart: hour.hourStart,
            meanValue: hour.meanValue,
            peakValue: hour.peakValue,
          }))
          .slice(-24),
        source: buildSourceMeta(
          "Kyoto WDC AE",
          KYOTO_AE_PRODUCT_URL,
          observedAt,
          "provisional",
        ),
        warnings: [
          "Kyoto AE quicklook values can lag real time by roughly three weeks or less.",
        ],
      };
    },
  );
}

export async function buildSpaceWeatherGeomagneticSnapshot(): Promise<SpaceWeatherGeomagneticSnapshot> {
  const generatedAt = new Date().toISOString();
  const [hp30Result, aeResult, eventsResult] = await Promise.allSettled([
    fetchGeomagneticHp30Snapshot(),
    fetchGeomagneticAeSnapshot(),
    fetchSpaceWeather({
      eventTypes: ["GST", "IPS", "HSS"],
      limit: 6,
      page: 1,
    }),
  ]);

  return {
    generatedAt,
    hp30: hp30Result.status === "fulfilled" ? hp30Result.value : null,
    ae: aeResult.status === "fulfilled" ? aeResult.value : null,
    recentEvents:
      eventsResult.status === "fulfilled"
        ? eventsResult.value.events
        : ([] as AnySpaceWeatherEvent[]),
    warnings: uniqueWarnings([
      ...(hp30Result.status === "fulfilled" ? hp30Result.value.warnings ?? [] : [
        formatErrorMessage("GFZ Hp30 is temporarily unavailable", hp30Result.reason),
      ]),
      ...(aeResult.status === "fulfilled" ? aeResult.value.warnings ?? [] : [
        formatErrorMessage("Kyoto AE is temporarily unavailable", aeResult.reason),
      ]),
      ...(eventsResult.status === "fulfilled" ? eventsResult.value.meta.warnings ?? [] : [
        formatErrorMessage("Geomagnetic DONKI events are temporarily unavailable", eventsResult.reason),
      ]),
    ]),
  };
}
