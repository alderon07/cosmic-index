import { createHash } from "crypto";

/**
 * Saved Searches Utilities
 *
 * Provides canonicalization and hashing for saved search deduplication.
 *
 * Problem: Users might save the same search multiple times with different
 * parameter ordering or default values included. These are semantically
 * identical and should not create duplicates.
 *
 * Solution: Canonicalize parameters before storage:
 * 1. Remove default values (page: 1, limit: 24, order: 'asc')
 * 2. Remove empty/null values
 * 3. Sort keys alphabetically
 * 4. Create stable JSON representation
 * 5. Hash for efficient comparison
 *
 * The hash is stored in `saved_searches.params_hash` with a UNIQUE constraint
 * on (user_id, category, params_hash) to prevent duplicates.
 */

// Default values that shouldn't affect search uniqueness
const PARAM_DEFAULTS: Record<string, unknown> = {
  page: 1,
  limit: 24,
  order: "asc",
};

/**
 * Canonicalize search parameters for stable comparison.
 *
 * - Removes default values (page: 1, limit: 24, order: 'asc')
 * - Removes empty, null, and undefined values
 * - Sorts keys alphabetically
 * - Returns stable JSON string
 *
 * @example
 * canonicalizeParams({ query: "kepler", page: 1, order: "asc" })
 * // '{"query":"kepler"}'
 *
 * canonicalizeParams({ sort: "distance", order: "desc", query: "" })
 * // '{"order":"desc","sort":"distance"}'
 */
export function canonicalizeParams(
  params: Record<string, unknown>
): string {
  const filtered = Object.entries(params)
    .filter(([key, value]) => {
      // Remove undefined, null, empty strings
      if (value === undefined || value === null || value === "") return false;

      // Remove default values
      if (key in PARAM_DEFAULTS && value === PARAM_DEFAULTS[key]) return false;

      return true;
    })
    .sort(([a], [b]) => a.localeCompare(b));

  return JSON.stringify(Object.fromEntries(filtered));
}

/**
 * Generate a hash of canonicalized parameters for efficient DB lookups.
 *
 * 32 hex chars = 128 bits = effectively collision-free for any realistic
 * number of saved searches per user.
 *
 * @example
 * const canonical = canonicalizeParams({ query: "kepler" });
 * paramsHash(canonical) // "a1b2c3d4e5f6789012345678901234"
 */
export function paramsHash(canonicalParams: string): string {
  return createHash("sha256").update(canonicalParams).digest("hex").slice(0, 32);
}

/**
 * Convenience function to get both canonical params and hash.
 *
 * @example
 * const { canonical, hash } = canonicalizeAndHash({ query: "kepler", page: 1 });
 * // canonical: '{"query":"kepler"}'
 * // hash: "a1b2c3d4..."
 */
export function canonicalizeAndHash(
  params: Record<string, unknown>
): { canonical: string; hash: string } {
  const canonical = canonicalizeParams(params);
  const hash = paramsHash(canonical);
  return { canonical, hash };
}

/**
 * Parse canonicalized params back to an object.
 * Useful for restoring saved search state.
 */
export function parseCanonicalParams(
  canonical: string
): Record<string, unknown> {
  try {
    return JSON.parse(canonical);
  } catch {
    return {};
  }
}
