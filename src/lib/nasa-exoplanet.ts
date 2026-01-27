import {
  ExoplanetData,
  ExoplanetQueryParams,
  PaginatedResponse,
  NASAExoplanetRawSchema,
  createSlug,
  decodeSlug,
  formatNumber,
  KeyFact,
} from "./types";
import { withCache, CACHE_TTL, CACHE_KEYS, hashParams } from "./cache";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./constants";
import { z } from "zod";

const BASE_URL = "https://exoplanetarchive.ipac.caltech.edu/TAP/sync";

// Escape single quotes for ADQL strings (doubles them)
function escapeAdqlString(input: string): string {
  return input.replace(/'/g, "''");
}

// Sanitize input for LIKE queries - escape quotes and strip wildcards
// Stripping wildcards is simpler than escaping (users rarely need literal % or _)
function sanitizeForLike(input: string): string {
  return input
    .replace(/'/g, "''") // Escape quotes
    .replace(/[%_]/g, ""); // Strip wildcards entirely
}

// ---- Pagination guardrails (the "fix") ----
// TAP sync doesn't give you a true OFFSET. The old approach fetched (offset+limit)
// which becomes insane for deep pages in prod.
//
// This makes pagination predictable:
// 1) Clamp page to a sane max
// 2) Refuse deep offsets unless the user narrows filters (query/method/year/etc)
const MAX_PAGE = 500; // pick your poison
const MAX_OFFSET = 10_000; // hard cap on offset-based paging

function clampPagination(params: ExoplanetQueryParams): {
  page: number;
  limit: number;
  offset: number;
} {
  const limit = Math.max(1, Math.min(params.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE));
  const page = Math.max(1, Math.min(params.page ?? 1, MAX_PAGE));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function hasAnyNarrowingFilter(params: ExoplanetQueryParams): boolean {
  return Boolean(
    params.query ||
      params.discoveryMethod ||
      params.year !== undefined ||
      params.hasRadius ||
      params.hasMass ||
      params.sizeCategory ||
      params.habitable ||
      params.facility ||
      params.multiPlanet
  );
}

// Build ADQL query for browsing exoplanets
// Exported for testing
export function buildBrowseQuery(
  params: ExoplanetQueryParams
): { query: string; limit: number; offset: number; page: number } {
  const conditions: string[] = ["default_flag=1"];

  const { page, limit, offset } = clampPagination(params);

  if (params.query) {
    const safeQuery = sanitizeForLike(params.query).toLowerCase();
    conditions.push(`lower(pl_name) like '%${safeQuery}%'`);
  }

  if (params.discoveryMethod) {
    const safeMethod = escapeAdqlString(params.discoveryMethod);
    conditions.push(`discoverymethod='${safeMethod}'`);
  }

  if (params.year !== undefined) {
    conditions.push(`disc_year=${params.year}`);
  }

  if (params.hasRadius) {
    conditions.push("pl_rade is not null");
  }

  if (params.hasMass) {
    conditions.push("pl_masse is not null");
  }

  // Size category filter (Earth radii ranges)
  if (params.sizeCategory) {
    switch (params.sizeCategory) {
      case "earth":
        conditions.push("pl_rade >= 0.5 and pl_rade <= 1.5");
        break;
      case "super-earth":
        conditions.push("pl_rade > 1.5 and pl_rade <= 2.5");
        break;
      case "neptune":
        conditions.push("pl_rade > 2.5 and pl_rade <= 10");
        break;
      case "jupiter":
        conditions.push("pl_rade > 10");
        break;
    }
  }

  // Potentially habitable (equilibrium temperature range)
  if (params.habitable) {
    conditions.push("pl_eqt >= 200 and pl_eqt <= 350");
  }

  // Discovery facility filter
  if (params.facility) {
    const safeFacility = escapeAdqlString(params.facility);
    conditions.push(`disc_facility='${safeFacility}'`);
  }

  // Multi-planet system filter
  if (params.multiPlanet) {
    conditions.push("sy_pnum > 1");
  }

  const whereClause = conditions.join(" and ");

  return {
    // Important: stable secondary sort so paging is deterministic
    query:
      `select pl_name,hostname,discoverymethod,disc_year,disc_facility,pl_orbper,pl_rade,pl_masse,sy_dist,pl_eqt,sy_snum,sy_pnum,st_spectype,st_teff,st_mass,st_rad,st_lum,ra,dec ` +
      `from ps where ${whereClause} ` +
      `order by disc_year desc, pl_name asc`,
    limit,
    offset,
    page,
  };
}

// Build ADQL query for counting total results
function buildCountQuery(params: ExoplanetQueryParams): string {
  const conditions: string[] = ["default_flag=1"];

  if (params.query) {
    const safeQuery = sanitizeForLike(params.query).toLowerCase();
    conditions.push(`lower(pl_name) like '%${safeQuery}%'`);
  }

  if (params.discoveryMethod) {
    const safeMethod = escapeAdqlString(params.discoveryMethod);
    conditions.push(`discoverymethod='${safeMethod}'`);
  }

  if (params.year !== undefined) {
    conditions.push(`disc_year=${params.year}`);
  }

  if (params.hasRadius) {
    conditions.push("pl_rade is not null");
  }

  if (params.hasMass) {
    conditions.push("pl_masse is not null");
  }

  // Size category filter (Earth radii ranges)
  if (params.sizeCategory) {
    switch (params.sizeCategory) {
      case "earth":
        conditions.push("pl_rade >= 0.5 and pl_rade <= 1.5");
        break;
      case "super-earth":
        conditions.push("pl_rade > 1.5 and pl_rade <= 2.5");
        break;
      case "neptune":
        conditions.push("pl_rade > 2.5 and pl_rade <= 10");
        break;
      case "jupiter":
        conditions.push("pl_rade > 10");
        break;
    }
  }

  // Potentially habitable (equilibrium temperature range)
  if (params.habitable) {
    conditions.push("pl_eqt >= 200 and pl_eqt <= 350");
  }

  // Discovery facility filter
  if (params.facility) {
    const safeFacility = escapeAdqlString(params.facility);
    conditions.push(`disc_facility='${safeFacility}'`);
  }

  // Multi-planet system filter
  if (params.multiPlanet) {
    conditions.push("sy_pnum > 1");
  }

  const whereClause = conditions.join(" and ");
  return `select count(*) as total from ps where ${whereClause}`;
}

// Build ADQL query for detail
function buildDetailQuery(name: string): string {
  const safeName = escapeAdqlString(name);
  return (
    `select pl_name,hostname,discoverymethod,disc_year,disc_facility,pl_orbper,pl_rade,pl_masse,sy_dist,pl_eqt,sy_snum,sy_pnum,st_spectype,st_teff,st_mass,st_rad,st_lum,ra,dec ` +
    `from ps where pl_name='${safeName}' and default_flag=1`
  );
}

// Execute TAP query against NASA Exoplanet Archive (TAP sync) using TAP-standard params.
// Using POST avoids prod/dev encoding differences and URL length limits.
// Adds timeout + retry to prevent flaky prod timeouts.
async function executeTAPQuery(
  query: string,
  options?: { maxrec?: number }
): Promise<unknown[]> {
  const makeBody = () => {
    const body = new URLSearchParams({
      REQUEST: "doQuery",
      LANG: "ADQL",
      FORMAT: "json",
      QUERY: query,
    });
    if (options?.maxrec !== undefined) body.set("MAXREC", String(options.maxrec));
    return body;
  };

  const MAX_ATTEMPTS = 3;
  const TIMEOUT_MS = 12_000;
  const BASE_DELAY_MS = 400;

  let lastErr: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          "User-Agent": "cosmic-index/1.0",
        },
        body: makeBody(),
        cache: "no-store",
        signal: controller.signal,
      });

      const text = await response.text().catch(() => "");

      if (!response.ok) {
        const err = new Error(
          `NASA TAP error: ${response.status} ${response.statusText}\nQuery: ${query}\nBody: ${text.slice(
            0,
            1200
          )}`
        );
        // Retry only on 5xx
        if (response.status >= 500 && attempt < MAX_ATTEMPTS) throw err;
        throw err;
      }

      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`NASA TAP returned non-JSON.\nBody: ${text.slice(0, 1200)}`);
      }

      if (!Array.isArray(data)) {
        throw new Error(`NASA TAP unexpected response shape.\nBody: ${text.slice(0, 1200)}`);
      }

      return data as unknown[];
    } catch (err: unknown) {
      lastErr = err;
      const errObj = err as { cause?: { code?: string }; code?: string; name?: string; message?: string };
      const code = errObj?.cause?.code ?? errObj?.code;
      const isAbort = errObj?.name === "AbortError";
      const isConnectTimeout = code === "UND_ERR_CONNECT_TIMEOUT";

      const shouldRetry =
        attempt < MAX_ATTEMPTS &&
        (isAbort || isConnectTimeout || typeof code === "string" || /fetch failed/i.test(errObj?.message ?? ""));

      if (!shouldRetry) {
        throw new Error(
          `NASA TAP connection failed.\nAttempt ${attempt}/${MAX_ATTEMPTS}\n` +
            `Error: ${errObj?.message ?? String(err)}\n` +
            (code ? `Code: ${code}\n` : "")
        );
      }

      // backoff + jitter
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 150);
      await new Promise((r) => setTimeout(r, delay));
    } finally {
      clearTimeout(timeout);
    }
  }

  const lastErrObj = lastErr as { message?: string } | undefined;
  throw new Error(
    `NASA TAP failed after retries.\nError: ${String(lastErrObj?.message ?? lastErr)}`
  );
}

// Estimate mass from radius using Chen & Kipping (2017) mass-radius relationship.
// Returns mass in Earth masses, or undefined if radius is not available.
function estimateMassFromRadius(radiusEarth: number): number {
  if (radiusEarth < 1.23) {
    // Terran regime: R = 1.008 * M^0.279 → M = (R / 1.008)^(1/0.279)
    return Math.pow(radiusEarth / 1.008, 1 / 0.279);
  }
  // Neptunian regime: R = 0.7790 * M^0.589 → M = (R / 0.7790)^(1/0.589)
  return Math.pow(radiusEarth / 0.7790, 1 / 0.589);
}

// Transform raw NASA data to ExoplanetData
function transformExoplanet(raw: z.infer<typeof NASAExoplanetRawSchema>): ExoplanetData {
  const keyFacts: KeyFact[] = [];

  if (raw.pl_rade !== null) {
    keyFacts.push({
      label: "Radius",
      value: formatNumber(raw.pl_rade),
      unit: "Earth radii",
    });
  }
  const hasMeasuredMass = raw.pl_masse !== null;
  const massIsEstimated = !hasMeasuredMass && raw.pl_rade !== null;
  const massEarth = hasMeasuredMass
    ? raw.pl_masse!
    : massIsEstimated
    ? estimateMassFromRadius(raw.pl_rade!)
    : undefined;

  if (massEarth !== undefined) {
    keyFacts.push({
      label: massIsEstimated ? "Mass (est.)" : "Mass",
      value: formatNumber(massEarth),
      unit: "Earth masses",
    });
  }
  if (raw.pl_orbper !== null) {
    keyFacts.push({
      label: "Orbital Period",
      value: formatNumber(raw.pl_orbper, 1),
      unit: "days",
    });
  }
  if (raw.sy_dist !== null) {
    keyFacts.push({
      label: "Distance",
      value: formatNumber(raw.sy_dist, 1),
      unit: "parsecs",
    });
  }
  if (raw.pl_eqt !== null) {
    keyFacts.push({
      label: "Equilibrium Temp",
      value: formatNumber(raw.pl_eqt, 0),
      unit: "K",
    });
  }

  let summary = `${raw.pl_name} is an exoplanet`;
  if (raw.hostname) summary += ` orbiting the star ${raw.hostname}`;
  if (raw.disc_year) summary += `, discovered in ${raw.disc_year}`;
  if (raw.discoverymethod) summary += ` using the ${raw.discoverymethod} method`;
  summary += ".";

  if (raw.pl_rade !== null) {
    const sizeDesc =
      raw.pl_rade < 1.5
        ? "Earth-sized"
        : raw.pl_rade < 2.5
        ? "Super-Earth"
        : raw.pl_rade < 4
        ? "Mini-Neptune"
        : raw.pl_rade < 10
        ? "Neptune-sized"
        : "Jupiter-sized";
    summary += ` It is a ${sizeDesc} world.`;
  }

  return {
    id: createSlug(raw.pl_name),
    type: "EXOPLANET",
    displayName: raw.pl_name,
    aliases: [],
    source: "NASA_EXOPLANET_ARCHIVE",
    sourceId: raw.pl_name,
    summary,
    keyFacts,
    links: [
      {
        label: "NASA Exoplanet Archive",
        url: `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(raw.pl_name)}`,
      },
    ],
    discoveredYear: raw.disc_year ?? undefined,
    hostStar: raw.hostname || "Unknown",
    discoveryMethod: raw.discoverymethod || "Unknown",
    discoveryFacility: raw.disc_facility ?? undefined,
    orbitalPeriodDays: raw.pl_orbper ?? undefined,
    radiusEarth: raw.pl_rade ?? undefined,
    massEarth: massEarth,
    massIsEstimated: massIsEstimated || undefined,
    distanceParsecs: raw.sy_dist ?? undefined,
    equilibriumTempK: raw.pl_eqt ?? undefined,
    // Host star properties
    starsInSystem: raw.sy_snum ?? undefined,
    planetsInSystem: raw.sy_pnum ?? undefined,
    spectralType: raw.st_spectype ?? undefined,
    starTempK: raw.st_teff ?? undefined,
    starMassSolar: raw.st_mass ?? undefined,
    starRadiusSolar: raw.st_rad ?? undefined,
    starLuminosity: raw.st_lum ?? undefined,
    // Coordinates
    ra: raw.ra ?? undefined,
    dec: raw.dec ?? undefined,
    raw: raw as Record<string, unknown>,
  };
}

// Fetch exoplanets with caching
export async function fetchExoplanets(
  params: ExoplanetQueryParams
): Promise<PaginatedResponse<ExoplanetData>> {
  const cacheKey = `${CACHE_KEYS.EXOPLANET_BROWSE}:${hashParams(params as Record<string, unknown>)}`;

  return withCache(cacheKey, CACHE_TTL.EXOPLANETS_BROWSE, async () => {
    const browseParams = buildBrowseQuery(params);

    // Pagination fix: refuse deep offsets unless narrowed.
    if (browseParams.offset > MAX_OFFSET && !hasAnyNarrowingFilter(params)) {
      throw new Error(
        `Pagination too deep (page ${browseParams.page}, limit ${browseParams.limit}). Add a search or filters (year/method/etc) to narrow results.`
      );
    }

    // TAP sync doesn’t support true OFFSET. We fetch enough rows to cover (offset+limit),
    // but only up to MAX_OFFSET + limit, keeping it bounded and predictable.
    const boundedMaxrec = Math.min(
      browseParams.offset + browseParams.limit,
      MAX_OFFSET + browseParams.limit
    );

    const [dataResults, countResults] = await Promise.all([
      executeTAPQuery(browseParams.query, { maxrec: boundedMaxrec }),
      executeTAPQuery(buildCountQuery(params), { maxrec: 1 }),
    ]);

    // Slice results to handle pagination (skip offset records)
    const slicedResults = dataResults.slice(
      browseParams.offset,
      browseParams.offset + browseParams.limit
    );

    const objects = slicedResults
      .map((row) => {
        const parsed = NASAExoplanetRawSchema.safeParse(row);
        if (!parsed.success) {
          console.warn("Failed to parse exoplanet row:", parsed.error);
          return null;
        }
        return transformExoplanet(parsed.data);
      })
      .filter((obj): obj is ExoplanetData => obj !== null);

    const totalRow = countResults[0] as { total?: number | string } | undefined;
    const total =
      typeof totalRow?.total === "number"
        ? totalRow.total
        : typeof totalRow?.total === "string"
        ? parseInt(totalRow.total, 10)
        : objects.length;

    const page = browseParams.page;
    const limit = browseParams.limit;

    return {
      objects,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    };
  });
}

// Fetch single exoplanet by name
export async function fetchExoplanetByName(name: string): Promise<ExoplanetData | null> {
  const cacheKey = `${CACHE_KEYS.EXOPLANET_DETAIL}:${createSlug(name)}`;

  return withCache(cacheKey, CACHE_TTL.EXOPLANETS_DETAIL, async () => {
    const results = await executeTAPQuery(buildDetailQuery(name), { maxrec: 1 });

    if (results.length === 0) return null;

    const parsed = NASAExoplanetRawSchema.safeParse(results[0]);
    if (!parsed.success) {
      console.warn("Failed to parse exoplanet detail:", parsed.error);
      return null;
    }

    return transformExoplanet(parsed.data);
  });
}

// Fetch exoplanet by slug (URL-encoded name)
// decodeSlug() recovers the original name exactly, then we do a direct lookup
export async function fetchExoplanetBySlug(slug: string): Promise<ExoplanetData | null> {
  const name = decodeSlug(slug);
  const cacheKey = `${CACHE_KEYS.EXOPLANET_DETAIL}:${createSlug(name)}`;

  return withCache(cacheKey, CACHE_TTL.EXOPLANETS_DETAIL, async () => {
    const query =
      `select pl_name,hostname,discoverymethod,disc_year,disc_facility,pl_orbper,pl_rade,pl_masse,sy_dist,pl_eqt,sy_snum,sy_pnum,st_spectype,st_teff,st_mass,st_rad,st_lum,ra,dec ` +
      `from ps where lower(pl_name)=lower('${escapeAdqlString(name)}') and default_flag=1`;
    const results = await executeTAPQuery(query, { maxrec: 1 });

    if (results.length === 0) return null;

    const parsed = NASAExoplanetRawSchema.safeParse(results[0]);
    if (!parsed.success) {
      console.warn("Failed to parse exoplanet detail:", parsed.error);
      return null;
    }

    return transformExoplanet(parsed.data);
  });
}
