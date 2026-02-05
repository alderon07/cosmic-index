import {
  SpaceWeatherEventType,
  SpaceWeatherSeverity,
  SolarFlareEvent,
  CMEEvent,
  GSTEvent,
  AnySpaceWeatherEvent,
  SpaceWeatherQueryParams,
  SpaceWeatherListResponse,
} from "./types";
import { withCache, CACHE_TTL, CACHE_KEYS } from "./cache";

// Base URL from env, with fallback to CCMC direct (no key required)
const DONKI_BASE_URL =
  process.env.DONKI_BASE_URL ||
  "https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get";
const NASA_API_KEY = process.env.NASA_API_KEY; // Only needed for api.nasa.gov gateway

const API_TIMEOUT_MS = 20000; // DONKI can be slow
const DEFAULT_DAYS_BACK = 30;

// Cache version - increment to invalidate old cached responses
const CACHE_VERSION = 1;

// ═══════════════════════════════════════════════════════════════════════════════
// Severity Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get severity level from solar flare class type
 * M1-M4.9 = moderate, M5-M9.9 = strong, X1-X9.9 = severe, X10+ = extreme
 */
export function getFlareClassSeverity(classType: string): SpaceWeatherSeverity {
  const match = classType.match(/^([ABCMX])(\d+\.?\d*)/i);
  if (!match) return "minor";

  const letter = match[1].toUpperCase();
  const number = parseFloat(match[2]);

  switch (letter) {
    case "X":
      if (number >= 10) return "extreme";
      return "severe";
    case "M":
      if (number >= 5) return "strong";
      return "moderate";
    case "C":
      return "minor";
    default:
      return "minor";
  }
}

/**
 * Get severity level from Kp index
 * Kp5 = minor (G1), Kp6 = moderate (G2), Kp7 = strong (G3), Kp8 = severe (G4), Kp9 = extreme (G5)
 */
export function getKpSeverity(kp: number): SpaceWeatherSeverity {
  if (kp >= 9) return "extreme";
  if (kp >= 8) return "severe";
  if (kp >= 7) return "strong";
  if (kp >= 6) return "moderate";
  return "minor";
}

/**
 * Get severity level from CME speed
 * Based on typical CME speeds and space weather impact
 */
export function getCMESeverity(speed?: number): SpaceWeatherSeverity {
  if (!speed) return "minor";
  if (speed >= 2000) return "extreme";
  if (speed >= 1500) return "severe";
  if (speed >= 1000) return "strong";
  if (speed >= 500) return "moderate";
  return "minor";
}

/**
 * Get human-readable label for event type
 */
export function getEventTypeLabel(type: SpaceWeatherEventType): string {
  switch (type) {
    case "FLR":
      return "Solar Flare";
    case "CME":
      return "Coronal Mass Ejection";
    case "GST":
      return "Geomagnetic Storm";
  }
}

/**
 * Format flare class for display (e.g., "M1.2" → "M1.2-class")
 */
export function formatFlareClass(classType: string): string {
  return `${classType}-class`;
}

/**
 * Format CME speed for display
 */
export function formatCMESpeed(speed?: number): string {
  if (!speed) return "Unknown";
  return `${Math.round(speed)} km/s`;
}

/**
 * Format Kp index for display with G-scale
 */
export function formatKpIndex(kp: number): string {
  const gScale = kp >= 9 ? "G5" : kp >= 8 ? "G4" : kp >= 7 ? "G3" : kp >= 6 ? "G2" : kp >= 5 ? "G1" : "";
  return gScale ? `Kp${kp} (${gScale})` : `Kp${kp}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Date Helpers
// ═══════════════════════════════════════════════════════════════════════════════

function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - DEFAULT_DAYS_BACK);

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function buildUrl(endpoint: string, startDate: string, endDate: string): string {
  const url = new URL(`${DONKI_BASE_URL}/${endpoint}`);
  url.searchParams.set("startDate", startDate);
  url.searchParams.set("endDate", endDate);

  // Add API key if using api.nasa.gov gateway
  if (DONKI_BASE_URL.includes("api.nasa.gov") && NASA_API_KEY) {
    url.searchParams.set("api_key", NASA_API_KEY);
  }

  return url.toString();
}

// ═══════════════════════════════════════════════════════════════════════════════
// Raw API Response Types
// ═══════════════════════════════════════════════════════════════════════════════

interface RawLinkedEvent {
  activityID: string;
  [key: string]: unknown;
}

interface RawFLR {
  flrID: string;
  beginTime: string;
  peakTime?: string;
  endTime?: string;
  classType: string;
  sourceLocation?: string;
  activeRegionNum?: number;
  linkedEvents?: RawLinkedEvent[];
}

interface RawCMEAnalysis {
  speed?: number;
  halfAngle?: number;
  type?: string;
  isMostAccurate?: boolean;
}

interface RawCME {
  activityID: string;
  startTime: string;
  sourceLocation?: string;
  activeRegionNum?: number;
  cmeAnalyses?: RawCMEAnalysis[];
  linkedEvents?: RawLinkedEvent[];
}

interface RawKpIndex {
  observedTime: string;
  kpIndex: number;
  source: string;
}

interface RawGST {
  gstID: string;
  startTime: string;
  allKpIndex?: RawKpIndex[];
  linkedEvents?: RawLinkedEvent[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Individual Event Type Fetchers
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchWithTimeout<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`DONKI API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request to DONKI API timed out");
    }

    throw error;
  }
}

/**
 * Fetch Solar Flares from DONKI
 */
async function fetchSolarFlaresRaw(
  startDate: string,
  endDate: string
): Promise<SolarFlareEvent[]> {
  const cacheKey = `${CACHE_KEYS.SPACE_WEATHER_FLR}:v${CACHE_VERSION}:${startDate}:${endDate}`;

  return withCache(cacheKey, CACHE_TTL.SPACE_WEATHER, async () => {
    try {
      const url = buildUrl("FLR", startDate, endDate);
      const data = await fetchWithTimeout<RawFLR[]>(url);

      if (!Array.isArray(data)) {
        console.warn("[DONKI] FLR endpoint returned non-array:", typeof data);
        return [];
      }

      return data.map((flr): SolarFlareEvent => ({
        id: flr.flrID,
        eventType: "FLR",
        startTime: flr.beginTime,
        peakTime: flr.peakTime,
        endTime: flr.endTime,
        classType: flr.classType,
        sourceLocation: flr.sourceLocation,
        activeRegionNum: flr.activeRegionNum,
        linkedEvents: flr.linkedEvents,
      }));
    } catch (error) {
      console.error("[DONKI] Failed to fetch solar flares:", error);
      return [];
    }
  });
}

/**
 * Fetch Coronal Mass Ejections from DONKI
 */
async function fetchCMEsRaw(
  startDate: string,
  endDate: string
): Promise<CMEEvent[]> {
  const cacheKey = `${CACHE_KEYS.SPACE_WEATHER_CME}:v${CACHE_VERSION}:${startDate}:${endDate}`;

  return withCache(cacheKey, CACHE_TTL.SPACE_WEATHER, async () => {
    try {
      const url = buildUrl("CME", startDate, endDate);
      const data = await fetchWithTimeout<RawCME[]>(url);

      if (!Array.isArray(data)) {
        console.warn("[DONKI] CME endpoint returned non-array:", typeof data);
        return [];
      }

      return data.map((cme): CMEEvent => {
        // Find the most accurate analysis, or fall back to first one
        const analysis = cme.cmeAnalyses?.find((a) => a.isMostAccurate) ||
          cme.cmeAnalyses?.[0];

        return {
          id: cme.activityID,
          eventType: "CME",
          startTime: cme.startTime,
          sourceLocation: cme.sourceLocation,
          activeRegionNum: cme.activeRegionNum,
          speed: analysis?.speed,
          halfAngle: analysis?.halfAngle,
          cmeType: analysis?.type,
          linkedEvents: cme.linkedEvents,
        };
      });
    } catch (error) {
      console.error("[DONKI] Failed to fetch CMEs:", error);
      return [];
    }
  });
}

/**
 * Fetch Geomagnetic Storms from DONKI
 */
async function fetchGSTsRaw(
  startDate: string,
  endDate: string
): Promise<GSTEvent[]> {
  const cacheKey = `${CACHE_KEYS.SPACE_WEATHER_GST}:v${CACHE_VERSION}:${startDate}:${endDate}`;

  return withCache(cacheKey, CACHE_TTL.SPACE_WEATHER, async () => {
    try {
      const url = buildUrl("GST", startDate, endDate);
      const data = await fetchWithTimeout<RawGST[]>(url);

      if (!Array.isArray(data)) {
        console.warn("[DONKI] GST endpoint returned non-array:", typeof data);
        return [];
      }

      return data.map((gst): GSTEvent => {
        // Extract all Kp readings
        const allKpReadings = (gst.allKpIndex || []).map((kp) => ({
          observedTime: kp.observedTime,
          kpIndex: kp.kpIndex,
          source: kp.source,
        }));

        // Get max Kp for the storm
        const maxKp = allKpReadings.length > 0
          ? Math.max(...allKpReadings.map((r) => r.kpIndex))
          : 0;

        return {
          id: gst.gstID,
          eventType: "GST",
          startTime: gst.startTime,
          kpIndex: maxKp,
          allKpReadings,
          linkedEvents: gst.linkedEvents,
        };
      });
    } catch (error) {
      console.error("[DONKI] Failed to fetch geomagnetic storms:", error);
      return [];
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Fetch Function
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch space weather events from NASA DONKI
 * Uses Promise.allSettled to handle partial failures gracefully
 */
export async function fetchSpaceWeather(
  params: SpaceWeatherQueryParams = {}
): Promise<SpaceWeatherListResponse> {
  const defaultRange = getDefaultDateRange();
  const startDate = params.startDate || defaultRange.start;
  const endDate = params.endDate || defaultRange.end;
  const limit = params.limit || 100;

  // Parse event types to fetch
  const requestedTypes: SpaceWeatherEventType[] = params.eventTypes?.length
    ? params.eventTypes
    : ["FLR", "CME", "GST"];

  const warnings: string[] = [];
  const typesIncluded: SpaceWeatherEventType[] = [];
  let allEvents: AnySpaceWeatherEvent[] = [];

  // Build fetch promises for requested types
  const fetchPromises: Promise<{
    type: SpaceWeatherEventType;
    events: AnySpaceWeatherEvent[];
  }>[] = [];

  if (requestedTypes.includes("FLR")) {
    fetchPromises.push(
      fetchSolarFlaresRaw(startDate, endDate).then((events) => ({
        type: "FLR" as const,
        events,
      }))
    );
  }

  if (requestedTypes.includes("CME")) {
    fetchPromises.push(
      fetchCMEsRaw(startDate, endDate).then((events) => ({
        type: "CME" as const,
        events,
      }))
    );
  }

  if (requestedTypes.includes("GST")) {
    fetchPromises.push(
      fetchGSTsRaw(startDate, endDate).then((events) => ({
        type: "GST" as const,
        events,
      }))
    );
  }

  // Fetch all in parallel with allSettled for partial failure handling
  const results = await Promise.allSettled(fetchPromises);

  for (const result of results) {
    if (result.status === "fulfilled") {
      const { type, events } = result.value;
      if (events.length > 0) {
        typesIncluded.push(type);
        allEvents = allEvents.concat(events);
      } else {
        // Empty result - might be no events or might be an error that returned []
        typesIncluded.push(type);
      }
    } else {
      // Promise rejected - this shouldn't happen since we catch in individual fetchers
      // but handle it anyway
      console.error("[DONKI] Unexpected promise rejection:", result.reason);
      warnings.push("Some event types could not be fetched");
    }
  }

  // Sort by startTime descending (most recent first)
  allEvents.sort((a, b) => {
    const dateA = new Date(a.startTime).getTime();
    const dateB = new Date(b.startTime).getTime();
    return dateB - dateA;
  });

  // Apply limit (DONKI doesn't support limit param, so we do it client-side)
  const limitedEvents = allEvents.slice(0, limit);

  return {
    events: limitedEvents,
    count: limitedEvents.length,
    meta: {
      dateRange: { start: startDate, end: endDate },
      typesIncluded,
      warnings: warnings.length > 0 ? warnings : undefined,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Single Event Fetch
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse event type from a DONKI event ID
 * ID format: "2024-01-15T06:30:00-FLR-001" or "2024-01-15T06:30:00-CME-001"
 */
export function parseEventType(eventId: string): SpaceWeatherEventType | null {
  if (eventId.includes("-FLR-")) return "FLR";
  if (eventId.includes("-CME-")) return "CME";
  if (eventId.includes("-GST-")) return "GST";
  return null;
}

/**
 * Parse date from a DONKI event ID
 * ID format: "2024-01-15T06:30:00-FLR-001"
 */
export function parseEventDate(eventId: string): string | null {
  // Extract date portion (YYYY-MM-DD) from the ID
  const match = eventId.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Fetch a single space weather event by ID
 *
 * Strategy:
 * 1. Parse the event type from the ID
 * 2. Extract the date from the ID
 * 3. Fetch events for a 3-day window around that date (to handle timezone edge cases)
 * 4. Find the exact event by ID
 */
export async function fetchSpaceWeatherEventById(
  eventId: string
): Promise<AnySpaceWeatherEvent | null> {
  const eventType = parseEventType(eventId);
  const eventDate = parseEventDate(eventId);

  if (!eventType || !eventDate) {
    console.warn(`[DONKI] Could not parse event ID: ${eventId}`);
    return null;
  }

  // Create a date window around the event (±1 day to handle timezone edge cases)
  const date = new Date(eventDate);
  const startDate = new Date(date);
  startDate.setDate(startDate.getDate() - 1);
  const endDate = new Date(date);
  endDate.setDate(endDate.getDate() + 1);

  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  let events: AnySpaceWeatherEvent[] = [];

  // Fetch only the relevant event type
  switch (eventType) {
    case "FLR":
      events = await fetchSolarFlaresRaw(startStr, endStr);
      break;
    case "CME":
      events = await fetchCMEsRaw(startStr, endStr);
      break;
    case "GST":
      events = await fetchGSTsRaw(startStr, endStr);
      break;
  }

  // Find the exact event by ID
  return events.find((e) => e.id === eventId) || null;
}

/**
 * Get severity for any space weather event
 */
export function getEventSeverity(event: AnySpaceWeatherEvent): SpaceWeatherSeverity {
  switch (event.eventType) {
    case "FLR":
      return getFlareClassSeverity(event.classType);
    case "CME":
      return getCMESeverity(event.speed);
    case "GST":
      return getKpSeverity(event.kpIndex);
  }
}
