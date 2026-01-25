import {
  ExoplanetData,
  ExoplanetQueryParams,
  PaginatedResponse,
  NASAExoplanetRawSchema,
  createSlug,
  formatNumber,
  KeyFact,
} from "./types";
import { withCache, CACHE_TTL, CACHE_KEYS, hashParams } from "./cache";
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
// TAP sync doesn’t give you a true OFFSET. Your previous approach fetched (offset+limit)
// which becomes insane for deep pages in prod.
//
// This “fix” makes pagination predictable:
// 1) Clamp page to a sane max
// 2) Refuse deep offsets unless the user narrows filters (query/method/year/etc)
const MAX_PAGE = 500;            // pick your poison
const MAX_OFFSET = 10_000;       // hard cap on offset-based paging
const DEFAULT_LIMIT = 20;

function clampPagination(params: ExoplanetQueryParams): { page: number; limit: number; offset: number } {
  const limit = Math.max(1, Math.min(params.limit ?? DEFAULT_LIMIT, 100));
  const page = Math.max(1, Math.min(params.page ?? 1, MAX_PAGE));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function hasAnyNarrowingFilter(params: ExoplanetQueryParams): boolean {
  return Boolean(
    params.query ||
      params.discoveryMethod ||
      params.yearFrom !== undefined ||
      params.yearTo !== undefined ||
      params.hasRadius ||
      params.hasMass
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
    const safeQuery = sanitizeForLike(params.query);
    conditions.push(`pl_name like '%${safeQuery}%'`);
  }

  if (params.discoveryMethod) {
    const safeMethod = escapeAdqlString(params.discoveryMethod);
    conditions.push(`discoverymethod='${safeMethod}'`);
  }

  if (params.yearFrom !== undefined) {
    conditions.push(`disc_year>=${params.yearFrom}`);
  }

  if (params.yearTo !== undefined) {
    conditions.push(`disc_year<=${params.yearTo}`);
  }

  if (params.hasRadius) {
    conditions.push("pl_rade is not null");
  }

  if (params.hasMass) {
    conditions.push("pl_masse is not null");
  }

  const whereClause = conditions.join(" and ");

  return {
    // Important: add a stable secondary sort so paging is deterministic
    query:
      `select pl_name,hostname,discoverymethod,disc_year,pl_orbper,pl_rade,pl_masse,sy_dist,pl_eqt,sy_snum,sy_pnum,st_spectype,st_teff,st_mass,st_rad,st_lum,ra,dec ` +
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
    const safeQuery = sanitizeForLike(params.query);
    conditions.push(`pl_name like '%${safeQuery}%'`);
  }

  if (params.discoveryMethod) {
    const safeMethod = escapeAdqlString(params.discoveryMethod);
    conditions.push(`discoverymethod='${safeMethod}'`);
  }

  if (params.yearFrom !== undefined) {
    conditions.push(`disc_year>=${params.yearFrom}`);
  }

  if (params.yearTo !== undefined) {
    conditions.push(`disc_year<=${params.yearTo}`);
  }

  if (params.hasRadius) {
    conditions.push("pl_rade is not null");
  }

  if (params.hasMass) {
    conditions.push("pl_masse is not null");
  }

  const whereClause = conditions.join(" and ");
  return `select count(*) as total from ps where ${whereClause}`;
}

// Build ADQL query for detail
function buildDetailQuery(name: string): string {
  const safeName = escapeAdqlString(name);
  return `select pl_name,hostname,discoverymethod,disc_year,pl_orbper,pl_rade,pl_masse,sy_dist,pl_eqt,sy_snum,sy_pnum,st_spectype,st_teff,st_mass,st_rad,st_lum,ra,dec from ps where pl_name='${safeName}' and default_flag=1`;
}

// Execute TAP query against NASA Exoplanet Archive (TAP sync) using TAP-standard params.
// Using POST avoids prod/dev encoding differences and URL length limits.
async function executeTAPQuery(query: string, options?: { maxrec?: number }): Promise<unknown[]> {
  const body = new URLSearchParams({
    REQUEST: "doQuery",
    LANG: "ADQL",
    FORMAT: "json",
    QUERY: query,
  });

  if (options?.maxrec !== undefined) {
    body.set("MAXREC", String(options.maxrec));
  }

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "cosmic-index/1.0",
    },
    body,
    // If you want caching later, swap this for next:{revalidate:...}
    cache: "no-store",
  });

  const text = await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(
      `NASA TAP error: ${response.status} ${response.statusText}\nQuery: ${query}\nBody: ${text.slice(0, 1200)}`
    );
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
}

// Transform raw NASA data to ExoplanetData
function transformExoplanet(raw: z.infer<typeof NASAExoplanetRawSchema>): ExoplanetData {
  const keyFacts: KeyFact[] = [];

  if (raw.pl_rade !== null) {
    keyFacts.push({ label: "Radius", value: formatNumber(raw.pl_rade), unit: "Earth radii" });
  }
  if (raw.pl_masse !== null) {
    keyFacts.push({ label: "Mass", value: formatNumber(raw.pl_masse), unit: "Earth masses" });
  }
  if (raw.pl_orbper !== null) {
    keyFacts.push({ label: "Orbital Period", value: formatNumber(raw.pl_orbper, 1), unit: "days" });
  }
  if (raw.sy_dist !== null) {
    keyFacts.push({ label: "Distance", value: formatNumber(raw.sy_dist, 1), unit: "parsecs" });
  }
  if (raw.pl_eqt !== null) {
    keyFacts.push({ label: "Equilibrium Temp", value: formatNumber(raw.pl_eqt, 0), unit: "K" });
  }

  let summary = `${raw.pl_name} is an exoplanet`;
  if (raw.hostname) summary += ` orbiting the star ${raw.hostname}`;
  if (raw.disc_year) summary += `, discovered in ${raw.disc_year}`;
  if (raw.discoverymethod) summary += ` using the ${raw.discoverymethod} method`;
  summary += ".";

  if (raw.pl_rade !== null) {
    const sizeDesc =
      raw.pl_rade < 1.5 ? "Earth-sized" :
      raw.pl_rade < 2.5 ? "Super-Earth" :
      raw.pl_rade < 4 ? "Mini-Neptune" :
      raw.pl_rade < 10 ? "Neptune-sized" : "Jupiter-sized";
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
    orbitalPeriodDays: raw.pl_orbper ?? undefined,
    radiusEarth: raw.pl_rade ?? undefined,
    massEarth: raw.pl_masse ?? undefined,
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
      // You can throw to force UI to show “refine search”, or return empty.
      // Throw is usually better so the UI can message the user.
      throw new Error(
        `Pagination too deep (page ${browseParams.page}). Add a search or filters (year/method/etc) to narrow results.`
      );
    }

    // TAP sync doesn’t support true OFFSET. We fetch enough rows to cover (offset+limit),
    // but ONLY up to MAX_OFFSET + limit, keeping it bounded and predictable.
    const boundedMaxrec = Math.min(browseParams.offset + browseParams.limit, MAX_OFFSET + browseParams.limit);

    const [dataResults, countResults] = await Promise.all([
      executeTAPQuery(browseParams.query, { maxrec: boundedMaxrec }),
      executeTAPQuery(buildCountQuery(params), { maxrec: 1 }),
    ]);

    // Slice results to handle pagination (skip offset records)
    const slicedResults = dataResults.slice(browseParams.offset, browseParams.offset + browseParams.limit);

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

    const totalRow = countResults[0] as { total?: number } | undefined;
    const total = totalRow?.total ?? objects.length;

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

// Fetch exoplanet by slug (tries to find matching name)
export async function fetchExoplanetBySlug(slug: string): Promise<ExoplanetData | null> {
  const cacheKey = `${CACHE_KEYS.EXOPLANET_DETAIL}:${slug}`;

  return withCache(cacheKey, CACHE_TTL.EXOPLANETS_DETAIL, async () => {
    const searchName = slug.replace(/-([b-z])$/i, " $1").toUpperCase();

    // Try exact match first (escape for equality comparison)
    let query =
      `select pl_name,hostname,discoverymethod,disc_year,pl_orbper,pl_rade,pl_masse,sy_dist,pl_eqt,sy_snum,sy_pnum,st_spectype,st_teff,st_mass,st_rad,st_lum,ra,dec ` +
      `from ps where lower(pl_name)=lower('${escapeAdqlString(searchName)}') and default_flag=1`;
    let results = await executeTAPQuery(query, { maxrec: 1 });

    if (results.length === 0) {
      // Try fuzzy match (sanitize for LIKE query - strips wildcards)
      const fuzzyName = sanitizeForLike(slug.replace(/-/g, " "));
      query =
        `select pl_name,hostname,discoverymethod,disc_year,pl_orbper,pl_rade,pl_masse,sy_dist,pl_eqt,sy_snum,sy_pnum,st_spectype,st_teff,st_mass,st_rad,st_lum,ra,dec ` +
        `from ps where lower(pl_name) like lower('%${fuzzyName}%') and default_flag=1`;
      results = await executeTAPQuery(query, { maxrec: 1 });
    }

    if (results.length === 0) {
      // Try with raw slug (sanitize for LIKE query)
      const safeSlug = sanitizeForLike(slug);
      query =
        `select pl_name,hostname,discoverymethod,disc_year,pl_orbper,pl_rade,pl_masse,sy_dist,pl_eqt,sy_snum,sy_pnum,st_spectype,st_teff,st_mass,st_rad,st_lum,ra,dec ` +
        `from ps where lower(pl_name) like lower('%${safeSlug}%') and default_flag=1`;
      results = await executeTAPQuery(query, { maxrec: 1 });
    }

    if (results.length === 0) return null;

    const parsed = NASAExoplanetRawSchema.safeParse(results[0]);
    if (!parsed.success) {
      console.warn("Failed to parse exoplanet detail:", parsed.error);
      return null;
    }

    return transformExoplanet(parsed.data);
  });
}
