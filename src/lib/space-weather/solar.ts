import { CACHE_KEYS, CACHE_TTL, withCache } from "@/lib/cache";
import type {
  SpaceWeatherSolarDrapSnapshot,
  SpaceWeatherSolarFlareForecastDay,
  SpaceWeatherSolarFlareForecastSnapshot,
  SpaceWeatherSolarSnapshot,
  SpaceWeatherSolarSuviPanel,
  SpaceWeatherSolarSuviSnapshot,
  SpaceWeatherSourceMeta,
} from "@/lib/types";

const SWPC_SITE_BASE_URL = "https://www.swpc.noaa.gov";
const SWPC_SERVICES_BASE_URL = "https://services.swpc.noaa.gov";
const SOLAR_FETCH_TIMEOUT_MS = 8_000;

const SUVI_PRODUCT_URL = `${SWPC_SITE_BASE_URL}/products/goes-solar-ultraviolet-imager-suvi`;
const DRAP_PRODUCT_URL =
  `${SWPC_SITE_BASE_URL}/products/d-region-absorption-predictions-d-rap`;
const FLARE_FORECAST_PRODUCT_URL = `${SWPC_SITE_BASE_URL}/products/3-day-forecast`;

interface SuviPanelConfig {
  id: string;
  variant: SpaceWeatherSolarSuviPanel["variant"];
  title: string;
  description: string;
  imageUrl: string;
  altText: string;
}

interface RawSolarProbabilitiesRecord {
  date: string;
  c_class_1_day: number;
  c_class_2_day: number;
  c_class_3_day: number;
  m_class_1_day: number;
  m_class_2_day: number;
  m_class_3_day: number;
  x_class_1_day: number;
  x_class_2_day: number;
  x_class_3_day: number;
  "10mev_protons_1_day": number;
  "10mev_protons_2_day": number;
  "10mev_protons_3_day": number;
  polar_cap_absorption: string;
}

const SUVI_PANELS: readonly SuviPanelConfig[] = [
  {
    id: "suvi-131",
    variant: "131",
    title: "131A quicklook",
    description: "Tracks hot flare plasma and active-region structure.",
    imageUrl: `${SWPC_SERVICES_BASE_URL}/images/animations/suvi/secondary/131/latest.png`,
    altText: "Latest NOAA SWPC GOES SUVI 131 Angstrom quicklook image.",
  },
  {
    id: "suvi-195",
    variant: "195",
    title: "195A quicklook",
    description: "Highlights coronal loops and expanding structures around active regions.",
    imageUrl: `${SWPC_SERVICES_BASE_URL}/images/animations/suvi/secondary/195/latest.png`,
    altText: "Latest NOAA SWPC GOES SUVI 195 Angstrom quicklook image.",
  },
  {
    id: "suvi-map",
    variant: "map",
    title: "Thematic map",
    description: "SWPC thematic map view for broad solar context and morphology tracking.",
    imageUrl: `${SWPC_SERVICES_BASE_URL}/images/animations/suvi/primary/map/latest.png`,
    altText: "Latest NOAA SWPC GOES SUVI thematic map image.",
  },
] as const;

function formatErrorMessage(prefix: string, error: unknown): string {
  if (error instanceof Error && error.message) {
    return `${prefix} (${error.message}).`;
  }
  return `${prefix}.`;
}

function uniqueWarnings(warnings: Array<string | undefined>): string[] | undefined {
  const values = Array.from(new Set(warnings.filter(Boolean))) as string[];
  return values.length > 0 ? values : undefined;
}

function toIsoOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function parseDrapProductValidAt(text: string): string | null {
  const match = text.match(/# Product Valid At\s*:\s*(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}) UTC/i);
  if (!match) return null;

  return toIsoOrNull(`${match[1]}T${match[2]}:00Z`);
}

function parseHeaderValue(text: string, label: string): string | undefined {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`#\\s*${escaped}\\s*:\\s*(.*)`, "i"));
  const value = match?.[1]?.trim();
  return value ? value : undefined;
}

function sanitizeWarningValue(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const normalized = value.replace(/^#+\s*/, "").trim();
  if (!normalized) return undefined;
  if (/^(none|n\/a|na|nil|null|unknown)$/i.test(normalized)) return undefined;

  return normalized;
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

async function fetchWithTimeout(input: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SOLAR_FETCH_TIMEOUT_MS);
  const headers = new Headers(init?.headers);
  if (!headers.has("accept")) {
    headers.set("accept", "*/*");
  }

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
      headers,
    });

    if (!response.ok) {
      throw new Error(`SWPC request failed (${response.status})`);
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

async function fetchJson<T>(input: string): Promise<T> {
  const response = await fetchWithTimeout(input);
  return response.json() as Promise<T>;
}

async function fetchObservedAtFromHead(input: string): Promise<string | null> {
  const response = await fetchWithTimeout(input, { method: "HEAD" });
  return toIsoOrNull(response.headers.get("last-modified") ?? response.headers.get("date"));
}

function addDays(date: string, offset: number): string {
  const base = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return date;
  base.setUTCDate(base.getUTCDate() + offset);
  return base.toISOString().slice(0, 10);
}

function normalizeSolarProbabilities(
  record: RawSolarProbabilitiesRecord,
): SpaceWeatherSolarFlareForecastDay[] {
  const baseDate = record.date.slice(0, 10);

  return [
    {
      date: addDays(baseDate, 0),
      cClassProbability: record.c_class_1_day,
      mClassProbability: record.m_class_1_day,
      xClassProbability: record.x_class_1_day,
      protonProbability: record["10mev_protons_1_day"],
      polarCapAbsorption: record.polar_cap_absorption,
    },
    {
      date: addDays(baseDate, 1),
      cClassProbability: record.c_class_2_day,
      mClassProbability: record.m_class_2_day,
      xClassProbability: record.x_class_2_day,
      protonProbability: record["10mev_protons_2_day"],
      polarCapAbsorption: record.polar_cap_absorption,
    },
    {
      date: addDays(baseDate, 2),
      cClassProbability: record.c_class_3_day,
      mClassProbability: record.m_class_3_day,
      xClassProbability: record.x_class_3_day,
      protonProbability: record["10mev_protons_3_day"],
      polarCapAbsorption: record.polar_cap_absorption,
    },
  ];
}

export async function fetchSolarSuviSnapshot(): Promise<SpaceWeatherSolarSuviSnapshot> {
  return withCache(CACHE_KEYS.SPACE_WEATHER_SOLAR_SUVI, CACHE_TTL.SPACE_WEATHER_SOLAR_SUVI, async () => {
    const panels = await Promise.all(
      SUVI_PANELS.map(async (config): Promise<SpaceWeatherSolarSuviPanel> => {
        const observedAt = await fetchObservedAtFromHead(config.imageUrl);

        return {
          id: config.id,
          variant: config.variant,
          title: config.title,
          description: config.description,
          imageUrl: config.imageUrl,
          productUrl: SUVI_PRODUCT_URL,
          altText: config.altText,
          source: buildSourceMeta(
            "NOAA SWPC GOES SUVI",
            SUVI_PRODUCT_URL,
            observedAt,
            "quicklook",
          ),
        };
      }),
    );

    return {
      panels,
      warnings: uniqueWarnings(
        panels.map((panel) =>
          panel.source.observedAt ? undefined : `${panel.title} is missing an observed timestamp.`,
        ),
      ),
    };
  });
}

export async function fetchSolarDrapSnapshot(): Promise<SpaceWeatherSolarDrapSnapshot> {
  return withCache(CACHE_KEYS.SPACE_WEATHER_SOLAR_DRAP, CACHE_TTL.SPACE_WEATHER_SOLAR_DRAP, async () => {
    const text = await fetchText(`${SWPC_SERVICES_BASE_URL}/text/drap_global_frequencies.txt`);
    const observedAt = parseDrapProductValidAt(text);
    const estimatedRecoveryTime = parseHeaderValue(text, "Estimated Recovery Time");
    const xrayMessage = parseHeaderValue(text, "X-RAY Message");
    const xrayWarning = sanitizeWarningValue(parseHeaderValue(text, "X-RAY Warning"));
    const protonMessage = parseHeaderValue(text, "Proton Message");
    const protonWarning = sanitizeWarningValue(parseHeaderValue(text, "Proton Warning"));
    const warnings = uniqueWarnings([xrayWarning, protonWarning]);

    const summaryParts = [xrayMessage, protonMessage].filter(Boolean);

    return {
      imageUrl: `${SWPC_SERVICES_BASE_URL}/images/animations/d-rap/global/latest.png`,
      productUrl: DRAP_PRODUCT_URL,
      summary:
        summaryParts.length > 0
          ? `${summaryParts.join(" and ")}.`
          : "D-RAP status is available from NOAA SWPC.",
      estimatedRecoveryTime,
      xrayMessage,
      xrayWarning,
      protonMessage,
      protonWarning,
      source: buildSourceMeta("NOAA SWPC D-RAP", DRAP_PRODUCT_URL, observedAt, "operational"),
      warnings,
    };
  });
}

export async function fetchSolarFlareForecastSnapshot(): Promise<SpaceWeatherSolarFlareForecastSnapshot> {
  return withCache(
    CACHE_KEYS.SPACE_WEATHER_SOLAR_FLARE_FORECAST,
    CACHE_TTL.SPACE_WEATHER_SOLAR_FLARE_FORECAST,
    async () => {
      const records = await fetchJson<RawSolarProbabilitiesRecord[]>(
        `${SWPC_SERVICES_BASE_URL}/json/solar_probabilities.json`,
      );

      const latestRecord = records[0];
      if (!latestRecord) {
        throw new Error("SWPC flare forecast returned no records");
      }

      const days = normalizeSolarProbabilities(latestRecord);

      return {
        summary:
          `Next day: ${days[0].cClassProbability}% C, ${days[0].mClassProbability}% M, ` +
          `${days[0].xClassProbability}% X, ${days[0].protonProbability}% proton.`,
        days,
        source: buildSourceMeta(
          "NOAA SWPC 3-Day Forecast",
          FLARE_FORECAST_PRODUCT_URL,
          toIsoOrNull(latestRecord.date),
          "forecast",
        ),
      };
    },
  );
}

export async function buildSpaceWeatherSolarSnapshot(): Promise<SpaceWeatherSolarSnapshot> {
  const generatedAt = new Date().toISOString();

  const [suviResult, drapResult, flareForecastResult] = await Promise.allSettled([
    fetchSolarSuviSnapshot(),
    fetchSolarDrapSnapshot(),
    fetchSolarFlareForecastSnapshot(),
  ]);

  return {
    generatedAt,
    suvi: suviResult.status === "fulfilled" ? suviResult.value : null,
    drap: drapResult.status === "fulfilled" ? drapResult.value : null,
    flareForecast: flareForecastResult.status === "fulfilled" ? flareForecastResult.value : null,
    warnings: uniqueWarnings([
      ...(suviResult.status === "fulfilled" ? suviResult.value.warnings ?? [] : [
        formatErrorMessage("SWPC SUVI imagery is temporarily unavailable", suviResult.reason),
      ]),
      ...(drapResult.status === "fulfilled" ? drapResult.value.warnings ?? [] : [
        formatErrorMessage("SWPC D-RAP is temporarily unavailable", drapResult.reason),
      ]),
      ...(flareForecastResult.status === "fulfilled" ? flareForecastResult.value.warnings ?? [] : [
        formatErrorMessage("SWPC flare forecast is temporarily unavailable", flareForecastResult.reason),
      ]),
    ]),
  };
}
