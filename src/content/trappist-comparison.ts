// A dated teaching snapshot from the linked NASA Science pages. Keep rounded
// source inputs stable so readers can reproduce the published arithmetic.
export const TRAPPIST_SNAPSHOT_DATE = "2026-09-06";
export const TRAPPIST_PLANETS = [
  { name: "TRAPPIST-1 b", slug: createSlug("TRAPPIST-1 b"), radiusEarth: 1.116, periodDays: 1.5, source: "https://science.nasa.gov/exoplanet-catalog/trappist-1-b/" },
  { name: "TRAPPIST-1 e", slug: createSlug("TRAPPIST-1 e"), radiusEarth: 0.92, periodDays: 6.1, source: "https://science.nasa.gov/exoplanet-catalog/trappist-1-e/" },
] as const;
import { createSlug } from "@/lib/types";
