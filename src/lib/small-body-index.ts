/**
 * Small Body Local Index
 *
 * Provides fast browse/search over small bodies using a local Turso SQLite index.
 * The index is populated by scripts/ingest-small-bodies.ts from JPL SBDB data.
 *
 * This module mirrors the star-index.ts pattern:
 * - Lazy singleton Turso client
 * - Graceful degradation when database unavailable
 * - Transform database rows to SmallBodyData
 */

import { createClient, Client } from "@libsql/client";
import {
  SmallBodyData,
  SmallBodyQueryParams,
  PaginatedResponse,
  SmallBodyKind,
  KeyFact,
  formatNumber,
  ORBIT_CLASSES,
} from "./types";
import { DEFAULT_PAGE_SIZE } from "./constants";

// ═══════════════════════════════════════════════════════════════════════════════
// Database Connection
// ═══════════════════════════════════════════════════════════════════════════════

let client: Client | null = null;

function getClient(): Client | null {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    console.warn(
      "Turso database not configured - small body index feature disabled"
    );
    return null;
  }

  client = createClient({
    url,
    authToken,
  });

  return client;
}

/**
 * Check if the small body index is available for use.
 * Returns false if database is not configured or table doesn't exist.
 */
export function isSmallBodyIndexAvailable(): boolean {
  return getClient() !== null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Database Row Types
// ═══════════════════════════════════════════════════════════════════════════════

interface SmallBodyRow {
  rowid: number;
  spkid: string;
  id: string;
  designation: string;
  display_name: string;
  full_name: string | null;
  name_sort: string;
  body_kind: string;
  orbit_class: string | null;
  is_neo: number;
  is_pha: number;
  diameter_km: number | null;
  absolute_magnitude: number | null;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Row Transformation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get orbit class display name from code.
 */
function getOrbitClassName(code: string | null | undefined): string {
  if (!code) return "Unknown";
  return ORBIT_CLASSES[code as keyof typeof ORBIT_CLASSES] || code;
}

/**
 * Transform a database row to SmallBodyData.
 */
function transformSmallBodyRow(row: SmallBodyRow): SmallBodyData {
  const kind = row.body_kind as SmallBodyKind;
  const orbitClassName = getOrbitClassName(row.orbit_class);
  const isNeo = row.is_neo === 1;
  const isPha = row.is_pha === 1;

  // Build key facts
  const keyFacts: KeyFact[] = [];

  keyFacts.push({
    label: "Type",
    value: kind === "comet" ? "Comet" : "Asteroid",
  });

  keyFacts.push({
    label: "Orbit Class",
    value: orbitClassName,
  });

  if (row.diameter_km !== null) {
    keyFacts.push({
      label: "Diameter",
      value: formatNumber(row.diameter_km, 2),
      unit: "km",
    });
  }

  if (row.absolute_magnitude !== null) {
    keyFacts.push({
      label: "Absolute Magnitude",
      value: formatNumber(row.absolute_magnitude, 1),
      unit: "H",
    });
  }

  if (isNeo) {
    keyFacts.push({
      label: "Near-Earth Object",
      value: "Yes",
    });
  }

  if (isPha) {
    keyFacts.push({
      label: "Potentially Hazardous",
      value: "Yes",
    });
  }

  // Generate summary
  const typeWord = kind === "comet" ? "comet" : "asteroid";
  let summary = `${row.display_name} is a${kind === "asteroid" ? "n" : ""} ${typeWord}`;
  summary += ` in the ${orbitClassName} orbit class.`;

  if (isNeo) {
    summary += " It is classified as a Near-Earth Object (NEO).";
  }
  if (isPha) {
    summary += " It is potentially hazardous.";
  }
  if (row.diameter_km !== null) {
    summary += ` Its estimated diameter is ${formatNumber(row.diameter_km)} km.`;
  }

  return {
    id: row.id,
    type: "SMALL_BODY",
    displayName: row.display_name,
    aliases: row.full_name && row.full_name !== row.display_name ? [row.full_name] : [],
    source: "JPL_SBDB",
    sourceId: row.spkid,
    summary,
    keyFacts,
    links: [
      {
        label: "JPL Small-Body Database",
        url: `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(row.designation)}`,
      },
    ],
    bodyKind: kind,
    orbitClass: orbitClassName,
    isNeo,
    isPha,
    diameterKm: row.diameter_km ?? undefined,
    absoluteMagnitude: row.absolute_magnitude ?? undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Query Building
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build WHERE clause and parameters for small body queries.
 */
function buildWhereClause(params: SmallBodyQueryParams): {
  clause: string;
  args: (string | number)[];
  useFTS: boolean;
} {
  const conditions: string[] = [];
  const args: (string | number)[] = [];
  let useFTS = false;

  // Text search using FTS5
  if (params.query) {
    useFTS = true;
    // FTS5 query syntax - escape special characters and add wildcard
    const ftsQuery = params.query
      .replace(/['"]/g, "") // Remove quotes
      .trim();
    conditions.push("small_bodies_fts MATCH ?");
    // Use prefix search with * for partial matching
    args.push(`"${ftsQuery}"*`);
  }

  // Filter by body kind
  if (params.kind) {
    conditions.push("sb.body_kind = ?");
    args.push(params.kind);
  }

  // Filter by NEO status
  if (params.neo === true) {
    conditions.push("sb.is_neo = 1");
  }

  // Filter by PHA status
  if (params.pha === true) {
    conditions.push("sb.is_pha = 1");
  }

  // Filter by orbit class
  if (params.orbitClass) {
    conditions.push("sb.orbit_class = ?");
    args.push(params.orbitClass);
  }

  const clause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return { clause, args, useFTS };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Search small bodies with pagination and filtering.
 */
export async function searchSmallBodies(
  params: SmallBodyQueryParams
): Promise<PaginatedResponse<SmallBodyData>> {
  const db = getClient();

  if (!db) {
    return {
      objects: [],
      total: 0,
      page: params.page ?? 1,
      limit: params.limit ?? DEFAULT_PAGE_SIZE,
      hasMore: false,
    };
  }

  const page = params.page ?? 1;
  const limit = params.limit ?? DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * limit;

  const { clause, args, useFTS } = buildWhereClause(params);

  // Different query structure depending on whether FTS is used
  const tableRef = useFTS
    ? "small_bodies sb JOIN small_bodies_fts ON small_bodies_fts.rowid = sb.rowid"
    : "small_bodies sb";

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM ${tableRef} ${clause}`;
  const countResult = await db.execute({ sql: countQuery, args });
  const total = Number(countResult.rows[0]?.total ?? 0);

  // Get paginated results with consistent ordering
  // When using FTS, SQLite returns results by relevance; otherwise sort by name
  const orderBy = useFTS
    ? "ORDER BY rank, sb.name_sort, sb.rowid"
    : "ORDER BY sb.name_sort, sb.rowid";

  const dataQuery = `SELECT sb.* FROM ${tableRef} ${clause} ${orderBy} LIMIT ? OFFSET ?`;
  const dataArgs = [...args, limit, offset];
  const dataResult = await db.execute({ sql: dataQuery, args: dataArgs });

  const objects = dataResult.rows.map((row) =>
    transformSmallBodyRow(row as unknown as SmallBodyRow)
  );

  return {
    objects,
    total,
    page,
    limit,
    hasMore: page * limit < total,
  };
}

/**
 * Get a small body by its URL-safe slug (id).
 */
export async function getSmallBodyBySlug(
  slug: string
): Promise<SmallBodyData | null> {
  const db = getClient();
  if (!db) return null;

  const result = await db.execute({
    sql: "SELECT * FROM small_bodies WHERE id = ? LIMIT 1",
    args: [slug],
  });

  if (result.rows.length === 0) {
    return null;
  }

  return transformSmallBodyRow(result.rows[0] as unknown as SmallBodyRow);
}

/**
 * Get a small body by its JPL designation (case-insensitive).
 */
export async function getSmallBodyByDesignation(
  designation: string
): Promise<SmallBodyData | null> {
  const db = getClient();
  if (!db) return null;

  const result = await db.execute({
    sql: "SELECT * FROM small_bodies WHERE designation = ? COLLATE NOCASE LIMIT 1",
    args: [designation],
  });

  if (result.rows.length === 0) {
    return null;
  }

  return transformSmallBodyRow(result.rows[0] as unknown as SmallBodyRow);
}

/**
 * Get total count of small bodies (optionally with filters).
 */
export async function getSmallBodyCount(
  filters?: Partial<SmallBodyQueryParams>
): Promise<number> {
  const db = getClient();
  if (!db) return 0;

  if (filters) {
    const { clause, args, useFTS } = buildWhereClause(
      filters as SmallBodyQueryParams
    );
    const tableRef = useFTS
      ? "small_bodies sb JOIN small_bodies_fts ON small_bodies_fts.rowid = sb.rowid"
      : "small_bodies sb";
    const result = await db.execute({
      sql: `SELECT COUNT(*) as total FROM ${tableRef} ${clause}`,
      args,
    });
    return Number(result.rows[0]?.total ?? 0);
  }

  const result = await db.execute("SELECT COUNT(*) as total FROM small_bodies");
  return Number(result.rows[0]?.total ?? 0);
}
