import { createClient, Client } from "@libsql/client";
import {
  StarData,
  StarQueryParams,
  SortOrder,
  PaginatedResponse,
  SpectralClass,
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
  STAR_SORT_CONFIG,
  CursorValidationError,
} from "./cursor";

// Lazy singleton for Turso client
let client: Client | null = null;

function getClient(): Client | null {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    console.warn("Turso database not configured - stars feature disabled");
    return null;
  }

  client = createClient({
    url,
    authToken,
  });

  return client;
}

// Row type from database
interface StarRow {
  id: string;
  hostname: string;
  spectral_type: string | null;
  spectral_class: string | null;
  star_temp_k: number | null;
  star_mass_solar: number | null;
  star_radius_solar: number | null;
  star_luminosity_log: number | null;
  metallicity_feh: number | null;
  age_gyr: number | null;
  distance_parsecs: number | null;
  vmag: number | null;
  kmag: number | null;
  ra_deg: number | null;
  dec_deg: number | null;
  stars_in_system: number | null;
  planets_in_system: number | null;
  planet_count: number;
}

// Transform database row to StarData
function transformStarRow(row: StarRow): StarData {
  const keyFacts: KeyFact[] = [];

  if (row.planet_count > 0) {
    keyFacts.push({
      label: "Planets",
      value: row.planet_count.toString(),
    });
  }

  if (row.spectral_class && row.spectral_class !== "Unknown") {
    keyFacts.push({
      label: "Spectral Class",
      value: row.spectral_class,
    });
  }

  if (row.distance_parsecs !== null) {
    keyFacts.push({
      label: "Distance",
      value: formatNumber(row.distance_parsecs, 1),
      unit: "pc",
    });
  }

  if (row.star_temp_k !== null) {
    keyFacts.push({
      label: "Temperature",
      value: formatNumber(row.star_temp_k, 0),
      unit: "K",
    });
  }

  if (row.vmag !== null) {
    keyFacts.push({
      label: "V Magnitude",
      value: formatNumber(row.vmag, 2),
    });
  }

  // Generate summary
  let summary = `${row.hostname} is a host star`;
  if (row.spectral_class && row.spectral_class !== "Unknown") {
    summary += ` of spectral class ${row.spectral_class}`;
  }
  if (row.planet_count > 0) {
    summary += ` with ${row.planet_count} known ${row.planet_count === 1 ? "exoplanet" : "exoplanets"}`;
  }
  summary += ".";

  if (row.distance_parsecs !== null) {
    const distanceLy = row.distance_parsecs * 3.26156;
    summary += ` It is located approximately ${formatNumber(distanceLy, 0)} light-years from Earth.`;
  }

  return {
    id: row.id,
    type: "STAR",
    displayName: row.hostname,
    aliases: [],
    source: "NASA_EXOPLANET_ARCHIVE",
    sourceId: row.hostname,
    summary,
    keyFacts,
    links: [
      {
        label: "NASA Exoplanet Archive",
        url: `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(row.hostname)}`,
      },
    ],
    hostname: row.hostname,
    spectralType: row.spectral_type ?? undefined,
    spectralClass: (row.spectral_class as SpectralClass) ?? undefined,
    starTempK: row.star_temp_k ?? undefined,
    starMassSolar: row.star_mass_solar ?? undefined,
    starRadiusSolar: row.star_radius_solar ?? undefined,
    starLuminosity: row.star_luminosity_log ?? undefined,
    metallicityFeH: row.metallicity_feh ?? undefined,
    ageGyr: row.age_gyr ?? undefined,
    distanceParsecs: row.distance_parsecs ?? undefined,
    vMag: row.vmag ?? undefined,
    kMag: row.kmag ?? undefined,
    ra: row.ra_deg ?? undefined,
    dec: row.dec_deg ?? undefined,
    starsInSystem: row.stars_in_system ?? undefined,
    planetsInSystem: row.planets_in_system ?? undefined,
    planetCount: row.planet_count,
  };
}

// Build WHERE clause and parameters for star queries
function buildWhereClause(params: StarQueryParams): {
  clause: string;
  args: (string | number)[];
} {
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (params.query) {
    conditions.push("LOWER(hostname) LIKE ?");
    args.push(`%${params.query.toLowerCase()}%`);
  }

  if (params.spectralClass) {
    conditions.push("spectral_class = ?");
    args.push(params.spectralClass);
  }

  if (params.minPlanets !== undefined) {
    conditions.push("planet_count >= ?");
    args.push(params.minPlanets);
  }

  if (params.multiPlanet) {
    conditions.push("planet_count >= 2");
  }

  if (params.maxDistancePc !== undefined) {
    conditions.push("distance_parsecs IS NOT NULL AND distance_parsecs <= ?");
    args.push(params.maxDistancePc);
  }

  const clause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return { clause, args };
}

// Default sort directions for each sort option
const DEFAULT_STAR_SORT_DIRECTIONS: Record<string, SortOrder> = {
  name: "asc",
  distance: "asc",        // closest first
  vmag: "asc",            // brightest first (lower = brighter)
  planetCount: "asc",     // fewest planets first
  planetCountDesc: "desc", // most planets first (backwards compat)
};

// Build ORDER BY clause for star queries
function buildOrderByClause(sort?: StarQueryParams["sort"], order?: SortOrder): string {
  const sortField = sort || "name";
  const direction = order || DEFAULT_STAR_SORT_DIRECTIONS[sortField] || "asc";
  const dirUpper = direction.toUpperCase();
  const nullsPosition = direction === "asc" ? "LAST" : "FIRST";

  switch (sortField) {
    case "distance":
      return `ORDER BY distance_parsecs ${dirUpper} NULLS ${nullsPosition}, hostname ASC`;
    case "vmag":
      return `ORDER BY vmag ${dirUpper} NULLS ${nullsPosition}, hostname ASC`;
    case "planetCount":
      return `ORDER BY planet_count ${dirUpper}, hostname ASC`;
    case "planetCountDesc":
      // For backwards compat, planetCountDesc ignores user order (always desc)
      return "ORDER BY planet_count DESC, hostname ASC";
    case "name":
    default:
      return `ORDER BY hostname ${dirUpper}`;
  }
}

// Extended result type for cursor-aware responses
export interface StarSearchResult extends PaginatedResponse<StarData> {
  nextCursor?: string;
  usedCursor: boolean;
}

// Default sort map for resolving effective sort/order
const DEFAULT_STAR_SORT = "name";
const DEFAULT_STAR_ORDER: SortOrder = "asc";

// Search stars with pagination (offset or cursor mode)
export async function searchStars(
  params: StarQueryParams
): Promise<StarSearchResult> {
  const db = getClient();

  if (!db) {
    return {
      objects: [],
      total: 0,
      page: params.page ?? 1,
      limit: params.limit ?? DEFAULT_PAGE_SIZE,
      hasMore: false,
      usedCursor: false,
    };
  }

  const limit = params.limit ?? DEFAULT_PAGE_SIZE;
  const effectiveSort = params.sort || DEFAULT_STAR_SORT;
  const effectiveOrder = params.order || DEFAULT_STAR_SORT_DIRECTIONS[effectiveSort] || DEFAULT_STAR_ORDER;
  const useCursor = params.paginationMode === "cursor" || params.cursor !== undefined;

  // ── Cursor mode ──────────────────────────────────────────────────────────
  if (useCursor) {
    const filterHash = await hashFilters(params as Record<string, unknown>);
    const sortConfig = STAR_SORT_CONFIG[effectiveSort];

    // Validate cursor if provided
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
    const orderBy = buildOrderByClause(params.sort, params.order);

    // Build cursor WHERE clause
    let cursorClause = "";
    let cursorArgs: (string | number)[] = [];
    if (cursorPayload && sortConfig) {
      const keyset = buildKeysetWhereClause(cursorPayload, sortConfig, effectiveOrder);
      cursorClause = keyset.clause;
      cursorArgs = keyset.args;
    }

    // Combine filter + cursor WHERE clauses
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

    // Fetch limit + 1 for hasMore detection
    const dataQuery = `SELECT * FROM stars ${combinedWhere} ${orderBy} LIMIT ?`;
    const dataArgs = [...allArgs, limit + 1];
    const dataResult = await db.execute({ sql: dataQuery, args: dataArgs });

    const hasMore = dataResult.rows.length > limit;
    const rows = dataResult.rows.slice(0, limit);
    const objects = rows.map((row) => transformStarRow(row as unknown as StarRow));

    // Mint next cursor from last row
    let nextCursor: string | undefined;
    if (hasMore && rows.length > 0) {
      const lastRow = rows[rows.length - 1] as unknown as StarRow;
      const primaryValue = sortConfig
        ? getStarSortValue(lastRow, effectiveSort)
        : lastRow.hostname;
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
      total: 0, // Not computed in cursor mode
      page: 0,
      limit,
      hasMore,
      nextCursor,
      usedCursor: true,
    };
  }

  // ── Offset mode (default) ────────────────────────────────────────────────
  const page = params.page ?? 1;
  const offset = (page - 1) * limit;

  const { clause, args } = buildWhereClause(params);
  const orderBy = buildOrderByClause(params.sort, params.order);

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM stars ${clause}`;
  const countResult = await db.execute({ sql: countQuery, args });
  const total = Number(countResult.rows[0]?.total ?? 0);

  // Get paginated results
  const dataQuery = `SELECT * FROM stars ${clause} ${orderBy} LIMIT ? OFFSET ?`;
  const dataArgs = [...args, limit, offset];
  const dataResult = await db.execute({ sql: dataQuery, args: dataArgs });

  const objects = dataResult.rows.map((row) => transformStarRow(row as unknown as StarRow));

  return {
    objects,
    total,
    page,
    limit,
    hasMore: page * limit < total,
    usedCursor: false,
  };
}

/** Extract the primary sort value from a StarRow for cursor minting */
function getStarSortValue(row: StarRow, sort: string): string | number | null {
  switch (sort) {
    case "distance": return row.distance_parsecs;
    case "vmag": return row.vmag;
    case "planetCount":
    case "planetCountDesc": return row.planet_count;
    case "name":
    default: return row.hostname;
  }
}

// CursorValidationError is re-exported from cursor.ts
export { CursorValidationError } from "./cursor";

// Get star by slug (URL-safe identifier)
export async function getStarBySlug(slug: string): Promise<StarData | null> {
  const db = getClient();
  if (!db) return null;

  // Try direct ID lookup first
  let result = await db.execute({
    sql: "SELECT * FROM stars WHERE id = ? LIMIT 1",
    args: [slug],
  });

  if (result.rows.length === 0) {
    // Try decoding the slug to hostname and looking up by hostname
    const hostname = decodeSlug(slug);
    result = await db.execute({
      sql: "SELECT * FROM stars WHERE LOWER(hostname) = LOWER(?) LIMIT 1",
      args: [hostname],
    });
  }

  if (result.rows.length === 0) {
    return null;
  }

  return transformStarRow(result.rows[0] as unknown as StarRow);
}

// Get star by hostname (canonical identifier)
export async function getStarByHostname(hostname: string): Promise<StarData | null> {
  const db = getClient();
  if (!db) return null;

  const result = await db.execute({
    sql: "SELECT * FROM stars WHERE LOWER(hostname) = LOWER(?) LIMIT 1",
    args: [hostname],
  });

  if (result.rows.length === 0) {
    return null;
  }

  return transformStarRow(result.rows[0] as unknown as StarRow);
}

// Get total star count (for stats/dashboard)
export async function getStarCount(filters?: Partial<StarQueryParams>): Promise<number> {
  const db = getClient();
  if (!db) return 0;

  if (filters) {
    const { clause, args } = buildWhereClause(filters as StarQueryParams);
    const result = await db.execute({
      sql: `SELECT COUNT(*) as total FROM stars ${clause}`,
      args,
    });
    return Number(result.rows[0]?.total ?? 0);
  }

  const result = await db.execute("SELECT COUNT(*) as total FROM stars");
  return Number(result.rows[0]?.total ?? 0);
}

// Derive spectral class from spectral type string
export function deriveSpectralClass(specType: string | null): SpectralClass {
  if (!specType) return "Unknown";
  const first = specType.trim().charAt(0).toUpperCase();
  return ["O", "B", "A", "F", "G", "K", "M"].includes(first)
    ? (first as SpectralClass)
    : "Unknown";
}

// Create slug from hostname
export function createStarSlug(hostname: string): string {
  return createSlug(hostname);
}
