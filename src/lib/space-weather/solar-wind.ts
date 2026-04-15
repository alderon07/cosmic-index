import { CACHE_KEYS, CACHE_TTL, withCache } from "@/lib/cache";
import type {
  SpaceWeatherSolarWindImfPoint,
  SpaceWeatherSolarWindImfSnapshot,
  SpaceWeatherSolarWindInterpretation,
  SpaceWeatherSolarWindPageSnapshot,
  SpaceWeatherSolarWindPlasmaSnapshot,
  SpaceWeatherSolarWindPoint,
  SpaceWeatherSolarWindPropagatedPoint,
  SpaceWeatherSolarWindPropagatedSnapshot,
  SpaceWeatherSolarWindSnapshot,
  SpaceWeatherSourceMeta,
} from "@/lib/types";

const SWPC_SITE_BASE_URL = "https://www.swpc.noaa.gov";
const SWPC_SERVICES_BASE_URL = "https://services.swpc.noaa.gov";
const SOLAR_WIND_FETCH_TIMEOUT_MS = 8_000;

const REALTIME_SOLAR_WIND_PRODUCT_URL = `${SWPC_SITE_BASE_URL}/products/real-time-solar-wind`;
const PLASMA_URL = `${SWPC_SERVICES_BASE_URL}/products/solar-wind/plasma-6-hour.json`;
const IMF_URL = `${SWPC_SERVICES_BASE_URL}/products/solar-wind/mag-6-hour.json`;
const PROPAGATED_URL = `${SWPC_SERVICES_BASE_URL}/products/geospace/propagated-solar-wind-1-hour.json`;

type RawSwpcTable = unknown[][];

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

function toIsoOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.includes("T")
    ? value
    : value.replace(" ", "T");
  const withZone = normalized.endsWith("Z") ? normalized : `${normalized}Z`;
  const parsed = new Date(withZone);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function parseNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
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
  const timeoutId = setTimeout(() => controller.abort(), SOLAR_WIND_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(input, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`SWPC request failed (${response.status})`);
    }

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchJsonTable(input: string): Promise<RawSwpcTable> {
  const response = await fetchWithTimeout(input);
  return response.json() as Promise<RawSwpcTable>;
}

function parseTableRows(table: RawSwpcTable): {
  header: string[];
  rows: unknown[][];
} {
  if (!Array.isArray(table) || table.length === 0) {
    throw new Error("SWPC table was empty");
  }

  const [headerRow, ...rows] = table;
  if (!Array.isArray(headerRow)) {
    throw new Error("SWPC table header was invalid");
  }

  return {
    header: headerRow.map((value) => String(value)),
    rows: rows.filter(Array.isArray),
  };
}

function indexColumns(header: string[]): Record<string, number> {
  return Object.fromEntries(header.map((value, index) => [value, index]));
}

export async function fetchSolarWindPlasmaSnapshot(): Promise<SpaceWeatherSolarWindPlasmaSnapshot> {
  return withCache(
    CACHE_KEYS.SPACE_WEATHER_SOLAR_WIND_PLASMA,
    CACHE_TTL.SPACE_WEATHER_SOLAR_WIND_PLASMA,
    async () => {
      const table = await fetchJsonTable(PLASMA_URL);
      const { header, rows } = parseTableRows(table);
      const columns = indexColumns(header);

      const trend = rows
        .map((row): SpaceWeatherSolarWindPoint | null => {
          const observedAt = toIsoOrNull(String(row[columns.time_tag] ?? ""));
          if (!observedAt) return null;

          return {
            observedAt,
            densityPerCc: parseNumberOrNull(row[columns.density]),
            speedKms: parseNumberOrNull(row[columns.speed]),
            temperatureK: parseNumberOrNull(row[columns.temperature]),
          };
        })
        .filter((point): point is SpaceWeatherSolarWindPoint => point !== null);

      const currentValue = trend.at(-1) ?? null;

      return {
        currentValue,
        trend,
        source: buildSourceMeta(
          "NOAA SWPC Real-Time Solar Wind Plasma",
          REALTIME_SOLAR_WIND_PRODUCT_URL,
          currentValue?.observedAt ?? null,
          "realtime",
        ),
      };
    },
  );
}

export async function fetchSolarWindImfSnapshot(): Promise<SpaceWeatherSolarWindImfSnapshot> {
  return withCache(
    CACHE_KEYS.SPACE_WEATHER_SOLAR_WIND_IMF,
    CACHE_TTL.SPACE_WEATHER_SOLAR_WIND_IMF,
    async () => {
      const table = await fetchJsonTable(IMF_URL);
      const { header, rows } = parseTableRows(table);
      const columns = indexColumns(header);

      const trend = rows
        .map((row): SpaceWeatherSolarWindImfPoint | null => {
          const observedAt = toIsoOrNull(String(row[columns.time_tag] ?? ""));
          if (!observedAt) return null;

          return {
            observedAt,
            bxNt: parseNumberOrNull(row[columns.bx_gsm]),
            byNt: parseNumberOrNull(row[columns.by_gsm]),
            bzNt: parseNumberOrNull(row[columns.bz_gsm]),
            btNt: parseNumberOrNull(row[columns.bt]),
            lonGsmDeg: parseNumberOrNull(row[columns.lon_gsm]),
            latGsmDeg: parseNumberOrNull(row[columns.lat_gsm]),
          };
        })
        .filter((point): point is SpaceWeatherSolarWindImfPoint => point !== null);

      const currentValue = trend.at(-1) ?? null;

      return {
        currentValue,
        trend,
        source: buildSourceMeta(
          "NOAA SWPC Real-Time IMF",
          REALTIME_SOLAR_WIND_PRODUCT_URL,
          currentValue?.observedAt ?? null,
          "realtime",
        ),
      };
    },
  );
}

export async function fetchPropagatedSolarWindSnapshot(): Promise<SpaceWeatherSolarWindPropagatedSnapshot> {
  return withCache(
    CACHE_KEYS.SPACE_WEATHER_SOLAR_WIND_PROPAGATED,
    CACHE_TTL.SPACE_WEATHER_SOLAR_WIND_PROPAGATED,
    async () => {
      const table = await fetchJsonTable(PROPAGATED_URL);
      const { header, rows } = parseTableRows(table);
      const columns = indexColumns(header);

      const trend = rows
        .map((row): SpaceWeatherSolarWindPropagatedPoint | null => {
          const observedAt = toIsoOrNull(String(row[columns.time_tag] ?? ""));
          if (!observedAt) return null;

          return {
            observedAt,
            propagatedAt: toIsoOrNull(String(row[columns.propagated_time_tag] ?? "")),
            speedKms: parseNumberOrNull(row[columns.speed]),
            densityPerCc: parseNumberOrNull(row[columns.density]),
            temperatureK: parseNumberOrNull(row[columns.temperature]),
            bxNt: parseNumberOrNull(row[columns.bx]),
            byNt: parseNumberOrNull(row[columns.by]),
            bzNt: parseNumberOrNull(row[columns.bz]),
            btNt: parseNumberOrNull(row[columns.bt]),
          };
        })
        .filter((point): point is SpaceWeatherSolarWindPropagatedPoint => point !== null);

      const currentValue = trend.at(-1) ?? null;

      return {
        currentValue,
        trend,
        source: buildSourceMeta(
          "NOAA SWPC Propagated Solar Wind",
          PROPAGATED_URL,
          currentValue?.observedAt ?? null,
          "operational",
        ),
      };
    },
  );
}

function deriveInterpretation(
  speedKms: number | null,
  bzNt: number | null,
  btNt: number | null,
): SpaceWeatherSolarWindInterpretation {
  if (speedKms === null || bzNt === null) {
    return {
      bzState: "unknown",
      couplingRisk: "unknown",
      summary: "Latest IMF orientation or solar wind speed data is unavailable right now.",
    };
  }

  const bzState =
    bzNt <= -5 ? "southward" :
    bzNt >= 5 ? "northward" :
    "mixed";

  if (bzNt <= -10 && speedKms >= 500) {
    return {
      bzState,
      couplingRisk: "storm-favorable",
      summary: "Strongly southward IMF and elevated solar wind speed support stronger geomagnetic coupling.",
    };
  }

  if (bzNt <= -5 || speedKms >= 550) {
    return {
      bzState,
      couplingRisk: "elevated",
      summary: "Southward IMF or elevated solar wind speed is increasing geomagnetic coupling potential.",
    };
  }

  if (bzNt < 0 || (btNt ?? 0) >= 8) {
    return {
      bzState,
      couplingRisk: "watch",
      summary: "IMF conditions are mixed, so it is worth watching for stronger geomagnetic coupling.",
    };
  }

  return {
    bzState,
    couplingRisk: "quiet",
    summary: "Northward or weak IMF orientation is limiting geomagnetic coupling right now.",
  };
}

export async function buildSpaceWeatherSolarWindSnapshot(): Promise<SpaceWeatherSolarWindPageSnapshot> {
  const generatedAt = new Date().toISOString();
  const [plasmaResult, imfResult, propagatedResult] = await Promise.allSettled([
    fetchSolarWindPlasmaSnapshot(),
    fetchSolarWindImfSnapshot(),
    fetchPropagatedSolarWindSnapshot(),
  ]);

  const plasma = plasmaResult.status === "fulfilled" ? plasmaResult.value : null;
  const imf = imfResult.status === "fulfilled" ? imfResult.value : null;
  const propagated = propagatedResult.status === "fulfilled" ? propagatedResult.value : null;

  const current = {
    speedKms: plasma?.currentValue?.speedKms ?? null,
    densityPerCc: plasma?.currentValue?.densityPerCc ?? null,
    temperatureK: plasma?.currentValue?.temperatureK ?? null,
    btNt: imf?.currentValue?.btNt ?? null,
    bzNt: imf?.currentValue?.bzNt ?? null,
  };

  const interpretation = deriveInterpretation(current.speedKms, current.bzNt, current.btNt);

  const warnings = uniqueWarnings([
    ...(plasmaResult.status === "fulfilled" ? plasmaResult.value.warnings ?? [] : [
      formatErrorMessage("Solar wind plasma is temporarily unavailable", plasmaResult.reason),
    ]),
    ...(imfResult.status === "fulfilled" ? imfResult.value.warnings ?? [] : [
      formatErrorMessage("IMF data is temporarily unavailable", imfResult.reason),
    ]),
    ...(propagatedResult.status === "fulfilled" ? propagatedResult.value.warnings ?? [] : [
      formatErrorMessage("Propagated solar wind is temporarily unavailable", propagatedResult.reason),
    ]),
  ]);

  const snapshot: SpaceWeatherSolarWindSnapshot | null =
    plasma || imf
      ? {
          current,
          plasma,
          imf,
          propagated,
          interpretation,
          warnings,
        }
      : null;

  return {
    generatedAt,
    snapshot,
    warnings,
  };
}
