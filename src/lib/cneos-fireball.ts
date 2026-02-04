import {
  FireballEvent,
  FireballQueryParams,
  FireballListResponse,
  FireballSortField,
  SortOrder,
} from "./types";
import { withCache, CACHE_TTL, CACHE_KEYS, hashParams } from "./cache";

// CNEOS Fireball Data API
const FIREBALL_API_URL = "https://ssd-api.jpl.nasa.gov/fireball.api";

// Timeout for external API calls
const API_TIMEOUT_MS = 15 * 1000; // 15 seconds

// Default query parameters
const DEFAULT_LIMIT = 100;

// CNEOS Fireball API response structure (same shape as CAD)
interface FireballResponse {
  signature: { source: string; version: string };
  count: string;
  fields: string[];
  data: (string | null)[][];
}

/**
 * Parse latitude/longitude value with direction into signed decimal degrees
 * @param value - Numeric string (e.g., "23.5")
 * @param direction - Direction string ("N", "S", "E", "W")
 * @returns Signed decimal degrees, or undefined if data missing
 */
function parseLatLon(
  value: string | null,
  direction: string | null
): number | undefined {
  if (!value || !direction) return undefined;

  const num = parseFloat(value);
  if (isNaN(num)) return undefined;

  // South and West are negative
  if (direction === "S" || direction === "W") {
    return -num;
  }
  return num;
}

/**
 * Generate URL-safe ID from fireball date
 * e.g., "2025-12-15 14:23:05" → "2025-12-15-142305"
 */
function generateFireballId(date: string): string {
  return date
    .replace(/\s+/g, "-")
    .replace(/:/g, "")
    .replace(/[/\\]/g, "-");
}

/**
 * Get energy size category based on impact energy (kt TNT) or radiated energy
 */
export function getEnergySizeCategory(
  impactEnergyKt?: number,
  radiatedEnergyJ?: number
): string {
  // Prefer impact energy if available
  if (impactEnergyKt !== undefined) {
    if (impactEnergyKt < 0.1) return "Small meteor";
    if (impactEnergyKt < 1) return "Large meteor";
    if (impactEnergyKt < 10) return "Significant";
    return "Major event";
  }

  // Fallback to radiated energy (rough estimate: impact ≈ 2× radiated)
  if (radiatedEnergyJ !== undefined) {
    const estimatedKt = (radiatedEnergyJ * 2) / 4.184e12; // Convert J×10¹⁰ to kt
    if (estimatedKt < 0.1) return "Small meteor";
    if (estimatedKt < 1) return "Large meteor";
    if (estimatedKt < 10) return "Significant";
    return "Major event";
  }

  return "Unknown";
}

/**
 * Map sort field to API parameter
 */
function mapSortField(sort: FireballSortField, order: SortOrder = "desc"): string {
  const fieldMap: Record<FireballSortField, string> = {
    date: "date",
    energy: "energy",
    "impact-e": "impact-e",
    vel: "vel",
    alt: "alt",
  };
  const field = fieldMap[sort] || "date";
  // API default is descending for date, prefix with - for desc
  return order === "asc" ? field : `-${field}`;
}

/**
 * Build API URL parameters from query params
 */
function buildFireballParams(params: FireballQueryParams): URLSearchParams {
  const urlParams = new URLSearchParams();

  // Date range (optional)
  if (params.dateMin) {
    urlParams.set("date-min", params.dateMin);
  }
  if (params.dateMax) {
    urlParams.set("date-max", params.dateMax);
  }

  // Require field filters
  if (params.reqLoc) {
    urlParams.set("req-loc", "true");
  }
  if (params.reqAlt) {
    urlParams.set("req-alt", "true");
  }
  if (params.reqVel) {
    urlParams.set("req-vel", "true");
  }

  // Sorting (default: -date = most recent first)
  if (params.sort) {
    urlParams.set("sort", mapSortField(params.sort, params.order));
  }

  // Limit
  const limit = params.limit || DEFAULT_LIMIT;
  urlParams.set("limit", limit.toString());

  return urlParams;
}

/**
 * Parse Fireball API response into FireballEvent objects
 */
function parseFireballResponse(
  fields: string[],
  data: (string | null)[][]
): FireballEvent[] {
  const getValue = (row: (string | null)[], field: string): string | null => {
    const idx = fields.indexOf(field);
    return idx >= 0 ? row[idx] : null;
  };

  return data
    .map((row) => {
      const dateRaw = getValue(row, "date");
      const energyStr = getValue(row, "energy");

      // Required fields: date and energy
      if (!dateRaw || !energyStr) {
        return null;
      }

      const radiatedEnergyJ = parseFloat(energyStr);
      if (isNaN(radiatedEnergyJ)) {
        return null;
      }

      // Optional fields
      const impactEStr = getValue(row, "impact-e");
      const latStr = getValue(row, "lat");
      const latDir = getValue(row, "lat-dir");
      const lonStr = getValue(row, "lon");
      const lonDir = getValue(row, "lon-dir");
      const altStr = getValue(row, "alt");
      const velStr = getValue(row, "vel");

      const impactEnergyKt = impactEStr ? parseFloat(impactEStr) : undefined;
      const latitude = parseLatLon(latStr, latDir);
      const longitude = parseLatLon(lonStr, lonDir);
      const altitudeKm = altStr ? parseFloat(altStr) : undefined;
      const velocityKmS = velStr ? parseFloat(velStr) : undefined;

      // Compute flags
      const hasLocation = latitude !== undefined && longitude !== undefined;
      const hasAltitude = altitudeKm !== undefined && !isNaN(altitudeKm);
      const hasVelocity = velocityKmS !== undefined && !isNaN(velocityKmS);
      const isComplete = hasLocation && hasAltitude && hasVelocity;

      const event: FireballEvent = {
        id: generateFireballId(dateRaw),
        date: dateRaw, // Keep as-is, it's already in readable format
        dateRaw,
        radiatedEnergyJ,
        impactEnergyKt: impactEnergyKt && !isNaN(impactEnergyKt) ? impactEnergyKt : undefined,
        latitude,
        longitude,
        altitudeKm: hasAltitude ? altitudeKm : undefined,
        velocityKmS: hasVelocity ? velocityKmS : undefined,
        hasLocation,
        hasAltitude,
        hasVelocity,
        isComplete,
      };

      return event;
    })
    .filter((e): e is FireballEvent => e !== null);
}

// Cache version - increment to invalidate old cached responses
const CACHE_VERSION = 1;

/**
 * Fetch fireballs from CNEOS Fireball API
 */
export async function fetchFireballs(
  params: FireballQueryParams = {}
): Promise<FireballListResponse> {
  const cacheKey = `${CACHE_KEYS.FIREBALL_LIST}:v${CACHE_VERSION}:${hashParams(params as Record<string, unknown>)}`;

  return withCache(cacheKey, CACHE_TTL.FIREBALL_LIST, async () => {
    const urlParams = buildFireballParams(params);
    const url = `${FIREBALL_API_URL}?${urlParams.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`CNEOS Fireball API error: ${response.status} ${response.statusText}`);
      }

      const data: FireballResponse = await response.json();

      // Validate response structure
      if (!data) {
        throw new Error("Invalid CNEOS Fireball API response structure");
      }

      // Handle empty results
      if (data.count === "0" || parseInt(data.count, 10) === 0) {
        return {
          events: [],
          count: 0,
          meta: {
            filtersApplied: Object.fromEntries(urlParams.entries()),
          },
        };
      }

      // For non-empty results, validate arrays exist
      if (!Array.isArray(data.fields) || !Array.isArray(data.data)) {
        throw new Error("Invalid CNEOS Fireball API response structure");
      }

      const events = parseFireballResponse(data.fields, data.data);

      return {
        events,
        count: parseInt(data.count, 10) || events.length,
        meta: {
          filtersApplied: Object.fromEntries(urlParams.entries()),
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request to CNEOS Fireball API timed out");
      }

      throw error;
    }
  });
}

/**
 * Format energy for display
 */
export function formatEnergy(radiatedEnergyJ: number, impactEnergyKt?: number): string {
  if (impactEnergyKt !== undefined) {
    return `${impactEnergyKt.toFixed(2)} kt`;
  }
  // Show radiated energy in scientific notation
  if (radiatedEnergyJ >= 100) {
    return `${(radiatedEnergyJ / 100).toFixed(1)}×10¹² J`;
  }
  if (radiatedEnergyJ >= 10) {
    return `${(radiatedEnergyJ / 10).toFixed(1)}×10¹¹ J`;
  }
  return `${radiatedEnergyJ.toFixed(1)}×10¹⁰ J`;
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(1)}°${latDir}, ${Math.abs(lon).toFixed(1)}°${lonDir}`;
}

/**
 * Generate Google Maps URL for coordinates
 */
export function getGoogleMapsUrl(lat: number, lon: number): string {
  return `https://www.google.com/maps?q=${lat},${lon}`;
}
