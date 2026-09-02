import { getExoplanetBySlug, getExoplanetsForHostStar } from "@/lib/exoplanet-index";
import { fetchExoplanetBySlug } from "@/lib/nasa-exoplanet";
import { getStarByHostname } from "@/lib/star-index";
import type { ExoplanetData, StarData } from "@/lib/types";

type ExoplanetDetailSource = "index";
type ExoplanetSystemContextSource = "host-star" | "system-planets";

export interface ExoplanetDetailSources {
  getIndexedExoplanet: (id: string) => Promise<ExoplanetData | null>;
  fetchUpstreamExoplanet: (id: string) => Promise<ExoplanetData | null>;
  reportFailure?: (source: ExoplanetDetailSource, error: unknown) => void;
}

export interface ExoplanetSystemContextSources {
  getHostStar: (hostname: string) => Promise<StarData | null>;
  getSystemPlanets: (hostname: string) => Promise<ExoplanetData[]>;
  reportFailure?: (
    source: ExoplanetSystemContextSource,
    error: unknown,
  ) => void;
}

export interface ExoplanetSystemContextData {
  hostStar: StarData | null;
  systemPlanets: ExoplanetData[];
}

function reportDegradedSource(source: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[exoplanet-detail] ${source} unavailable; using fallback.`, message);
}

const defaultDetailSources: ExoplanetDetailSources = {
  getIndexedExoplanet: getExoplanetBySlug,
  fetchUpstreamExoplanet: fetchExoplanetBySlug,
};

const defaultSystemContextSources: ExoplanetSystemContextSources = {
  getHostStar: getStarByHostname,
  getSystemPlanets: getExoplanetsForHostStar,
};

export async function loadExoplanetDetail(
  id: string,
  sources: ExoplanetDetailSources = defaultDetailSources,
): Promise<ExoplanetData | null> {
  try {
    const indexedExoplanet = await sources.getIndexedExoplanet(id);
    if (indexedExoplanet) return indexedExoplanet;
  } catch (error) {
    (sources.reportFailure ?? reportDegradedSource)("index", error);
  }

  return sources.fetchUpstreamExoplanet(id);
}

export async function loadExoplanetSystemContext(
  hostname: string,
  sources: ExoplanetSystemContextSources = defaultSystemContextSources,
): Promise<ExoplanetSystemContextData> {
  const [hostStarResult, systemPlanetsResult] = await Promise.allSettled([
    sources.getHostStar(hostname),
    sources.getSystemPlanets(hostname),
  ]);

  if (hostStarResult.status === "rejected") {
    (sources.reportFailure ?? reportDegradedSource)(
      "host-star",
      hostStarResult.reason,
    );
  }
  if (systemPlanetsResult.status === "rejected") {
    (sources.reportFailure ?? reportDegradedSource)(
      "system-planets",
      systemPlanetsResult.reason,
    );
  }

  return {
    hostStar:
      hostStarResult.status === "fulfilled" ? hostStarResult.value : null,
    systemPlanets:
      systemPlanetsResult.status === "fulfilled"
        ? systemPlanetsResult.value
        : [],
  };
}
