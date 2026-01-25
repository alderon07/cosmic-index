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

// Build ADQL query for browsing exoplanets
function buildBrowseQuery(params: ExoplanetQueryParams): string {
  const conditions: string[] = ["default_flag = 1"];

  if (params.query) {
    // Escape single quotes in the search query
    const safeQuery = params.query.replace(/'/g, "''");
    conditions.push(`pl_name LIKE '%${safeQuery}%'`);
  }

  if (params.discoveryMethod) {
    const safeMethod = params.discoveryMethod.replace(/'/g, "''");
    conditions.push(`discoverymethod = '${safeMethod}'`);
  }

  if (params.yearFrom !== undefined) {
    conditions.push(`disc_year >= ${params.yearFrom}`);
  }

  if (params.yearTo !== undefined) {
    conditions.push(`disc_year <= ${params.yearTo}`);
  }

  if (params.hasRadius) {
    conditions.push("pl_rade IS NOT NULL");
  }

  if (params.hasMass) {
    conditions.push("pl_masse IS NOT NULL");
  }

  const whereClause = conditions.join(" AND ");
  const offset = ((params.page || 1) - 1) * (params.limit || 20);

  return `
    SELECT pl_name, hostname, discoverymethod, disc_year,
           pl_orbper, pl_rade, pl_masse, sy_dist, pl_eqt
    FROM ps
    WHERE ${whereClause}
    ORDER BY disc_year DESC
    LIMIT ${params.limit || 20} OFFSET ${offset}
  `.trim();
}

// Build ADQL query for counting total results
function buildCountQuery(params: ExoplanetQueryParams): string {
  const conditions: string[] = ["default_flag = 1"];

  if (params.query) {
    const safeQuery = params.query.replace(/'/g, "''");
    conditions.push(`pl_name LIKE '%${safeQuery}%'`);
  }

  if (params.discoveryMethod) {
    const safeMethod = params.discoveryMethod.replace(/'/g, "''");
    conditions.push(`discoverymethod = '${safeMethod}'`);
  }

  if (params.yearFrom !== undefined) {
    conditions.push(`disc_year >= ${params.yearFrom}`);
  }

  if (params.yearTo !== undefined) {
    conditions.push(`disc_year <= ${params.yearTo}`);
  }

  if (params.hasRadius) {
    conditions.push("pl_rade IS NOT NULL");
  }

  if (params.hasMass) {
    conditions.push("pl_masse IS NOT NULL");
  }

  const whereClause = conditions.join(" AND ");

  return `
    SELECT COUNT(*) as total
    FROM ps
    WHERE ${whereClause}
  `.trim();
}

// Build ADQL query for detail
function buildDetailQuery(name: string): string {
  const safeName = name.replace(/'/g, "''");
  return `
    SELECT *
    FROM ps
    WHERE pl_name = '${safeName}' AND default_flag = 1
  `.trim();
}

// Execute TAP query against NASA API
async function executeTAPQuery(query: string): Promise<unknown[]> {
  const url = new URL(BASE_URL);
  url.searchParams.set("query", query);
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`NASA API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
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

  // Generate summary
  let summary = `${raw.pl_name} is an exoplanet`;
  if (raw.hostname) {
    summary += ` orbiting the star ${raw.hostname}`;
  }
  if (raw.disc_year) {
    summary += `, discovered in ${raw.disc_year}`;
  }
  if (raw.discoverymethod) {
    summary += ` using the ${raw.discoverymethod} method`;
  }
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
    raw: raw as Record<string, unknown>,
  };
}

// Fetch exoplanets with caching
export async function fetchExoplanets(
  params: ExoplanetQueryParams
): Promise<PaginatedResponse<ExoplanetData>> {
  const cacheKey = `${CACHE_KEYS.EXOPLANET_BROWSE}:${hashParams(params as Record<string, unknown>)}`;

  return withCache(cacheKey, CACHE_TTL.EXOPLANETS_BROWSE, async () => {
    // Execute queries in parallel
    const [dataResults, countResults] = await Promise.all([
      executeTAPQuery(buildBrowseQuery(params)),
      executeTAPQuery(buildCountQuery(params)),
    ]);

    // Parse and transform results
    const objects = dataResults
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

    const page = params.page || 1;
    const limit = params.limit || 20;

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
    const results = await executeTAPQuery(buildDetailQuery(name));

    if (results.length === 0) {
      return null;
    }

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
    // Convert slug back to approximate name for search
    const searchName = slug.replace(/-/g, " ");

    // Search for planets matching this pattern
    const query = `
      SELECT pl_name, hostname, discoverymethod, disc_year,
             pl_orbper, pl_rade, pl_masse, sy_dist, pl_eqt
      FROM ps
      WHERE LOWER(REPLACE(pl_name, ' ', '-')) = '${slug}'
         OR LOWER(pl_name) LIKE '%${searchName}%'
      AND default_flag = 1
      LIMIT 1
    `.trim();

    const results = await executeTAPQuery(query);

    if (results.length === 0) {
      return null;
    }

    const parsed = NASAExoplanetRawSchema.safeParse(results[0]);
    if (!parsed.success) {
      console.warn("Failed to parse exoplanet detail:", parsed.error);
      return null;
    }

    return transformExoplanet(parsed.data);
  });
}
