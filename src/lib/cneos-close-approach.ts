import {
  CloseApproach,
  CloseApproachQueryParams,
  CloseApproachListResponse,
  CloseApproachSortField,
  SortOrder,
} from "./types";
import { withCache, CACHE_TTL, CACHE_KEYS, hashParams } from "./cache";

// CNEOS Close-Approach Data API
const CAD_API_URL = "https://ssd-api.jpl.nasa.gov/cad.api";

// Timeout for external API calls
const API_TIMEOUT_MS = 15 * 1000; // 15 seconds

// Physical constants for distance conversions
export const AU_KM = 149_597_870.7;
export const LD_KM = 384_400;
export const LD_AU = LD_KM / AU_KM; // ~0.00257

// Default query parameters
const DEFAULT_PARAMS: Required<Pick<CloseApproachQueryParams, "dateMin" | "dateMax" | "limit">> = {
  dateMin: "now",
  dateMax: "+60",
  limit: 100,
};

// CNEOS CAD API response structure
interface CADResponse {
  signature: { source: string; version: string };
  count: string;
  fields: string[];
  data: (string | null)[][];
}

/**
 * Convert lunar distance to AU for API parameter
 */
function convertDistMaxLdToAu(ld: number): number {
  return ld * LD_AU;
}

/**
 * Compute distances from AU value
 * Uses km as intermediate for accuracy (avoids direct LD/AU conversion errors)
 */
function computeDistances(distAu: number): { km: number; ld: number } {
  const km = distAu * AU_KM;
  const ld = km / LD_KM;
  return { km, ld };
}

/**
 * Estimate diameter from absolute magnitude (H) using albedo range
 * Formula: D = 1329 / sqrt(albedo) × 10^(-H/5) km
 */
export function estimateDiameter(
  h: number,
  albedoRange: [number, number] = [0.05, 0.25]
): { minKm: number; maxKm: number; albedoRange: [number, number] } {
  const [albedoLow, albedoHigh] = albedoRange;
  const factor = Math.pow(10, -h / 5);

  return {
    minKm: (1329 / Math.sqrt(albedoHigh)) * factor, // bright surface = smaller
    maxKm: (1329 / Math.sqrt(albedoLow)) * factor, // dark surface = larger
    albedoRange,
  };
}

/**
 * Create a URL-safe ID from designation, orbit ID, and close approach time
 */
function createApproachId(des: string, orbitId: string, cd: string): string {
  const combined = `${des}_${orbitId}_${cd}`;
  return encodeURIComponent(combined.replace(/[/\\]/g, "-"));
}

/**
 * Map CNEOS sort field to API parameter
 */
function mapSortField(sort: CloseApproachSortField, order: SortOrder = "asc"): string {
  const fieldMap: Record<CloseApproachSortField, string> = {
    date: "date",
    dist: "dist",
    "v-rel": "v-rel",
    h: "h",
  };
  const field = fieldMap[sort] || "date";
  return order === "desc" ? `-${field}` : field;
}

/**
 * Build CNEOS API URL from query parameters
 */
function buildCNEOSParams(params: CloseApproachQueryParams): URLSearchParams {
  const urlParams = new URLSearchParams();

  // Date range
  urlParams.set("date-min", params.dateMin || DEFAULT_PARAMS.dateMin);
  urlParams.set("date-max", params.dateMax || DEFAULT_PARAMS.dateMax);

  // Distance filter (convert LD to AU for API)
  if (params.distMaxLd !== undefined) {
    const distMaxAu = convertDistMaxLdToAu(params.distMaxLd);
    urlParams.set("dist-max", distMaxAu.toFixed(6));
  }

  // PHA filter
  if (params.phaOnly) {
    urlParams.set("pha", "true");
  }

  // Sorting
  if (params.sort) {
    urlParams.set("sort", mapSortField(params.sort, params.order));
  }

  // Always request these fields for complete data
  urlParams.set("diameter", "true");
  urlParams.set("fullname", "true");

  return urlParams;
}

/**
 * Parse CNEOS CAD API response into CloseApproach objects
 */
function parseCADResponse(
  fields: string[],
  data: (string | null)[][],
  phaFilterApplied: boolean
): CloseApproach[] {
  const getValue = (row: (string | null)[], field: string): string | null => {
    const idx = fields.indexOf(field);
    return idx >= 0 ? row[idx] : null;
  };

  return data
    .map((row) => {
      const des = getValue(row, "des");
      const orbitId = getValue(row, "orbit_id");
      const cd = getValue(row, "cd");
      const dist = getValue(row, "dist");
      const distMin = getValue(row, "dist_min");
      const distMax = getValue(row, "dist_max");
      const vRel = getValue(row, "v_rel");
      const h = getValue(row, "h");

      // Required fields
      if (!des || !orbitId || !cd || !dist || !vRel || !h) {
        return null;
      }

      const distAu = parseFloat(dist);
      const distMinAu = distMin ? parseFloat(distMin) : distAu;
      const distMaxAu = distMax ? parseFloat(distMax) : distAu;
      const relVel = parseFloat(vRel);
      const absMag = parseFloat(h);

      if (isNaN(distAu) || isNaN(relVel) || isNaN(absMag)) {
        return null;
      }

      const distances = computeDistances(distAu);

      // Optional fields
      const jdStr = getValue(row, "jd");
      const fullName = getValue(row, "fullname");
      const diameterStr = getValue(row, "diameter");
      const diameterSigmaStr = getValue(row, "diameter_sigma");
      const tSigmaF = getValue(row, "t_sigma_f");  // Time uncertainty (e.g., "00:19", "< 00:01")
      const vInf = getValue(row, "v_inf");         // Velocity at infinity

      // Measured diameter (from API)
      let diameterMeasured: CloseApproach["diameterMeasured"];
      if (diameterStr) {
        const diamKm = parseFloat(diameterStr);
        if (!isNaN(diamKm)) {
          diameterMeasured = { km: diamKm };
          if (diameterSigmaStr) {
            const sigma = parseFloat(diameterSigmaStr);
            if (!isNaN(sigma)) {
              diameterMeasured.sigma = sigma;
            }
          }
        }
      }

      // Estimated diameter (from H)
      const diameterEstimated = estimateDiameter(absMag);

      // Parse velocity at infinity
      const velInf = vInf ? parseFloat(vInf) : undefined;

      const approach: CloseApproach = {
        id: createApproachId(des, orbitId, cd),
        designation: des,
        orbitId,
        fullName: fullName || undefined,
        approachTimeRaw: cd,
        timeUncertainty: tSigmaF || undefined,
        jd: jdStr ? parseFloat(jdStr) : undefined,
        distanceAu: distAu,
        distanceKm: distances.km,
        distanceLd: distances.ld,
        distanceMinAu: distMinAu,
        distanceMaxAu: distMaxAu,
        relativeVelocityKmS: relVel,
        velocityInfinityKmS: velInf && !isNaN(velInf) ? velInf : undefined,
        absoluteMagnitude: absMag,
        diameterMeasured,
        diameterEstimated,
        // Only mark as PHA if we filtered by PHA (API doesn't return this flag otherwise)
        isPha: phaFilterApplied ? true : undefined,
      };

      return approach;
    })
    .filter((a): a is CloseApproach => a !== null);
}

/**
 * Compute highlight entries (closest approach and fastest flyby)
 */
function computeHighlights(events: CloseApproach[]): CloseApproachListResponse["highlights"] {
  if (events.length === 0) {
    return undefined;
  }

  let closestApproach = events[0];
  let fastestFlyby = events[0];

  for (const event of events) {
    if (event.distanceLd < closestApproach.distanceLd) {
      closestApproach = event;
    }
    if (event.relativeVelocityKmS > fastestFlyby.relativeVelocityKmS) {
      fastestFlyby = event;
    }
  }

  return { closestApproach, fastestFlyby };
}

/**
 * Fetch close approaches from CNEOS CAD API
 */
export async function fetchCloseApproaches(
  params: CloseApproachQueryParams = {}
): Promise<CloseApproachListResponse> {
  const cacheKey = `${CACHE_KEYS.CLOSE_APPROACH_LIST}:${hashParams(params as Record<string, unknown>)}`;

  return withCache(cacheKey, CACHE_TTL.CLOSE_APPROACH_LIST, async () => {
    const urlParams = buildCNEOSParams(params);
    const url = `${CAD_API_URL}?${urlParams.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`CNEOS API error: ${response.status} ${response.statusText}`);
      }

      const data: CADResponse = await response.json();

      // Validate response structure
      if (!data) {
        throw new Error("Invalid CNEOS API response structure");
      }

      // Handle empty results (CNEOS omits fields/data arrays when count=0)
      if (data.count === "0" || parseInt(data.count, 10) === 0) {
        return {
          events: [],
          meta: {
            count: 0,
            phaFilterApplied: params.phaOnly === true,
            queryApplied: Object.fromEntries(urlParams.entries()),
          },
          highlights: undefined,
        };
      }

      // For non-empty results, validate arrays exist
      if (!Array.isArray(data.fields) || !Array.isArray(data.data)) {
        throw new Error("Invalid CNEOS API response structure");
      }

      const phaFilterApplied = params.phaOnly === true;
      const events = parseCADResponse(data.fields, data.data, phaFilterApplied);

      // Apply limit if specified (API should handle this, but be safe)
      const limit = params.limit || DEFAULT_PARAMS.limit;
      const limitedEvents = events.slice(0, limit);

      return {
        events: limitedEvents,
        meta: {
          count: parseInt(data.count, 10) || events.length,
          phaFilterApplied,
          queryApplied: Object.fromEntries(urlParams.entries()),
        },
        highlights: computeHighlights(limitedEvents),
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request to CNEOS API timed out");
      }

      throw error;
    }
  });
}

/**
 * Convenience function for fetching upcoming close approaches
 * Used for dashboard widgets and quick lookups
 */
export async function fetchUpcoming(
  days: number = 60,
  maxDistLd: number = 10
): Promise<CloseApproachListResponse> {
  return fetchCloseApproaches({
    dateMin: "now",
    dateMax: `+${days}`,
    distMaxLd: maxDistLd,
    sort: "date",
    order: "asc",
    limit: 50,
  });
}

/**
 * Format distance for display with appropriate units
 */
export function formatDistance(distanceLd: number, distanceKm: number): string {
  if (distanceLd < 1) {
    return `${distanceLd.toFixed(2)} LD (${(distanceKm / 1000).toFixed(0)}k km)`;
  }
  return `${distanceLd.toFixed(1)} LD (${(distanceKm / 1_000_000).toFixed(2)}M km)`;
}

/**
 * Get size category label based on estimated diameter
 */
export function getSizeCategory(diameterEstimated?: { minKm: number; maxKm: number }): string {
  if (!diameterEstimated) return "Unknown";

  const avgDiameter = (diameterEstimated.minKm + diameterEstimated.maxKm) / 2;

  if (avgDiameter < 0.05) return "Very Small (<50m)";
  if (avgDiameter < 0.3) return "Small (50-300m)";
  if (avgDiameter < 1) return "Medium (300m-1km)";
  return "Large (>1km)";
}
