/**
 * Cursor-based pagination utilities.
 *
 * Cursors are opaque, versioned tokens that encode the position in a result set.
 * They include sort key, order, and a filter fingerprint to prevent replay attacks
 * (using a cursor from one query context against a different one).
 *
 * Two strategies:
 * - Turso-backed catalogs (stars, exoplanets): true keyset pagination via SQL WHERE
 * - SBDB (small bodies): offset-encoded cursor (same payload shape, validates sort/filter)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Cursor Payload
// ═══════════════════════════════════════════════════════════════════════════════

export interface CursorPayload {
  /** Cursor version — for future encoding changes */
  cv: 1;
  /** Sort key identifier (e.g., "name", "distance") */
  s: string;
  /** Sort order */
  o: "asc" | "desc";
  /** Filter fingerprint — truncated hash of canonicalized filter params */
  f: string;
  /** Sort key values at cursor position (primary sort value + tiebreaker) */
  v: (string | number | null)[];
  /** Direction: next only */
  d: "n";
}

// Pagination params to exclude from filter hash
const PAGINATION_PARAMS = new Set([
  "page", "limit", "cursor", "sort", "order", "paginationMode",
]);

// ═══════════════════════════════════════════════════════════════════════════════
// Filter Hashing
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute a deterministic fingerprint of filter params.
 *
 * Canonicalization spec:
 * 1. Exclude pagination params (page, limit, cursor, sort, order, paginationMode)
 * 2. Exclude params with undefined/empty values
 * 3. Sort remaining key-value pairs lexicographically by key
 * 4. Stringify values consistently
 * 5. Join as key=value pairs with & separator
 * 6. SHA-256 hash, truncated to first 16 hex chars
 */
export async function hashFilters(
  params: Record<string, unknown>,
): Promise<string> {
  const entries: [string, string][] = [];

  for (const [key, value] of Object.entries(params)) {
    if (PAGINATION_PARAMS.has(key)) continue;
    if (value === undefined || value === null || value === "") continue;

    // Stringify consistently
    const strValue = typeof value === "boolean"
      ? (value ? "true" : "false")
      : typeof value === "number"
        ? String(value)
        : String(value);

    entries.push([key, strValue]);
  }

  // Sort lexicographically by key
  entries.sort((a, b) => a[0].localeCompare(b[0]));

  const canonical = entries.map(([k, v]) => `${k}=${v}`).join("&");

  // SHA-256 hash, truncated to 16 hex chars
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);

  // Convert first 8 bytes to 16 hex chars
  let hex = "";
  for (let i = 0; i < 8; i++) {
    hex += hashArray[i].toString(16).padStart(2, "0");
  }

  return hex;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cursor Encoding / Decoding
// ═══════════════════════════════════════════════════════════════════════════════

/** Encode a cursor payload to a URL-safe string (base64url JSON) */
export function encodeCursor(payload: CursorPayload): string {
  const json = JSON.stringify(payload);
  // Use btoa + URL-safe replacements
  const base64 = btoa(json);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode a cursor string back to a payload. Returns null if malformed. */
export function decodeCursor(cursor: string): CursorPayload | null {
  try {
    // Restore base64 padding and characters
    let base64 = cursor.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) base64 += "=";

    const json = atob(base64);
    const payload = JSON.parse(json);

    // Basic structure validation
    if (
      payload.cv !== 1 ||
      typeof payload.s !== "string" ||
      (payload.o !== "asc" && payload.o !== "desc") ||
      typeof payload.f !== "string" ||
      !Array.isArray(payload.v) ||
      payload.d !== "n"
    ) {
      return null;
    }

    return payload as CursorPayload;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Cursor Validation
// ═══════════════════════════════════════════════════════════════════════════════

export type CursorMismatchReason =
  | "MALFORMED"
  | "VERSION_MISMATCH"
  | "SORT_MISMATCH"
  | "FILTER_MISMATCH";

export type CursorValidationResult =
  | { valid: true; payload: CursorPayload }
  | { valid: false; reason: CursorMismatchReason };

/**
 * Validate a cursor against the current request's sort, order, and filter hash.
 */
export function validateCursor(
  cursor: CursorPayload,
  sort: string,
  order: "asc" | "desc",
  filterHash: string,
): CursorValidationResult {
  if (cursor.cv !== 1) {
    return { valid: false, reason: "VERSION_MISMATCH" };
  }
  if (cursor.s !== sort || cursor.o !== order) {
    return { valid: false, reason: "SORT_MISMATCH" };
  }
  if (cursor.f !== filterHash) {
    return { valid: false, reason: "FILTER_MISMATCH" };
  }
  return { valid: true, payload: cursor };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Keyset WHERE Clause Builder (for Turso)
// ═══════════════════════════════════════════════════════════════════════════════

interface SortConfig {
  /** SQL column name for primary sort */
  column: string;
  /** Whether the column is nullable */
  nullable: boolean;
  /** SQL column name for tiebreaker (must be unique, non-null) */
  tiebreakerColumn: string;
}

/**
 * Build a keyset WHERE clause for cursor pagination.
 *
 * For ascending order with NULLS LAST:
 * - If cursor value is NOT NULL:
 *   (col > ?) OR (col = ? AND tiebreaker > ?) OR (col IS NULL)
 * - If cursor value IS NULL (in the NULL partition):
 *   col IS NULL AND tiebreaker > ?
 *
 * For descending order with NULLS FIRST:
 * - If cursor value IS NULL (in the NULL partition):
 *   col IS NULL AND tiebreaker > ?
 * - If cursor value is NOT NULL:
 *   (col < ?) OR (col = ? AND tiebreaker > ?) — NULLs already passed
 */
export function buildKeysetWhereClause(
  cursor: CursorPayload,
  sortConfig: SortConfig,
  order: "asc" | "desc",
): { clause: string; args: (string | number)[] } {
  const [primaryValue, tiebreakerValue] = cursor.v;
  const { column, nullable, tiebreakerColumn } = sortConfig;
  const args: (string | number)[] = [];

  // Non-nullable column (simpler case)
  if (!nullable) {
    if (order === "asc") {
      // (col > ?) OR (col = ? AND tiebreaker > ?)
      args.push(primaryValue as string | number, primaryValue as string | number, tiebreakerValue as string | number);
      return {
        clause: `(${column} > ? OR (${column} = ? AND ${tiebreakerColumn} > ?))`,
        args,
      };
    } else {
      // (col < ?) OR (col = ? AND tiebreaker > ?)
      args.push(primaryValue as string | number, primaryValue as string | number, tiebreakerValue as string | number);
      return {
        clause: `(${column} < ? OR (${column} = ? AND ${tiebreakerColumn} > ?))`,
        args,
      };
    }
  }

  // Nullable column
  if (primaryValue === null) {
    // We're in the NULL partition — only filter by tiebreaker
    args.push(tiebreakerValue as string | number);
    return {
      clause: `(${column} IS NULL AND ${tiebreakerColumn} > ?)`,
      args,
    };
  }

  if (order === "asc") {
    // NULLS LAST: non-null values first, then NULLs
    // (col > ?) OR (col = ? AND tiebreaker > ?) OR (col IS NULL)
    args.push(primaryValue as string | number, primaryValue as string | number, tiebreakerValue as string | number);
    return {
      clause: `(${column} > ? OR (${column} = ? AND ${tiebreakerColumn} > ?) OR ${column} IS NULL)`,
      args,
    };
  } else {
    // NULLS FIRST: NULLs already passed (cursor is non-null means we've passed NULLs)
    // (col < ?) OR (col = ? AND tiebreaker > ?)
    args.push(primaryValue as string | number, primaryValue as string | number, tiebreakerValue as string | number);
    return {
      clause: `(${column} < ? OR (${column} = ? AND ${tiebreakerColumn} > ?))`,
      args,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sort Config Maps (used by data layer to look up column info)
// ═══════════════════════════════════════════════════════════════════════════════

export const STAR_SORT_CONFIG: Record<string, SortConfig> = {
  name: { column: "hostname", nullable: false, tiebreakerColumn: "id" },
  distance: { column: "distance_parsecs", nullable: true, tiebreakerColumn: "id" },
  vmag: { column: "vmag", nullable: true, tiebreakerColumn: "id" },
  planetCount: { column: "planet_count", nullable: false, tiebreakerColumn: "id" },
  planetCountDesc: { column: "planet_count", nullable: false, tiebreakerColumn: "id" },
};

export const EXOPLANET_SORT_CONFIG: Record<string, SortConfig> = {
  name: { column: "pl_name", nullable: false, tiebreakerColumn: "id" },
  discovered: { column: "disc_year", nullable: true, tiebreakerColumn: "id" },
  distance: { column: "distance_parsecs", nullable: true, tiebreakerColumn: "id" },
  radius: { column: "radius_earth", nullable: true, tiebreakerColumn: "id" },
  mass: { column: "mass_earth", nullable: true, tiebreakerColumn: "id" },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Cursor Validation Error
// ═══════════════════════════════════════════════════════════════════════════════

/** Error thrown when cursor validation fails in data layer */
export class CursorValidationError extends Error {
  reason: CursorMismatchReason | "MALFORMED";
  constructor(reason: CursorMismatchReason | "MALFORMED") {
    super(`Invalid cursor: ${reason}`);
    this.name = "CursorValidationError";
    this.reason = reason;
  }
}
