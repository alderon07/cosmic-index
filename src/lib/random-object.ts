import { createSlug } from "@/lib/types";

/**
 * A small set of well-known records with stable identifiers in the three
 * object catalogs. Keeping this list local makes the redirect instant and
 * avoids an extra catalog or upstream request for every click.
 */
export const RANDOM_OBJECT_PATHS = [
  `/exoplanets/${createSlug("TRAPPIST-1 b")}`,
  `/exoplanets/${createSlug("TRAPPIST-1 e")}`,
  `/exoplanets/${createSlug("Kepler-22 b")}`,
  `/exoplanets/${createSlug("Proxima Cen b")}`,
  `/stars/${createSlug("TRAPPIST-1")}`,
  `/stars/${createSlug("Kepler-22")}`,
  `/stars/${createSlug("Proxima Cen")}`,
  `/stars/${createSlug("51 Peg")}`,
  `/small-bodies/${createSlug("1")}`,
  `/small-bodies/${createSlug("4")}`,
  `/small-bodies/${createSlug("433")}`,
  `/small-bodies/${createSlug("99942")}`,
] as const;

export function getRandomObjectPath(
  random: () => number = Math.random,
): (typeof RANDOM_OBJECT_PATHS)[number] {
  const index = Math.floor(random() * RANDOM_OBJECT_PATHS.length);
  return RANDOM_OBJECT_PATHS[index] ?? RANDOM_OBJECT_PATHS[0];
}
