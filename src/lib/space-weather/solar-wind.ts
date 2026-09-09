import { CACHE_KEYS, CACHE_TTL, withCache } from "@/lib/cache";
import { z } from "zod";
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
const MAX_SWPC_RESPONSE_BYTES = 6 * 1024 * 1024;
const MAX_RTSW_RECORDS = 10_000;
const SIX_HOURS_MS = 6 * 60 * 60 * 1_000;

const REALTIME_SOLAR_WIND_PRODUCT_URL = `${SWPC_SITE_BASE_URL}/products/real-time-solar-wind`;
const PLASMA_URL = `${SWPC_SERVICES_BASE_URL}/json/rtsw/rtsw_wind_1m.json`;
const IMF_URL = `${SWPC_SERVICES_BASE_URL}/json/rtsw/rtsw_mag_1m.json`;
const PROPAGATED_URL = `${SWPC_SERVICES_BASE_URL}/products/geospace/propagated-solar-wind-1-hour.json`;

type RawSwpcTable = unknown[][];

const NullableRtswNumberSchema = z.number().finite().nullable();

const RtswWindRowSchema = z.object({
  time_tag: z.string(),
  active: z.literal(true),
  source: z.string().min(1),
  proton_density: NullableRtswNumberSchema,
  proton_speed: NullableRtswNumberSchema,
  proton_temperature: NullableRtswNumberSchema,
});

const RtswMagRowSchema = z.object({
  time_tag: z.string(),
  active: z.literal(true),
  source: z.string().min(1),
  bx_gsm: NullableRtswNumberSchema,
  by_gsm: NullableRtswNumberSchema,
  bz_gsm: NullableRtswNumberSchema,
  phi_gsm: NullableRtswNumberSchema,
  theta_gsm: NullableRtswNumberSchema,
  bt: NullableRtswNumberSchema,
});

const RtswPayloadSchema = z.array(z.unknown()).max(MAX_RTSW_RECORDS);

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

async function fetchJson(input: string): Promise<unknown> {
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

    const contentLength = parseNumberOrNull(response.headers.get("content-length"));
    if (contentLength !== null && contentLength > MAX_SWPC_RESPONSE_BYTES) {
      throw new Error("SWPC response exceeded the allowed size");
    }

    if (!response.body) {
      throw new Error("SWPC response body was empty");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let totalBytes = 0;
    let jsonText = "";

    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;

      totalBytes += chunk.value.byteLength;
      if (totalBytes > MAX_SWPC_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("SWPC response exceeded the allowed size");
      }
      jsonText += decoder.decode(chunk.value, { stream: true });
    }
    jsonText += decoder.decode();

    return JSON.parse(jsonText);
  } finally {
    clearTimeout(timeoutId);
    controller.abort();
  }
}

async function fetchJsonTable(input: string): Promise<RawSwpcTable> {
  const payload = await fetchJson(input);
  if (!Array.isArray(payload)) {
    throw new Error("SWPC table was invalid");
  }
  return payload;
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

function trailingSixHours<T extends { observedAt: string }>(points: T[]): T[] {
  const chronological = [...points].sort((left, right) =>
    left.observedAt.localeCompare(right.observedAt));
  const newest = chronological.at(-1);
  if (!newest) return [];

  const cutoffMs = Date.parse(newest.observedAt) - SIX_HOURS_MS;
  return chronological.filter((point) => Date.parse(point.observedAt) >= cutoffMs);
}

function parseRtswPayload(payload: unknown): unknown[] {
  const parsed = RtswPayloadSchema.safeParse(payload);
  if (!parsed.success || parsed.data.length === 0) {
    throw new Error("SWPC real-time solar wind payload was invalid or empty");
  }
  return parsed.data;
}

export async function fetchSolarWindPlasmaSnapshot(): Promise<SpaceWeatherSolarWindPlasmaSnapshot> {
  return withCache(
    CACHE_KEYS.SPACE_WEATHER_SOLAR_WIND_PLASMA,
    CACHE_TTL.SPACE_WEATHER_SOLAR_WIND_PLASMA,
    async () => {
      const payload = parseRtswPayload(await fetchJson(PLASMA_URL));
      const points = payload
        .map((value): SpaceWeatherSolarWindPoint | null => {
          const parsed = RtswWindRowSchema.safeParse(value);
          if (!parsed.success) return null;

          const observedAt = toIsoOrNull(parsed.data.time_tag);
          if (!observedAt) return null;

          return {
            observedAt,
            densityPerCc: parsed.data.proton_density ?? null,
            speedKms: parsed.data.proton_speed ?? null,
            temperatureK: parsed.data.proton_temperature ?? null,
          };
        })
        .filter((point): point is SpaceWeatherSolarWindPoint => point !== null);
      const trend = trailingSixHours(points);

      if (trend.length === 0) {
        throw new Error("SWPC real-time solar wind payload had no valid active plasma records");
      }

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
      const payload = parseRtswPayload(await fetchJson(IMF_URL));
      const points = payload
        .map((value): SpaceWeatherSolarWindImfPoint | null => {
          const parsed = RtswMagRowSchema.safeParse(value);
          if (!parsed.success) return null;

          const observedAt = toIsoOrNull(parsed.data.time_tag);
          if (!observedAt) return null;

          return {
            observedAt,
            bxNt: parsed.data.bx_gsm ?? null,
            byNt: parsed.data.by_gsm ?? null,
            bzNt: parsed.data.bz_gsm ?? null,
            btNt: parsed.data.bt ?? null,
            lonGsmDeg: parsed.data.phi_gsm ?? null,
            latGsmDeg: parsed.data.theta_gsm ?? null,
          };
        })
        .filter((point): point is SpaceWeatherSolarWindImfPoint => point !== null);
      const trend = trailingSixHours(points);

      if (trend.length === 0) {
        throw new Error("SWPC real-time solar wind payload had no valid active IMF records");
      }

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
    plasma || imf || propagated
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
