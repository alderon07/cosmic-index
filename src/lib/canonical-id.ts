import { createHash } from "crypto";

/**
 * Canonical Object ID Utilities
 *
 * Provides a unified identity pipeline for saved objects and alert triggers.
 * Two strategies based on ID stability:
 *
 * 1. CATALOG OBJECTS (stable IDs/slugs):
 *    - Exoplanets, Stars, Small Bodies have stable slugs
 *    - Format: "{type}:{slug}" e.g., "exoplanet:kepler-442-b"
 *
 * 2. EVENT STREAMS (unstable coords/floats):
 *    - Fireballs, Close Approaches, Space Weather events have floating-point data
 *    - Float formatting can vary (35.2 vs 35.20) causing duplicate detection issues
 *    - Solution: Hash a normalized payload
 *    - Format: "{type}:{sha256_hash_24_chars}" e.g., "fireball:a1b2c3d4e5f6..."
 *
 * This single identity pipeline is used for:
 * - saved_objects.canonical_id
 * - alert_triggers.trigger_key
 * - Deduplication checks
 */

export type CatalogObjectType = "exoplanet" | "star" | "small-body";
export type EventObjectType =
  | "fireball"
  | "close-approach"
  | "flr"
  | "cme"
  | "gst";
export type CanonicalObjectType = CatalogObjectType | EventObjectType;

/**
 * Create canonical ID for catalog objects with stable slugs.
 *
 * @example
 * catalogObjectId("exoplanet", "kepler-442-b") // "exoplanet:kepler-442-b"
 * catalogObjectId("star", "kepler-442") // "star:kepler-442"
 * catalogObjectId("small-body", "433-eros") // "small-body:433-eros"
 */
export function catalogObjectId(type: CatalogObjectType, slug: string): string {
  return `${type}:${slug}`;
}

/**
 * Create canonical ID for event stream objects using hash-based deduplication.
 *
 * The payload is normalized before hashing:
 * - Keys are sorted alphabetically
 * - Numbers are formatted to 2 decimal places
 * - Strings are uppercased and trimmed
 *
 * @example
 * eventObjectId("fireball", { date: "2024-01-15", lat: 35.2, lon: -118.5 })
 * // "fireball:a1b2c3d4e5f6789012345678"
 *
 * eventObjectId("close-approach", { des: "2024 AA", jd: 2460300.5 })
 * // "close-approach:x9y8z7w6v5u4t3s2r1q0p9o8"
 */
export function eventObjectId(
  type: EventObjectType,
  payload: Record<string, string | number | null | undefined>
): string {
  // Normalize payload: sort keys, fixed decimals, uppercase strings
  const normalized = Object.entries(payload)
    .filter(([, v]) => v !== null && v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => {
      if (typeof v === "number") return `${k}:${v.toFixed(2)}`;
      return `${k}:${String(v).toUpperCase().trim()}`;
    })
    .join("|");

  // 24 hex chars = 96 bits = effectively collision-free at any realistic scale
  const hash = createHash("sha256").update(normalized).digest("hex").slice(0, 24);
  return `${type}:${hash}`;
}

/**
 * Parse a canonical ID into its type and identifier components.
 *
 * @example
 * parseCanonicalId("exoplanet:kepler-442-b") // { type: "exoplanet", id: "kepler-442-b" }
 * parseCanonicalId("fireball:a1b2c3...") // { type: "fireball", id: "a1b2c3..." }
 */
export function parseCanonicalId(canonicalId: string): {
  type: CanonicalObjectType;
  id: string;
} | null {
  const colonIndex = canonicalId.indexOf(":");
  if (colonIndex === -1) return null;

  const type = canonicalId.slice(0, colonIndex) as CanonicalObjectType;
  const id = canonicalId.slice(colonIndex + 1);

  const validTypes: CanonicalObjectType[] = [
    "exoplanet",
    "star",
    "small-body",
    "fireball",
    "close-approach",
    "flr",
    "cme",
    "gst",
  ];

  if (!validTypes.includes(type)) return null;

  return { type, id };
}

/**
 * Check if a canonical ID is for a catalog object (stable slug).
 */
export function isCatalogObject(canonicalId: string): boolean {
  const parsed = parseCanonicalId(canonicalId);
  if (!parsed) return false;
  return ["exoplanet", "star", "small-body"].includes(parsed.type);
}

/**
 * Check if a canonical ID is for an event stream object (hash-based).
 */
export function isEventObject(canonicalId: string): boolean {
  const parsed = parseCanonicalId(canonicalId);
  if (!parsed) return false;
  return ["fireball", "close-approach", "flr", "cme", "gst"].includes(
    parsed.type
  );
}
