import { createClient, Client } from "@libsql/client";
import {
  ExoplanetData,
  ExoplanetQueryParams,
  SortOrder,
  PaginatedResponse,
  createSlug,
  decodeSlug,
  KeyFact,
  formatNumber,
} from "./types";
import { DEFAULT_PAGE_SIZE } from "./constants";
import {
  CursorPayload,
  decodeCursor,
  encodeCursor,
  validateCursor,
  hashFilters,
  buildKeysetWhereClause,
  EXOPLANET_SORT_CONFIG,
  CursorValidationError,
} from "./cursor";

// Lazy singleton for Turso client
let client: Client | null = null;
let clientInitialized = false;

function getClient(): Client | null {
  if (clientInitialized) return client;
  clientInitialized = true;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    console.warn("Turso database not configured - exoplanet index disabled");
    return null;
  }

  client = createClient({
    url,
    authToken,
  });

  return client;
}

// Row type from database
interface ExoplanetRow {
  id: string;
  pl_name: string;
  pl_name_lower: string;
  hostname: string;
  discovery_method: string | null;
  disc_facility: string | null;
  disc_year: number | null;
  orbital_period_days: number | null;
  radius_earth: number | null;
  mass_earth: number | null;
  equilibrium_temp_k: number | null;
  distance_parsecs: number | null;
  stars_in_system: number | null;
  planets_in_system: number | null;
  st_spectype: string | null;
  st_teff: number | null;
  st_mass: number | null;
  st_rad: number | null;
  st_lum: number | null;
  ra_deg: number | null;
  dec_deg: number | null;
}

// Estimate mass from radius using Chen & Kipping (2017) mass-radius relationship.
function estimateMassFromRadius(radiusEarth: number): number {
  if (radiusEarth < 1.23) {
    // Terran regime: R = 1.008 * M^0.279 -> M = (R / 1.008)^(1/0.279)
    return Math.pow(radiusEarth / 1.008, 1 / 0.279);
  }
  // Neptunian regime: R = 0.7790 * M^0.589 -> M = (R / 0.7790)^(1/0.589)
  return Math.pow(radiusEarth / 0.7790, 1 / 0.589);
}

// Transform database row to ExoplanetData
function transformExoplanetRow(row: ExoplanetRow): ExoplanetData {
  const keyFacts: KeyFact[] = [];

  if (row.radius_earth !== null) {
    keyFacts.push({
      label: "Radius",
      value: formatNumber(row.radius_earth),
      unit: "Earth radii",
    });
  }

  const hasMeasuredMass = row.mass_earth !== null;
  const massIsEstimated = !hasMeasuredMass && row.radius_earth !== null;
  const massEarth = hasMeasuredMass
    ? row.mass_earth!
    : massIsEstimated
    ? estimateMassFromRadius(row.radius_earth!)
    : undefined;

  if (massEarth !== undefined) {
    keyFacts.push({
      label: massIsEstimated ? "Mass (est.)" : "Mass",
      value: formatNumber(massEarth),
      unit: "Earth masses",
    });
  }

  if (row.orbital_period_days !== null) {
    keyFacts.push({
      label: "Orbital Period",
      value: formatNumber(row.orbital_period_days, 1),
      unit: "days",
    });
  }

  if (row.distance_parsecs !== null) {
    keyFacts.push({
      label: "Distance",
      value: formatNumber(row.distance_parsecs, 1),
      unit: "parsecs",
    });
  }

  if (row.equilibrium_temp_k !== null) {
    keyFacts.push({
      label: "Equilibrium Temp",
      value: formatNumber(row.equilibrium_temp_k, 0),
      unit: "K",
    });
  }

  // Generate summary
  let summary = `${row.pl_name} is an exoplanet`;
  if (row.hostname && row.hostname !== "Unknown") {
    summary += ` orbiting the star ${row.hostname}`;
  }
  if (row.disc_year) {
    summary += `, discovered in ${row.disc_year}`;
  }
  if (row.discovery_method) {
    summary += ` using the ${row.discovery_method} method`;
  }
  summary += ".";

  if (row.radius_earth !== null) {
    const sizeDesc =
      row.radius_earth < 1.5
        ? "Earth-sized"
        : row.radius_earth < 2.5
        ? "Super-Earth"
        : row.radius_earth < 4
        ? "Mini-Neptune"
        : row.radius_earth < 10
        ? "Neptune-sized"
        : "Jupiter-sized";
    summary += ` It is a ${sizeDesc} world.`;
  }

  return {
    id: row.id,
    type: "EXOPLANET",
    displayName: row.pl_name,
    aliases: [],
    source: "NASA_EXOPLANET_ARCHIVE",
    sourceId: row.pl_name,
    summary,
    keyFacts,
    links: [
      {
        label: "NASA Exoplanet Archive",
        url: `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(row.pl_name)}`,
      },
    ],
    discoveredYear: row.disc_year ?? undefined,
    hostStar: row.hostname || "Unknown",
    discoveryMethod: row.discovery_method || "Unknown",
    discoveryFacility: row.disc_facility ?? undefined,
    orbitalPeriodDays: row.orbital_period_days ?? undefined,
    radiusEarth: row.radius_earth ?? undefined,
    massEarth: massEarth,
    massIsEstimated: massIsEstimated || undefined,
    distanceParsecs: row.distance_parsecs ?? undefined,
    equilibriumTempK: row.equilibrium_temp_k ?? undefined,
    starsInSystem: row.stars_in_system ?? undefined,
    planetsInSystem: row.planets_in_system ?? undefined,
    spectralType: row.st_spectype ?? undefined,
    starTempK: row.st_teff ?? undefined,
    starMassSolar: row.st_mass ?? undefined,
    starRadiusSolar: row.st_rad ?? undefined,
    starLuminosity: row.st_lum ?? undefined,
    ra: row.ra_deg ?? undefined,
    dec: row.dec_deg ?? undefined,
  };
}

// Build WHERE clause and parameters for exoplanet queries (non-FTS filters)
function buildWhereClause(params: ExoplanetQueryParams, excludeQuery = false): {
  clause: string;
  args: (string | number)[];
} {
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  // query is handled separately via FTS
  if (!excludeQuery && params.query) {
    conditions.push("LOWER(pl_name) LIKE ?");
    args.push(`%${params.query.toLowerCase()}%`);
  }

  if (params.discoveryMethod) {
    conditions.push("discovery_method = ?");
    args.push(params.discoveryMethod);
  }

  if (params.year !== undefined) {
    conditions.push("disc_year = ?");
    args.push(params.year);
  }

  if (params.hasRadius) {
    conditions.push("radius_earth IS NOT NULL");
  }

  if (params.hasMass) {
    conditions.push("mass_earth IS NOT NULL");
  }

  // Size category filter (Earth radii ranges)
  if (params.sizeCategory) {
    switch (params.sizeCategory) {
      case "earth":
        conditions.push("radius_earth >= 0.5 AND radius_earth <= 1.5");
        break;
      case "super-earth":
        conditions.push("radius_earth > 1.5 AND radius_earth <= 2.5");
        break;
      case "neptune":
        conditions.push("radius_earth > 2.5 AND radius_earth <= 10");
        break;
      case "jupiter":
        conditions.push("radius_earth > 10");
        break;
    }
  }

  // Potentially habitable (equilibrium temperature range)
  if (params.habitable) {
    conditions.push("equilibrium_temp_k >= 200 AND equilibrium_temp_k <= 350");
  }

  // Discovery facility filter
  if (params.facility) {
    conditions.push("disc_facility = ?");
    args.push(params.facility);
  }

  // Multi-planet system filter
  if (params.multiPlanet) {
    conditions.push("planets_in_system > 1");
  }

  // Max distance from Earth (parsecs)
  if (params.maxDistancePc !== undefined) {
    conditions.push("distance_parsecs IS NOT NULL AND distance_parsecs <= ?");
    args.push(params.maxDistancePc);
  }

  // Host star filter
  if (params.hostStar) {
    conditions.push("LOWER(hostname) = LOWER(?)");
    args.push(params.hostStar);
  }

  const clause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return { clause, args };
}

// Default sort directions for each sort option
const DEFAULT_EXOPLANET_SORT_DIRECTIONS: Record<string, SortOrder> = {
  name: "asc",
  distance: "asc",      // closest first
  radius: "desc",       // largest first
  mass: "desc",         // most massive first
  discovered: "desc",   // newest first
};

// Build ORDER BY clause for exoplanet queries
function buildOrderByClause(sort?: ExoplanetQueryParams["sort"], order?: SortOrder): string {
  const sortField = sort || "discovered";
  const direction = order || DEFAULT_EXOPLANET_SORT_DIRECTIONS[sortField] || "asc";
  const dirUpper = direction.toUpperCase();
  const nullsPosition = direction === "asc" ? "LAST" : "FIRST";

  switch (sortField) {
    case "name":
      return `ORDER BY pl_name ${dirUpper}`;
    case "distance":
      return `ORDER BY distance_parsecs ${dirUpper} NULLS ${nullsPosition}, pl_name ASC`;
    case "radius":
      return `ORDER BY radius_earth ${dirUpper} NULLS ${nullsPosition}, pl_name ASC`;
    case "mass":
      return `ORDER BY mass_earth ${dirUpper} NULLS ${nullsPosition}, pl_name ASC`;
    case "discovered":
    default:
      return `ORDER BY disc_year ${dirUpper} NULLS ${nullsPosition}, pl_name ASC`;
  }
}

// Custom error for when index is unavailable
export class ExoplanetIndexUnavailableError extends Error {
  constructor() {
    super("Exoplanet index is unavailable");
    this.name = "ExoplanetIndexUnavailableError";
  }
}

// Extended result type for cursor-aware responses
export interface ExoplanetSearchResult extends PaginatedResponse<ExoplanetData> {
  nextCursor?: string;
  usedCursor: boolean;
}

// Default sort/order
const DEFAULT_EXOPLANET_SORT = "discovered";
const DEFAULT_EXOPLANET_ORDER: SortOrder = "desc";

/** Extract the primary sort value from an ExoplanetRow for cursor minting */
function getExoplanetSortValue(row: ExoplanetRow, sort: string): string | number | null {
  switch (sort) {
    case "name": return row.pl_name;
    case "distance": return row.distance_parsecs;
    case "radius": return row.radius_earth;
    case "mass": return row.mass_earth;
    case "discovered":
    default: return row.disc_year;
  }
}

// Search exoplanets with pagination using FTS for text search
export async function searchExoplanets(
  params: ExoplanetQueryParams
): Promise<ExoplanetSearchResult> {
  const db = getClient();

  if (!db) {
    throw new ExoplanetIndexUnavailableError();
  }

  const limit = params.limit ?? DEFAULT_PAGE_SIZE;
  const effectiveSort = params.sort || DEFAULT_EXOPLANET_SORT;
  const effectiveOrder = params.order || DEFAULT_EXOPLANET_SORT_DIRECTIONS[effectiveSort] || DEFAULT_EXOPLANET_ORDER;
  const useCursor = params.paginationMode === "cursor" || params.cursor !== undefined;

  const orderBy = buildOrderByClause(params.sort, params.order);

  // FTS queries don't support cursor pagination (BM25 ranking isn't keyset-compatible)
  // Fall back to offset for FTS
  const hasFtsQuery = params.query && params.query.trim();

  // ── Cursor mode (non-FTS only) ──────────────────────────────────────────
  if (useCursor && !hasFtsQuery) {
    const filterHash = await hashFilters(params as Record<string, unknown>);
    const sortConfig = EXOPLANET_SORT_CONFIG[effectiveSort];

    let cursorPayload: CursorPayload | undefined;
    if (params.cursor) {
      const decoded = decodeCursor(params.cursor);
      if (!decoded) {
        throw new CursorValidationError("MALFORMED");
      }
      const validation = validateCursor(decoded, effectiveSort, effectiveOrder, filterHash);
      if (!validation.valid) {
        throw new CursorValidationError(validation.reason);
      }
      cursorPayload = validation.payload;
    }

    const { clause: filterClause, args: filterArgs } = buildWhereClause(params);

    // Build cursor WHERE clause
    let cursorClause = "";
    let cursorArgs: (string | number)[] = [];
    if (cursorPayload && sortConfig) {
      const keyset = buildKeysetWhereClause(cursorPayload, sortConfig, effectiveOrder);
      cursorClause = keyset.clause;
      cursorArgs = keyset.args;
    }

    const allConditions: string[] = [];
    const allArgs: (string | number)[] = [];

    if (filterClause) {
      allConditions.push(filterClause.replace(/^WHERE\s+/i, ""));
      allArgs.push(...filterArgs);
    }
    if (cursorClause) {
      allConditions.push(cursorClause);
      allArgs.push(...cursorArgs);
    }

    const combinedWhere = allConditions.length > 0
      ? `WHERE ${allConditions.join(" AND ")}`
      : "";

    const dataQuery = `SELECT * FROM exoplanets ${combinedWhere} ${orderBy} LIMIT ?`;
    const dataArgs = [...allArgs, limit + 1];
    const dataResult = await db.execute({ sql: dataQuery, args: dataArgs });

    const hasMore = dataResult.rows.length > limit;
    const rows = dataResult.rows.slice(0, limit);
    const objects = rows.map((row) => transformExoplanetRow(row as unknown as ExoplanetRow));

    let nextCursor: string | undefined;
    if (hasMore && rows.length > 0) {
      const lastRow = rows[rows.length - 1] as unknown as ExoplanetRow;
      const primaryValue = sortConfig
        ? getExoplanetSortValue(lastRow, effectiveSort)
        : lastRow.pl_name;
      nextCursor = encodeCursor({
        cv: 1,
        s: effectiveSort,
        o: effectiveOrder,
        f: filterHash,
        v: [primaryValue, lastRow.id],
        d: "n",
      });
    }

    return {
      objects,
      total: 0,
      page: 0,
      limit,
      hasMore,
      nextCursor,
      usedCursor: true,
    };
  }

  // ── Offset mode (default, also used for FTS queries) ─────────────────────
  const page = params.page ?? 1;
  const offset = (page - 1) * limit;

  // If there's a text query, use FTS for fast search
  if (hasFtsQuery) {
    const ftsQuery = params.query!.trim();
    const { clause: filterClause, args: filterArgs } = buildWhereClause(params, true);

    // Build FTS query - search pl_name and hostname
    // Use MATCH with prefix search for partial matching
    const ftsMatch = ftsQuery.split(/\s+/).map(term => `"${term}"*`).join(" ");

    // Count query with FTS
    const countSql = filterClause
      ? `SELECT COUNT(*) as total FROM exoplanets e
         JOIN exoplanets_fts fts ON e.rowid = fts.rowid
         WHERE exoplanets_fts MATCH ? AND ${filterClause.replace("WHERE ", "")}`
      : `SELECT COUNT(*) as total FROM exoplanets e
         JOIN exoplanets_fts fts ON e.rowid = fts.rowid
         WHERE exoplanets_fts MATCH ?`;

    const countArgs = filterClause ? [ftsMatch, ...filterArgs] : [ftsMatch];
    const countResult = await db.execute({ sql: countSql, args: countArgs });
    const total = Number(countResult.rows[0]?.total ?? 0);

    // Data query with FTS + BM25 ranking
    const dataSql = filterClause
      ? `SELECT e.* FROM exoplanets e
         JOIN exoplanets_fts fts ON e.rowid = fts.rowid
         WHERE exoplanets_fts MATCH ? AND ${filterClause.replace("WHERE ", "")}
         ORDER BY bm25(exoplanets_fts), pl_name ASC
         LIMIT ? OFFSET ?`
      : `SELECT e.* FROM exoplanets e
         JOIN exoplanets_fts fts ON e.rowid = fts.rowid
         WHERE exoplanets_fts MATCH ?
         ORDER BY bm25(exoplanets_fts), pl_name ASC
         LIMIT ? OFFSET ?`;

    const dataArgs = filterClause
      ? [ftsMatch, ...filterArgs, limit, offset]
      : [ftsMatch, limit, offset];

    const dataResult = await db.execute({ sql: dataSql, args: dataArgs });
    const objects = dataResult.rows.map((row) => transformExoplanetRow(row as unknown as ExoplanetRow));

    return {
      objects,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      usedCursor: false,
    };
  }

  // No text query - use regular SQL with filters
  const { clause, args } = buildWhereClause(params);

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM exoplanets ${clause}`;
  const countResult = await db.execute({ sql: countQuery, args });
  const total = Number(countResult.rows[0]?.total ?? 0);

  // Get paginated results
  const dataQuery = `SELECT * FROM exoplanets ${clause} ${orderBy} LIMIT ? OFFSET ?`;
  const dataArgs = [...args, limit, offset];
  const dataResult = await db.execute({ sql: dataQuery, args: dataArgs });

  const objects = dataResult.rows.map((row) => transformExoplanetRow(row as unknown as ExoplanetRow));

  return {
    objects,
    total,
    page,
    limit,
    hasMore: page * limit < total,
    usedCursor: false,
  };
}

// Get exoplanet by slug (URL-safe identifier)
export async function getExoplanetBySlug(slug: string): Promise<ExoplanetData | null> {
  const db = getClient();
  if (!db) return null;

  // Try direct ID lookup first
  let result = await db.execute({
    sql: "SELECT * FROM exoplanets WHERE id = ? LIMIT 1",
    args: [slug],
  });

  if (result.rows.length === 0) {
    // Try decoding the slug to pl_name and looking up by pl_name
    const plName = decodeSlug(slug);
    result = await db.execute({
      sql: "SELECT * FROM exoplanets WHERE LOWER(pl_name) = LOWER(?) LIMIT 1",
      args: [plName],
    });
  }

  if (result.rows.length === 0) {
    return null;
  }

  return transformExoplanetRow(result.rows[0] as unknown as ExoplanetRow);
}

// Get exoplanet by planet name (canonical identifier)
export async function getExoplanetByName(plName: string): Promise<ExoplanetData | null> {
  const db = getClient();
  if (!db) return null;

  const result = await db.execute({
    sql: "SELECT * FROM exoplanets WHERE LOWER(pl_name) = LOWER(?) LIMIT 1",
    args: [plName],
  });

  if (result.rows.length === 0) {
    return null;
  }

  return transformExoplanetRow(result.rows[0] as unknown as ExoplanetRow);
}

// Get exoplanets for a specific host star
export async function getExoplanetsForHostStar(hostname: string): Promise<ExoplanetData[]> {
  const db = getClient();
  if (!db) return [];

  const result = await db.execute({
    sql: `SELECT * FROM exoplanets
          WHERE LOWER(hostname) = LOWER(?)
          ORDER BY orbital_period_days ASC NULLS LAST, pl_name ASC`,
    args: [hostname],
  });

  return result.rows.map((row) => transformExoplanetRow(row as unknown as ExoplanetRow));
}

// Get total exoplanet count (for stats/dashboard)
export async function getExoplanetCount(filters?: Partial<ExoplanetQueryParams>): Promise<number> {
  const db = getClient();
  if (!db) return 0;

  if (filters) {
    const { clause, args } = buildWhereClause(filters as ExoplanetQueryParams);
    const result = await db.execute({
      sql: `SELECT COUNT(*) as total FROM exoplanets ${clause}`,
      args,
    });
    return Number(result.rows[0]?.total ?? 0);
  }

  const result = await db.execute("SELECT COUNT(*) as total FROM exoplanets");
  return Number(result.rows[0]?.total ?? 0);
}

// Check if exoplanet index is available
export function isExoplanetIndexAvailable(): boolean {
  return getClient() !== null;
}

// Create slug from planet name
export function createExoplanetSlug(plName: string): string {
  return createSlug(plName);
}
