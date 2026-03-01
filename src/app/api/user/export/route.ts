import { NextRequest } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";

import { requireAuth, authErrorResponse } from "@/lib/auth";
import { getUserDb } from "@/lib/user-db";
import { isMockUserStoreEnabled } from "@/lib/runtime-mode";
import { getCollectionWithItems, listSavedObjects } from "@/lib/mock-user-store";
import { searchExoplanets } from "@/lib/exoplanet-index";
import { searchStars } from "@/lib/star-index";
import { fetchSmallBodies } from "@/lib/jpl-sbdb";
import {
  ExoplanetQuerySchema,
  SmallBodyQuerySchema,
  StarQuerySchema,
  type ExoplanetData,
  type ExoplanetQueryParams,
  type SmallBodyData,
  type SmallBodyQueryParams,
  type StarData,
  type StarQueryParams,
} from "@/lib/types";
import {
  computeFilterHash,
  decodeExportCursor,
  encodeExportCursor,
  generateExportFilename,
  type ExportCursor,
} from "@/lib/export-utils";
import { getTierLimits } from "@/lib/tier-limits";
import { resolveLimitMode, toLimitPolicyMetadata } from "@/lib/feature-policy";
import { recordLimitHitWithDedup } from "@/lib/waitlist";
import { resolveSavedObjectHref } from "@/lib/saved-object-ui";

/**
 * POST /api/user/export
 *
 * Export cosmic objects data as CSV, JSON, or NDJSON.
 */

const EXPORT_CHUNK_SIZE = 1000;
const EXPORT_TIMEOUT_MS = 45_000;
const CURSOR_EXPIRY_MS = 24 * 60 * 60 * 1000;
const WINDOW_SECONDS = 60 * 60;
const WINDOW_MS = WINDOW_SECONDS * 1000;

const EXPORT_FORMATS = ["csv", "json", "ndjson"] as const;
const EXPORT_CATEGORIES = ["exoplanets", "stars", "small-bodies", "saved-objects"] as const;
const EXPORT_PROFILES = ["basic", "research"] as const;
const EXPORT_LAYOUTS = ["wide", "relational"] as const;

type ExportCategory = (typeof EXPORT_CATEGORIES)[number];
type ExportProfile = (typeof EXPORT_PROFILES)[number];
type ExportLayout = (typeof EXPORT_LAYOUTS)[number];
type CSVField = { key: string; header: string };

const ExportSchema = z.object({
  format: z.enum(EXPORT_FORMATS),
  category: z.enum(EXPORT_CATEGORIES),
  profile: z.enum(EXPORT_PROFILES).optional(),
  layout: z.enum(EXPORT_LAYOUTS).optional(),
  includeRawPayload: z.boolean().optional(),
  queryParams: z.record(z.string(), z.unknown()).optional(),
  cursor: z.string().optional(),
});

const CSV_FIELDS_BY_PROFILE: Record<ExportProfile, Record<ExportCategory, CSVField[]>> = {
  basic: {
    exoplanets: [
      { key: "pl_name", header: "Planet Name" },
      { key: "id", header: "Export ID" },
      { key: "hostname", header: "Host Star" },
      { key: "discovery_method", header: "Discovery Method" },
      { key: "disc_year", header: "Discovery Year" },
      { key: "radius_earth", header: "Radius (Earth)" },
      { key: "mass_earth", header: "Mass (Earth)" },
      { key: "distance_parsecs", header: "Distance (pc)" },
      { key: "source_url", header: "Source URL" },
      { key: "summary", header: "Summary" },
    ],
    stars: [
      { key: "hostname", header: "Star Name" },
      { key: "id", header: "Export ID" },
      { key: "spectral_class", header: "Spectral Class" },
      { key: "planet_count", header: "Planet Count" },
      { key: "star_temp_k", header: "Temperature (K)" },
      { key: "star_mass_solar", header: "Mass (Solar)" },
      { key: "distance_parsecs", header: "Distance (pc)" },
      { key: "source_url", header: "Source URL" },
      { key: "summary", header: "Summary" },
    ],
    "small-bodies": [
      { key: "display_name", header: "Name" },
      { key: "id", header: "Export ID" },
      { key: "kind", header: "Type" },
      { key: "orbit_class", header: "Orbit Class" },
      { key: "neo", header: "Near-Earth Object" },
      { key: "pha", header: "Potentially Hazardous" },
      { key: "diameter_km", header: "Diameter (km)" },
      { key: "absolute_magnitude", header: "Absolute Magnitude (H)" },
      { key: "source_url", header: "Source URL" },
      { key: "summary", header: "Summary" },
    ],
    "saved-objects": [
      { key: "id", header: "Saved Object ID" },
      { key: "canonical_id", header: "Object ID" },
      { key: "object_type", header: "Object Type" },
      { key: "object_key", header: "Object Key" },
      { key: "object_key_decoded", header: "Object Key (Decoded)" },
      { key: "display_name", header: "Name" },
      { key: "notes", header: "Notes" },
      { key: "app_url", header: "App URL" },
      { key: "source_url", header: "Source URL" },
      { key: "saved_at_utc", header: "Saved At (UTC ISO)" },
      { key: "created_at", header: "Saved At" },
    ],
  },
  research: {
    exoplanets: [
    { key: "pl_name", header: "Planet Name" },
    { key: "id", header: "Export ID" },
    { key: "source_id", header: "Source ID" },
    { key: "hostname", header: "Host Star" },
    { key: "discovery_method", header: "Discovery Method" },
    { key: "disc_facility", header: "Discovery Facility" },
    { key: "disc_year", header: "Discovery Year" },
    { key: "orbital_period_days", header: "Orbital Period (days)" },
    { key: "radius_earth", header: "Radius (Earth)" },
    { key: "mass_earth", header: "Mass (Earth)" },
    { key: "mass_is_estimated", header: "Mass Estimated" },
    { key: "equilibrium_temp_k", header: "Equilibrium Temp (K)" },
    { key: "distance_parsecs", header: "Distance (pc)" },
    { key: "stars_in_system", header: "Stars In System" },
    { key: "planets_in_system", header: "Planets In System" },
    { key: "spectral_type", header: "Host Spectral Type" },
    { key: "star_temp_k", header: "Host Temp (K)" },
    { key: "star_mass_solar", header: "Host Mass (Solar)" },
    { key: "star_radius_solar", header: "Host Radius (Solar)" },
    { key: "star_luminosity_log", header: "Host Luminosity (log Lsun)" },
    { key: "ra_deg", header: "RA (deg)" },
    { key: "dec_deg", header: "Dec (deg)" },
    { key: "source_url", header: "Source URL" },
    { key: "summary", header: "Summary" },
  ],
    stars: [
    { key: "hostname", header: "Star Name" },
    { key: "id", header: "Export ID" },
    { key: "source_id", header: "Source ID" },
    { key: "spectral_class", header: "Spectral Class" },
    { key: "spectral_type", header: "Spectral Type" },
    { key: "stars_in_system", header: "Stars In System" },
    { key: "planets_in_system", header: "Planets In System" },
    { key: "star_temp_k", header: "Temperature (K)" },
    { key: "star_mass_solar", header: "Mass (Solar)" },
    { key: "star_radius_solar", header: "Radius (Solar)" },
    { key: "star_luminosity_log", header: "Luminosity (log Lsun)" },
    { key: "metallicity_feh", header: "Metallicity [Fe/H]" },
    { key: "age_gyr", header: "Age (Gyr)" },
    { key: "distance_parsecs", header: "Distance (pc)" },
    { key: "planet_count", header: "Planet Count" },
    { key: "vmag", header: "V Magnitude" },
    { key: "kmag", header: "K Magnitude" },
    { key: "ra_deg", header: "RA (deg)" },
    { key: "dec_deg", header: "Dec (deg)" },
    { key: "source_url", header: "Source URL" },
    { key: "summary", header: "Summary" },
  ],
    "small-bodies": [
    { key: "display_name", header: "Name" },
    { key: "id", header: "Export ID" },
    { key: "source_id", header: "Source ID" },
    { key: "kind", header: "Type" },
    { key: "orbit_class", header: "Orbit Class" },
    { key: "neo", header: "Near-Earth Object" },
    { key: "pha", header: "Potentially Hazardous" },
    { key: "diameter_km", header: "Diameter (km)" },
    { key: "absolute_magnitude", header: "Absolute Magnitude (H)" },
    { key: "source_url", header: "Source URL" },
    { key: "summary", header: "Summary" },
  ],
    "saved-objects": [
    { key: "id", header: "Saved Object ID" },
    { key: "canonical_id", header: "Object ID" },
    { key: "object_type", header: "Object Type" },
    { key: "object_key", header: "Object Key" },
    { key: "object_key_decoded", header: "Object Key (Decoded)" },
    { key: "display_name", header: "Name" },
    { key: "notes", header: "Notes" },
    { key: "app_url", header: "App URL" },
    { key: "source_url", header: "Source URL" },
    { key: "has_event_payload", header: "Has Event Payload" },
    { key: "event_id", header: "Event ID" },
    { key: "event_type", header: "Event Type" },
    { key: "event_time_utc", header: "Event Time (UTC)" },
    { key: "event_time_utc_iso", header: "Event Time (UTC ISO)" },
    { key: "event_source_location", header: "Event Source Location" },
    { key: "event_active_region_num", header: "Event Active Region" },
    { key: "event_speed_kms", header: "Event Speed (km/s)" },
    { key: "event_half_angle_deg", header: "Event Half Angle (deg)" },
    { key: "event_cme_type", header: "Event CME Type" },
    { key: "event_latitude_deg", header: "Event Latitude (deg)" },
    { key: "event_longitude_deg", header: "Event Longitude (deg)" },
    { key: "event_altitude_km", header: "Event Altitude (km)" },
    { key: "event_impact_energy_kt", header: "Event Impact Energy (kt)" },
    { key: "event_radiated_energy_j", header: "Event Radiated Energy (J)" },
    { key: "event_payload_json", header: "Event Payload (JSON)" },
    { key: "saved_at_utc", header: "Saved At (UTC ISO)" },
    { key: "created_at", header: "Saved At" },
  ],
  },
};

const RELATIONAL_OBJECT_CSV_FIELDS: CSVField[] = [
  { key: "saved_object_id", header: "Saved Object ID" },
  { key: "canonical_id", header: "Object ID" },
  { key: "object_type", header: "Object Type" },
  { key: "object_key", header: "Object Key" },
  { key: "object_key_decoded", header: "Object Key (Decoded)" },
  { key: "display_name", header: "Name" },
  { key: "notes", header: "Notes" },
  { key: "app_url", header: "App URL" },
  { key: "source_url", header: "Source URL" },
  { key: "has_event_payload", header: "Has Event Payload" },
  { key: "saved_at_utc", header: "Saved At (UTC ISO)" },
  { key: "created_at", header: "Saved At" },
];

const RELATIONAL_EVENT_CSV_FIELDS: CSVField[] = [
  { key: "saved_object_id", header: "Saved Object ID" },
  { key: "event_id", header: "Event ID" },
  { key: "event_type", header: "Event Type" },
  { key: "event_time_utc", header: "Event Time (UTC)" },
  { key: "event_time_utc_iso", header: "Event Time (UTC ISO)" },
  { key: "event_source_location", header: "Event Source Location" },
  { key: "event_active_region_num", header: "Event Active Region" },
  { key: "event_speed_kms", header: "Event Speed (km/s)" },
  { key: "event_half_angle_deg", header: "Event Half Angle (deg)" },
  { key: "event_cme_type", header: "Event CME Type" },
  { key: "event_latitude_deg", header: "Event Latitude (deg)" },
  { key: "event_longitude_deg", header: "Event Longitude (deg)" },
  { key: "event_altitude_km", header: "Event Altitude (km)" },
  { key: "event_impact_energy_kt", header: "Event Impact Energy (kt)" },
  { key: "event_radiated_energy_j", header: "Event Radiated Energy (J)" },
  { key: "event_payload_json", header: "Event Payload (JSON)" },
];

const EXPORTABLE_FILTERS: Record<string, string[]> = {
  exoplanets: [
    "query",
    "discoveryMethod",
    "year",
    "hasRadius",
    "hasMass",
    "sizeCategory",
    "habitable",
    "facility",
    "multiPlanet",
    "maxDistancePc",
    "sort",
    "order",
  ],
  stars: [
    "query",
    "spectralClass",
    "minPlanets",
    "multiPlanet",
    "maxDistancePc",
    "sort",
    "order",
  ],
  "small-bodies": ["query", "kind", "neo", "pha", "orbitClass"],
};

const mockExportUsage = new Map<string, { requestTimestamps: number[]; rowEvents: Array<{ at: number; rows: number }> }>();

function getCSVHeader(
  category: ExportCategory,
  profile: ExportProfile,
  includeRawPayload = false
): string {
  const fields = getWideCsvFields(category, profile, includeRawPayload);
  return fields.map((f) => f.header).join(",");
}

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSVRow(
  row: Record<string, unknown>,
  category: ExportCategory,
  profile: ExportProfile,
  includeRawPayload = false
): string {
  const fields = getWideCsvFields(category, profile, includeRawPayload);
  return fields.map((f) => escapeCSV(row[f.key])).join(",");
}

function getWideCsvFields(
  category: ExportCategory,
  profile: ExportProfile,
  includeRawPayload: boolean
): CSVField[] {
  const fields = CSV_FIELDS_BY_PROFILE[profile][category] || CSV_FIELDS_BY_PROFILE[profile]["saved-objects"];
  if (category === "saved-objects" && profile === "research" && !includeRawPayload) {
    return fields.filter((field) => field.key !== "event_payload_json");
  }
  return fields;
}

function toCSVWithFields(row: Record<string, unknown>, fields: CSVField[]): string {
  return fields.map((field) => escapeCSV(row[field.key])).join(",");
}

function getSourceUrl(links: Array<{ label: string; url: string }> | undefined): string | null {
  if (!links || links.length === 0) return null;
  return links[0]?.url ?? null;
}

function buildExoplanetExportRow(item: ExoplanetData, profile: ExportProfile): Record<string, unknown> {
  if (profile === "basic") {
    return {
      pl_name: item.displayName,
      id: item.id,
      hostname: item.hostStar,
      discovery_method: item.discoveryMethod,
      disc_year: item.discoveredYear ?? null,
      radius_earth: item.radiusEarth ?? null,
      mass_earth: item.massEarth ?? null,
      distance_parsecs: item.distanceParsecs ?? null,
      source_url: getSourceUrl(item.links),
      summary: item.summary,
    };
  }

  return {
    pl_name: item.displayName,
    id: item.id,
    source_id: item.sourceId,
    hostname: item.hostStar,
    discovery_method: item.discoveryMethod,
    disc_facility: item.discoveryFacility ?? null,
    disc_year: item.discoveredYear ?? null,
    orbital_period_days: item.orbitalPeriodDays ?? null,
    radius_earth: item.radiusEarth ?? null,
    mass_earth: item.massEarth ?? null,
    mass_is_estimated: item.massIsEstimated ?? false,
    equilibrium_temp_k: item.equilibriumTempK ?? null,
    distance_parsecs: item.distanceParsecs ?? null,
    stars_in_system: item.starsInSystem ?? null,
    planets_in_system: item.planetsInSystem ?? null,
    spectral_type: item.spectralType ?? null,
    star_temp_k: item.starTempK ?? null,
    star_mass_solar: item.starMassSolar ?? null,
    star_radius_solar: item.starRadiusSolar ?? null,
    star_luminosity_log: item.starLuminosity ?? null,
    ra_deg: item.ra ?? null,
    dec_deg: item.dec ?? null,
    source_url: getSourceUrl(item.links),
    summary: item.summary,
  };
}

function buildStarExportRow(item: StarData, profile: ExportProfile): Record<string, unknown> {
  if (profile === "basic") {
    return {
      hostname: item.displayName,
      id: item.id,
      spectral_class: item.spectralClass ?? null,
      planet_count: item.planetCount,
      star_temp_k: item.starTempK ?? null,
      star_mass_solar: item.starMassSolar ?? null,
      distance_parsecs: item.distanceParsecs ?? null,
      source_url: getSourceUrl(item.links),
      summary: item.summary,
    };
  }

  return {
    hostname: item.displayName,
    id: item.id,
    source_id: item.sourceId,
    spectral_class: item.spectralClass ?? null,
    spectral_type: item.spectralType ?? null,
    stars_in_system: item.starsInSystem ?? null,
    planets_in_system: item.planetsInSystem ?? null,
    star_temp_k: item.starTempK ?? null,
    star_mass_solar: item.starMassSolar ?? null,
    star_radius_solar: item.starRadiusSolar ?? null,
    star_luminosity_log: item.starLuminosity ?? null,
    metallicity_feh: item.metallicityFeH ?? null,
    age_gyr: item.ageGyr ?? null,
    distance_parsecs: item.distanceParsecs ?? null,
    planet_count: item.planetCount,
    vmag: item.vMag ?? null,
    kmag: item.kMag ?? null,
    ra_deg: item.ra ?? null,
    dec_deg: item.dec ?? null,
    source_url: getSourceUrl(item.links),
    summary: item.summary,
  };
}

function buildSmallBodyExportRow(item: SmallBodyData, profile: ExportProfile): Record<string, unknown> {
  if (profile === "basic") {
    return {
      display_name: item.displayName,
      id: item.id,
      kind: item.bodyKind,
      orbit_class: item.orbitClass,
      neo: item.isNeo,
      pha: item.isPha,
      diameter_km: item.diameterKm ?? null,
      absolute_magnitude: item.absoluteMagnitude ?? null,
      source_url: getSourceUrl(item.links),
      summary: item.summary,
    };
  }

  return {
    display_name: item.displayName,
    id: item.id,
    source_id: item.sourceId,
    kind: item.bodyKind,
    orbit_class: item.orbitClass,
    neo: item.isNeo,
    pha: item.isPha,
    diameter_km: item.diameterKm ?? null,
    absolute_magnitude: item.absoluteMagnitude ?? null,
    source_url: getSourceUrl(item.links),
    summary: item.summary,
  };
}

function splitCanonicalId(canonicalId: string): { objectType: string; objectKey: string | null } {
  const separator = canonicalId.indexOf(":");
  if (separator === -1) {
    return { objectType: "unknown", objectKey: canonicalId };
  }

  const objectType = canonicalId.slice(0, separator) || "unknown";
  const objectKey = canonicalId.slice(separator + 1) || null;
  return { objectType, objectKey };
}

function toJsonString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function decodeObjectKey(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function toIsoUtc(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)
    ? `${trimmed.replace(" ", "T")}Z`
    : trimmed;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseEventPayload(value: unknown): Record<string, unknown> | null {
  if (isRecord(value)) return value;
  if (typeof value !== "string") return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function payloadString(payload: Record<string, unknown> | null, key: string): string | null {
  if (!payload) return null;
  const value = payload[key];
  if (value === null || value === undefined) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return String(value);
}

function payloadNumber(payload: Record<string, unknown> | null, key: string): number | null {
  if (!payload) return null;
  const value = payload[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getSavedObjectSourceUrl(eventPayload: unknown): string | null {
  const payload = parseEventPayload(eventPayload);
  return (
    payloadString(payload, "sourceUrl") ??
    payloadString(payload, "source_url") ??
    payloadString(payload, "url") ??
    payloadString(payload, "link")
  );
}

function getSavedObjectAppUrl(canonicalId: string): string | null {
  const href = resolveSavedObjectHref(canonicalId);
  return href ?? null;
}

function buildSavedObjectEventFields(
  objectType: string,
  eventPayload: unknown
): Record<string, unknown> {
  const payload = parseEventPayload(eventPayload);
  const normalizedTypeFromObject =
    objectType === "cme" ||
    objectType === "flr" ||
    objectType === "gst" ||
    objectType === "ips" ||
    objectType === "hss" ||
    objectType === "sep" ||
    objectType === "fireball" ||
    objectType === "close-approach"
      ? objectType.toUpperCase()
      : null;

  return {
    event_id: payloadString(payload, "id"),
    event_type: payloadString(payload, "eventType")?.toUpperCase() ?? normalizedTypeFromObject,
    event_time_utc: payloadString(payload, "startTime") ?? payloadString(payload, "dateRaw") ?? payloadString(payload, "date"),
    event_time_utc_iso: toIsoUtc(
      payloadString(payload, "startTime") ?? payloadString(payload, "dateRaw") ?? payloadString(payload, "date")
    ),
    event_source_location: payloadString(payload, "sourceLocation"),
    event_active_region_num: payloadNumber(payload, "activeRegionNum"),
    event_speed_kms: payloadNumber(payload, "speed"),
    event_half_angle_deg: payloadNumber(payload, "halfAngle"),
    event_cme_type: payloadString(payload, "cmeType"),
    event_latitude_deg: payloadNumber(payload, "latitude"),
    event_longitude_deg: payloadNumber(payload, "longitude"),
    event_altitude_km: payloadNumber(payload, "altitudeKm"),
    event_impact_energy_kt: payloadNumber(payload, "impactEnergyKt"),
    event_radiated_energy_j: payloadNumber(payload, "radiatedEnergyJ"),
  };
}

type SavedObjectBuildOptions = {
  profile: ExportProfile;
  includeRawPayload: boolean;
};

function buildSavedObjectExportRow(input: {
  id: number | null;
  canonicalId: string;
  displayName: string;
  notes: string | null;
  eventPayload: unknown;
  createdAt: string;
}, options: SavedObjectBuildOptions): Record<string, unknown> {
  const { objectType, objectKey } = splitCanonicalId(input.canonicalId);
  const objectKeyDecoded = decodeObjectKey(objectKey);
  const appUrl = getSavedObjectAppUrl(input.canonicalId);
  const sourceUrl = getSavedObjectSourceUrl(input.eventPayload);
  const savedAtIso = toIsoUtc(input.createdAt);
  const eventPayloadJson = toJsonString(input.eventPayload);
  const hasEventPayload = eventPayloadJson !== null && eventPayloadJson.length > 0;
  const eventFields = buildSavedObjectEventFields(objectType, input.eventPayload);

  if (options.profile === "basic") {
    return {
      id: input.id,
      canonical_id: input.canonicalId,
      object_type: objectType,
      object_key: objectKey,
      object_key_decoded: objectKeyDecoded,
      display_name: input.displayName,
      notes: input.notes,
      app_url: appUrl,
      source_url: sourceUrl,
      saved_at_utc: savedAtIso,
      created_at: input.createdAt,
    };
  }

  const researchRow: Record<string, unknown> = {
    id: input.id,
    canonical_id: input.canonicalId,
    object_type: objectType,
    object_key: objectKey,
    object_key_decoded: objectKeyDecoded,
    display_name: input.displayName,
    notes: input.notes,
    app_url: appUrl,
    source_url: sourceUrl,
    has_event_payload: hasEventPayload,
    ...eventFields,
    saved_at_utc: savedAtIso,
    created_at: input.createdAt,
  };

  if (options.includeRawPayload) {
    researchRow.event_payload_json = eventPayloadJson;
  }

  return researchRow;
}

function buildSavedObjectRelationalRows(input: {
  id: number | null;
  canonicalId: string;
  displayName: string;
  notes: string | null;
  eventPayload: unknown;
  createdAt: string;
}, includeRawPayload: boolean): { objectRow: Record<string, unknown>; eventRow: Record<string, unknown> | null } {
  const wide = buildSavedObjectExportRow(input, {
    profile: "research",
    includeRawPayload,
  });

  const objectRow: Record<string, unknown> = {
    saved_object_id: wide.id,
    canonical_id: wide.canonical_id,
    object_type: wide.object_type,
    object_key: wide.object_key,
    object_key_decoded: wide.object_key_decoded,
    display_name: wide.display_name,
    notes: wide.notes,
    app_url: wide.app_url,
    source_url: wide.source_url,
    has_event_payload: wide.has_event_payload,
    saved_at_utc: wide.saved_at_utc,
    created_at: wide.created_at,
  };

  const hasEvent = Boolean(wide.has_event_payload);
  if (!hasEvent) {
    return { objectRow, eventRow: null };
  }

  const eventRow: Record<string, unknown> = {
    saved_object_id: wide.id,
    event_id: wide.event_id,
    event_type: wide.event_type,
    event_time_utc: wide.event_time_utc,
    event_time_utc_iso: wide.event_time_utc_iso,
    event_source_location: wide.event_source_location,
    event_active_region_num: wide.event_active_region_num,
    event_speed_kms: wide.event_speed_kms,
    event_half_angle_deg: wide.event_half_angle_deg,
    event_cme_type: wide.event_cme_type,
    event_latitude_deg: wide.event_latitude_deg,
    event_longitude_deg: wide.event_longitude_deg,
    event_altitude_km: wide.event_altitude_km,
    event_impact_energy_kt: wide.event_impact_energy_kt,
    event_radiated_energy_j: wide.event_radiated_energy_j,
  };

  if (includeRawPayload) {
    eventRow.event_payload_json = wide.event_payload_json;
  }

  return { objectRow, eventRow };
}

function pickExportableFilters(
  category: "exoplanets" | "stars" | "small-bodies",
  rawParams: Record<string, unknown>,
  parsedParams: Record<string, unknown>
): Record<string, unknown> {
  const allowlist = EXPORTABLE_FILTERS[category] ?? [];
  const filters: Record<string, unknown> = {};
  for (const key of allowlist) {
    if (Object.prototype.hasOwnProperty.call(rawParams, key)) {
      filters[key] = parsedParams[key];
    }
  }
  return filters;
}

function getLimitFromRaw(rawParams: Record<string, unknown>, parsedParams: Record<string, unknown>): number | undefined {
  if (!Object.prototype.hasOwnProperty.call(rawParams, "limit")) return undefined;
  const raw = parsedParams.limit;
  if (typeof raw !== "number" || Number.isNaN(raw)) return undefined;
  return Math.max(1, Math.floor(raw));
}

function parsePositiveInt(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && /^[1-9]\d*$/.test(value.trim())) {
    const parsed = Number(value);
    if (Number.isSafeInteger(parsed)) return parsed;
  }
  return undefined;
}

type SavedObjectFilters = {
  objectType?: string;
  hasEventPayload?: boolean;
  savedAfterMs?: number;
  savedBeforeMs?: number;
};

function parseBooleanLike(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return null;
}

function parseDateFilter(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return null;
  return parsed;
}

function matchesSavedObjectFilters(
  row: {
    canonicalId: string;
    eventPayload: unknown;
    createdAt: string;
  },
  filters: SavedObjectFilters
): boolean {
  const { objectType } = splitCanonicalId(row.canonicalId);
  if (filters.objectType && objectType !== filters.objectType) {
    return false;
  }

  if (filters.hasEventPayload !== undefined) {
    const payload = toJsonString(row.eventPayload);
    const hasPayload = payload !== null && payload.trim().length > 0;
    if (hasPayload !== filters.hasEventPayload) return false;
  }

  const createdAtMs = Date.parse(
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(row.createdAt)
      ? `${row.createdAt.replace(" ", "T")}Z`
      : row.createdAt
  );
  if (filters.savedAfterMs !== undefined && (!Number.isFinite(createdAtMs) || createdAtMs < filters.savedAfterMs)) {
    return false;
  }
  if (filters.savedBeforeMs !== undefined && (!Number.isFinite(createdAtMs) || createdAtMs > filters.savedBeforeMs)) {
    return false;
  }

  return true;
}

type ZipFileEntry = { name: string; content: string };

function crc32(bytes: Uint8Array): number {
  let crc = 0 ^ -1;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i]!;
    for (let j = 0; j < 8; j += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

function buildZip(entries: ZipFileEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = encoder.encode(entry.content);
    const crc = crc32(dataBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, dataBytes.length, true);
    localView.setUint32(22, dataBytes.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localChunks.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, dataBytes.length, true);
    centralView.setUint32(24, dataBytes.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);
    centralChunks.push(centralHeader);

    offset += localHeader.length + dataBytes.length;
  }

  const centralSize = centralChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);

  const totalSize =
    localChunks.reduce((sum, chunk) => sum + chunk.length, 0) +
    centralSize +
    endRecord.length;
  const archive = new Uint8Array(totalSize);
  let cursor = 0;
  for (const chunk of localChunks) {
    archive.set(chunk, cursor);
    cursor += chunk.length;
  }
  for (const chunk of centralChunks) {
    archive.set(chunk, cursor);
    cursor += chunk.length;
  }
  archive.set(endRecord, cursor);
  return archive;
}

function getExportRateHeaders(params: {
  requestLimit: number;
  requestRemaining: number;
  rowLimit: number;
  rowRemaining: number;
}): Record<string, string> {
  return {
    "X-RateLimit-Export-Requests-Limit": params.requestLimit.toString(),
    "X-RateLimit-Export-Requests-Remaining": Math.max(0, params.requestRemaining).toString(),
    "X-RateLimit-Export-Rows-Limit": params.rowLimit.toString(),
    "X-RateLimit-Export-Rows-Remaining": Math.max(0, params.rowRemaining).toString(),
  };
}

function getLimitPolicyHeaders(params: {
  configuredMode: "shadow" | "warn" | "enforce";
  effectiveMode: "shadow" | "warn" | "enforce";
  wouldBlock: boolean;
  waitlistEnabled: boolean;
  upgradePreviewAvailable: boolean;
}): Record<string, string> {
  return {
    "X-Limit-Policy-Configured-Mode": params.configuredMode,
    "X-Limit-Policy-Effective-Mode": params.effectiveMode,
    "X-Limit-Policy-Would-Block": params.wouldBlock ? "1" : "0",
    "X-Limit-Policy-Waitlist-Enabled": params.waitlistEnabled ? "1" : "0",
    "X-Limit-Policy-Upgrade-Preview": params.upgradePreviewAvailable ? "1" : "0",
  };
}

function getMockUsage(userId: string, now: number) {
  const usage = mockExportUsage.get(userId) ?? { requestTimestamps: [], rowEvents: [] };
  usage.requestTimestamps = usage.requestTimestamps.filter((ts) => ts > now - WINDOW_MS);
  usage.rowEvents = usage.rowEvents.filter((event) => event.at > now - WINDOW_MS);
  mockExportUsage.set(userId, usage);
  const requestCount = usage.requestTimestamps.length;
  const rowsUsed = usage.rowEvents.reduce((sum, event) => sum + event.rows, 0);
  return { usage, requestCount, rowsUsed };
}

async function getDbUsage(userId: string, now: number) {
  const db = getUserDb();
  if (!db) return null;

  const startedAfter = now - WINDOW_MS;
  const requestResult = await db.execute({
    sql: `
      SELECT COUNT(*) as request_count
      FROM export_history
      WHERE user_id = ? AND started_at >= ?
    `,
    args: [userId, startedAfter],
  });
  const requestCount = Number(requestResult.rows[0]?.request_count ?? 0);

  const rowResult = await db.execute({
    sql: `
      SELECT COALESCE(SUM(exported_count), 0) as rows_used
      FROM export_history
      WHERE user_id = ?
        AND started_at >= ?
        AND status IN ('complete', 'partial_budget', 'partial_timeout')
    `,
    args: [userId, startedAfter],
  });
  const rowsUsed = Number(rowResult.rows[0]?.rows_used ?? 0);

  return { requestCount, rowsUsed };
}

async function enforceExportLimits(params: {
  userId: string;
  requestLimit: number;
  rowLimit: number;
  estimatedRows: number;
  useMockStore: boolean;
}) {
  const now = Date.now();

  if (!params.useMockStore) {
    const dbUsage = await getDbUsage(params.userId, now);
    if (!dbUsage) {
      throw new Error("LIMIT_BACKEND_UNAVAILABLE");
    }

    const requestRemaining = params.requestLimit - dbUsage.requestCount - 1;
    const rowRemaining = params.rowLimit - dbUsage.rowsUsed - params.estimatedRows;

    if (requestRemaining < 0 || rowRemaining < 0) {
      throw new Error("RATE_LIMIT_EXCEEDED");
    }

    return {
      requestRemaining,
      rowRemaining,
    };
  }

  const { usage, requestCount, rowsUsed } = getMockUsage(params.userId, now);
  const requestRemaining = params.requestLimit - requestCount - 1;
  const rowRemaining = params.rowLimit - rowsUsed - params.estimatedRows;

  if (requestRemaining < 0 || rowRemaining < 0) {
    throw new Error("RATE_LIMIT_EXCEEDED");
  }

  usage.requestTimestamps.push(now);
  usage.rowEvents.push({ at: now, rows: params.estimatedRows });

  return {
    requestRemaining,
    rowRemaining,
  };
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const baseHeaders = { "X-Request-Id": requestId };

  try {
    const user = await requireAuth();
    const tierLimits = getTierLimits(user.tier);
    const useMockStore = isMockUserStoreEnabled();
    const userDb = useMockStore ? null : getUserDb();
    const limitMode = await resolveLimitMode({ db: userDb });
    const withLimitPolicy = (wouldBlock: boolean) =>
      toLimitPolicyMetadata(limitMode, wouldBlock);

    const body = await request.json();
    const parseResult = ExportSchema.safeParse(body);

    if (!parseResult.success) {
      return Response.json(
        {
          error: "Invalid request",
          details: parseResult.error.flatten(),
          limitPolicy: withLimitPolicy(false),
        },
        {
          status: 400,
          headers: {
            ...baseHeaders,
            ...getLimitPolicyHeaders(withLimitPolicy(false)),
          },
        }
      );
    }

    const {
      format,
      category,
      profile: requestedProfile,
      layout: requestedLayout,
      includeRawPayload: requestedIncludeRawPayload,
      queryParams = {},
      cursor,
    } = parseResult.data;
    const exportProfile: ExportProfile = requestedProfile ?? "basic";
    const exportLayout: ExportLayout = requestedLayout ?? "wide";
    const includeRawPayload = requestedIncludeRawPayload ?? false;

    if (exportLayout === "relational" && category !== "saved-objects") {
      return Response.json(
        {
          error: "invalid_layout",
          message: "Relational layout is only supported for saved-objects exports.",
          limitPolicy: withLimitPolicy(false),
        },
        {
          status: 400,
          headers: {
            ...baseHeaders,
            ...getLimitPolicyHeaders(withLimitPolicy(false)),
          },
        }
      );
    }

    if (format === "csv") {
      const hasLimit = Object.prototype.hasOwnProperty.call(queryParams, "limit");
      const rawLimit = queryParams.limit;
      const limitValue =
        typeof rawLimit === "number"
          ? rawLimit
          : typeof rawLimit === "string"
          ? Number(rawLimit)
          : undefined;
      if (
        hasLimit &&
        (limitValue === undefined ||
          Number.isNaN(limitValue) ||
          limitValue < 1 ||
          limitValue > tierLimits.CSV_MAX_ROWS)
      ) {
        return Response.json(
          {
            error: "csv_row_limit_exceeded",
            message: `CSV exports support 1-${tierLimits.CSV_MAX_ROWS} rows. Use format=json or format=ndjson for larger exports.`,
            limitPolicy: withLimitPolicy(false),
          },
          {
            status: 400,
            headers: {
              ...baseHeaders,
              ...getLimitPolicyHeaders(withLimitPolicy(false)),
            },
          }
        );
      }
    }

    let filters: Record<string, unknown> = {};
    let userLimit: number | undefined;
    let savedObjectsCollectionId: number | undefined;
    const savedObjectFilters: SavedObjectFilters = {};

    if (category === "exoplanets") {
      const result = ExoplanetQuerySchema.safeParse(queryParams);
      if (!result.success) {
        return Response.json(
          {
            error: "invalid_filters",
            message: "Invalid filters",
            details: result.error.flatten(),
            limitPolicy: withLimitPolicy(false),
          },
          {
            status: 400,
            headers: {
              ...baseHeaders,
              ...getLimitPolicyHeaders(withLimitPolicy(false)),
            },
          }
        );
      }
      filters = pickExportableFilters("exoplanets", queryParams, result.data as Record<string, unknown>);
      userLimit = getLimitFromRaw(queryParams, result.data as Record<string, unknown>);
    } else if (category === "stars") {
      const result = StarQuerySchema.safeParse(queryParams);
      if (!result.success) {
        return Response.json(
          {
            error: "invalid_filters",
            message: "Invalid filters",
            details: result.error.flatten(),
            limitPolicy: withLimitPolicy(false),
          },
          {
            status: 400,
            headers: {
              ...baseHeaders,
              ...getLimitPolicyHeaders(withLimitPolicy(false)),
            },
          }
        );
      }
      filters = pickExportableFilters("stars", queryParams, result.data as Record<string, unknown>);
      userLimit = getLimitFromRaw(queryParams, result.data as Record<string, unknown>);
    } else if (category === "small-bodies") {
      const result = SmallBodyQuerySchema.safeParse(queryParams);
      if (!result.success) {
        return Response.json(
          {
            error: "invalid_filters",
            message: "Invalid filters",
            details: result.error.flatten(),
            limitPolicy: withLimitPolicy(false),
          },
          {
            status: 400,
            headers: {
              ...baseHeaders,
              ...getLimitPolicyHeaders(withLimitPolicy(false)),
            },
          }
        );
      }
      filters = pickExportableFilters("small-bodies", queryParams, result.data as Record<string, unknown>);
      userLimit = getLimitFromRaw(queryParams, result.data as Record<string, unknown>);
    } else if (category === "saved-objects") {
      const rawLimit = queryParams.limit;
      const limitValue =
        typeof rawLimit === "number"
          ? rawLimit
          : typeof rawLimit === "string"
          ? Number(rawLimit)
          : undefined;
      if (limitValue !== undefined && !Number.isNaN(limitValue)) {
        userLimit = Math.max(1, Math.floor(limitValue));
      }

      if (Object.prototype.hasOwnProperty.call(queryParams, "collectionId")) {
        const parsedCollectionId = parsePositiveInt(queryParams.collectionId);
        if (!parsedCollectionId) {
          return Response.json(
            {
              error: "invalid_filters",
              message: "Invalid collectionId filter.",
              limitPolicy: withLimitPolicy(false),
            },
            {
              status: 400,
              headers: {
                ...baseHeaders,
                ...getLimitPolicyHeaders(withLimitPolicy(false)),
              },
            }
          );
        }
        savedObjectsCollectionId = parsedCollectionId;
        filters = { collectionId: parsedCollectionId };
      }

      if (Object.prototype.hasOwnProperty.call(queryParams, "objectType")) {
        const rawObjectType = queryParams.objectType;
        if (typeof rawObjectType !== "string" || !/^[a-z][a-z-]*$/.test(rawObjectType.trim())) {
          return Response.json(
            {
              error: "invalid_filters",
              message: "Invalid objectType filter.",
              limitPolicy: withLimitPolicy(false),
            },
            {
              status: 400,
              headers: {
                ...baseHeaders,
                ...getLimitPolicyHeaders(withLimitPolicy(false)),
              },
            }
          );
        }
        savedObjectFilters.objectType = rawObjectType.trim();
      }

      if (Object.prototype.hasOwnProperty.call(queryParams, "hasEventPayload")) {
        const parsedHasEvent = parseBooleanLike(queryParams.hasEventPayload);
        if (parsedHasEvent === null) {
          return Response.json(
            {
              error: "invalid_filters",
              message: "Invalid hasEventPayload filter.",
              limitPolicy: withLimitPolicy(false),
            },
            {
              status: 400,
              headers: {
                ...baseHeaders,
                ...getLimitPolicyHeaders(withLimitPolicy(false)),
              },
            }
          );
        }
        savedObjectFilters.hasEventPayload = parsedHasEvent;
      }

      if (Object.prototype.hasOwnProperty.call(queryParams, "savedAfter")) {
        const parsedSavedAfter = parseDateFilter(queryParams.savedAfter);
        if (parsedSavedAfter === null) {
          return Response.json(
            {
              error: "invalid_filters",
              message: "Invalid savedAfter filter.",
              limitPolicy: withLimitPolicy(false),
            },
            {
              status: 400,
              headers: {
                ...baseHeaders,
                ...getLimitPolicyHeaders(withLimitPolicy(false)),
              },
            }
          );
        }
        savedObjectFilters.savedAfterMs = parsedSavedAfter;
      }

      if (Object.prototype.hasOwnProperty.call(queryParams, "savedBefore")) {
        const parsedSavedBefore = parseDateFilter(queryParams.savedBefore);
        if (parsedSavedBefore === null) {
          return Response.json(
            {
              error: "invalid_filters",
              message: "Invalid savedBefore filter.",
              limitPolicy: withLimitPolicy(false),
            },
            {
              status: 400,
              headers: {
                ...baseHeaders,
                ...getLimitPolicyHeaders(withLimitPolicy(false)),
              },
            }
          );
        }
        savedObjectFilters.savedBeforeMs = parsedSavedBefore;
      }

      if (
        savedObjectFilters.savedAfterMs !== undefined &&
        savedObjectFilters.savedBeforeMs !== undefined &&
        savedObjectFilters.savedAfterMs > savedObjectFilters.savedBeforeMs
      ) {
        return Response.json(
          {
            error: "invalid_filters",
            message: "savedAfter must be before savedBefore.",
            limitPolicy: withLimitPolicy(false),
          },
          {
            status: 400,
            headers: {
              ...baseHeaders,
              ...getLimitPolicyHeaders(withLimitPolicy(false)),
            },
          }
        );
      }

      filters = {
        ...filters,
        ...savedObjectFilters,
      };
    }

    if ((category === "saved-objects" || category === "small-bodies") && cursor) {
      return Response.json(
        {
          error: "resume_not_supported",
          message: `Resume not supported for ${category}.`,
          limitPolicy: withLimitPolicy(false),
        },
        {
          status: 400,
          headers: {
            ...baseHeaders,
            ...getLimitPolicyHeaders(withLimitPolicy(false)),
          },
        }
      );
    }

    if (category === "saved-objects" && savedObjectsCollectionId !== undefined) {
      if (useMockStore) {
        const result = getCollectionWithItems(user.userId, savedObjectsCollectionId);
        if (!result) {
          return Response.json(
            {
              error: "resource_not_found",
              message: "Resource not found.",
              limitPolicy: withLimitPolicy(false),
            },
            {
              status: 404,
              headers: {
                ...baseHeaders,
                ...getLimitPolicyHeaders(withLimitPolicy(false)),
              },
            }
          );
        }
      } else if (userDb) {
        const collectionCheck = await userDb.execute({
          sql: `
            SELECT id
            FROM collections
            WHERE id = ? AND user_id = ?
            LIMIT 1
          `,
          args: [savedObjectsCollectionId, user.userId],
        });
        if (collectionCheck.rows.length === 0) {
          return Response.json(
            {
              error: "resource_not_found",
              message: "Resource not found.",
              limitPolicy: withLimitPolicy(false),
            },
            {
              status: 404,
              headers: {
                ...baseHeaders,
                ...getLimitPolicyHeaders(withLimitPolicy(false)),
              },
            }
          );
        }
      }
    }

    const filterHash = computeFilterHash({
      ...filters,
      profile: exportProfile,
      layout: exportLayout,
      includeRawPayload,
    });
    let resumeCursor: ExportCursor | null = null;

    if (cursor) {
      resumeCursor = decodeExportCursor(cursor);
      if (!resumeCursor) {
        return Response.json(
          {
            error: "invalid_cursor_format",
            message: "Invalid cursor format.",
            limitPolicy: withLimitPolicy(false),
          },
          {
            status: 400,
            headers: {
              ...baseHeaders,
              ...getLimitPolicyHeaders(withLimitPolicy(false)),
            },
          }
        );
      }
      if (resumeCursor.expiresAt <= Date.now()) {
        return Response.json(
          {
            error: "cursor_expired",
            message: "Cursor expired, start a new export.",
            limitPolicy: withLimitPolicy(false),
          },
          {
            status: 400,
            headers: {
              ...baseHeaders,
              ...getLimitPolicyHeaders(withLimitPolicy(false)),
            },
          }
        );
      }
      if (resumeCursor.category !== category) {
        return Response.json(
          {
            error: "cursor_category_mismatch",
            message: "Cursor category mismatch.",
            limitPolicy: withLimitPolicy(false),
          },
          {
            status: 400,
            headers: {
              ...baseHeaders,
              ...getLimitPolicyHeaders(withLimitPolicy(false)),
            },
          }
        );
      }
      if (resumeCursor.filterHash !== filterHash) {
        return Response.json(
          {
            error: "cursor_filter_mismatch",
            message: "Cursor filters do not match request.",
            limitPolicy: withLimitPolicy(false),
          },
          {
            status: 400,
            headers: {
              ...baseHeaders,
              ...getLimitPolicyHeaders(withLimitPolicy(false)),
            },
          }
        );
      }
    }

    const requestedMaxRows = Math.min(userLimit ?? tierLimits.MAX_EXPORT_ROWS, tierLimits.MAX_EXPORT_ROWS);
    const maxRows = format === "csv"
      ? Math.min(requestedMaxRows, tierLimits.CSV_MAX_ROWS)
      : requestedMaxRows;
    const estimatedRows = maxRows;

    let rateLimitHeaders: Record<string, string> = {};
    let wouldBlock = false;
    try {
      const limitResult = await enforceExportLimits({
        userId: user.userId,
        requestLimit: tierLimits.EXPORT_REQUESTS_PER_HOUR,
        rowLimit: tierLimits.EXPORT_ROWS_PER_HOUR,
        estimatedRows,
        useMockStore,
      });
      rateLimitHeaders = getExportRateHeaders({
        requestLimit: tierLimits.EXPORT_REQUESTS_PER_HOUR,
        requestRemaining: limitResult.requestRemaining,
        rowLimit: tierLimits.EXPORT_ROWS_PER_HOUR,
        rowRemaining: limitResult.rowRemaining,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "UNKNOWN";
      if (message === "LIMIT_BACKEND_UNAVAILABLE") {
        return Response.json(
          {
            error: "service_unavailable",
            message: "Rate limiting unavailable.",
            retryAfter: 60,
            limitPolicy: withLimitPolicy(false),
          },
          {
            status: 503,
            headers: {
              ...baseHeaders,
              "Retry-After": "60",
              ...getLimitPolicyHeaders(withLimitPolicy(false)),
            },
          }
        );
      }
      wouldBlock = true;
      void recordLimitHitWithDedup({
        db: userDb,
        userId: user.userId,
        feature: "exports",
      });

      if (limitMode.effectiveMode === "enforce") {
        return Response.json(
          {
            error: "rate_limit_exceeded",
            retryAfter: WINDOW_SECONDS,
            limitPolicy: withLimitPolicy(true),
          },
          {
            status: 429,
            headers: {
              ...baseHeaders,
              "Retry-After": WINDOW_SECONDS.toString(),
              ...getExportRateHeaders({
                requestLimit: tierLimits.EXPORT_REQUESTS_PER_HOUR,
                requestRemaining: 0,
                rowLimit: tierLimits.EXPORT_ROWS_PER_HOUR,
                rowRemaining: 0,
              }),
              ...getLimitPolicyHeaders(withLimitPolicy(true)),
            },
          }
        );
      }

      rateLimitHeaders = getExportRateHeaders({
        requestLimit: tierLimits.EXPORT_REQUESTS_PER_HOUR,
        requestRemaining: 0,
        rowLimit: tierLimits.EXPORT_ROWS_PER_HOUR,
        rowRemaining: 0,
      });
    }

    const relationalCsvZip = category === "saved-objects" && format === "csv" && exportLayout === "relational";
    const filename = relationalCsvZip
      ? generateExportFilename(category, "zip")
      : generateExportFilename(category, format);
    const headers = {
      ...baseHeaders,
      ...rateLimitHeaders,
      ...getLimitPolicyHeaders(withLimitPolicy(wouldBlock)),
      "Content-Type":
        relationalCsvZip
          ? "application/zip"
          : format === "csv"
          ? "text/csv"
          : format === "json"
          ? "application/json"
          : "application/x-ndjson",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    };

    const db = userDb;
    const startedAt = Date.now();
    let exportId: number | null = null;

    if (!useMockStore && db) {
      try {
        const result = await db.execute({
          sql: `
            INSERT INTO export_history (request_id, user_id, category, format, status, started_at, filters_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          args: [requestId, user.userId, category, format, "started", startedAt, filterHash],
        });
        exportId = (result as { lastInsertRowid?: number }).lastInsertRowid ?? null;
      } catch {
        exportId = null;
      }
    }

    let exportedCount = 0;
    let finalStatus: "complete" | "partial_timeout" | "partial_budget" | "failed_error" = "complete";
    let finalErrorCode: string | null = null;
    let finalResumeCursor: string | null = null;
    let timeoutFired = false;

    const timeout = setTimeout(() => {
      timeoutFired = true;
    }, EXPORT_TIMEOUT_MS);

    let finalized = false;
    const finalize = async () => {
      if (finalized) return;
      finalized = true;
      clearTimeout(timeout);

      if (!useMockStore && db && exportId !== null) {
        const completedAt = Date.now();
        const durationMs = completedAt - startedAt;
        try {
          await db.execute({
            sql: `
              UPDATE export_history
              SET status = ?, exported_count = ?, completed_at = ?, duration_ms = ?, error_code = ?
              WHERE id = ?
            `,
            args: [finalStatus, exportedCount, completedAt, durationMs, finalErrorCode, exportId],
          });
        } catch {
          // Ignore logging failures.
        }
      }
    };

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        const writeNdjson = (line: string) => controller.enqueue(encoder.encode(`${line}\n`));
        const writeJsonChunk = (chunk: string) => controller.enqueue(encoder.encode(chunk));
        const relationalJson = category === "saved-objects" && exportLayout === "relational" && format === "json";
        let jsonFirstRow = true;
        let jsonOpened = false;

        const beginJson = () => {
          if (jsonOpened) return;
          jsonOpened = true;
          writeJsonChunk(
            `{"meta":${JSON.stringify({
              requestId,
              format: "json",
              schema: "v1",
              category,
              profile: exportProfile,
              layout: exportLayout,
              includeRawPayload,
            })},"data":[`
          );
        };

        const writeJsonRow = (row: Record<string, unknown>) => {
          if (!jsonOpened) beginJson();
          if (!jsonFirstRow) {
            writeJsonChunk(",");
          }
          writeJsonChunk(JSON.stringify(row));
          jsonFirstRow = false;
        };

        const endJson = (status: "complete" | "partial_timeout" | "failed_error") => {
          if (!jsonOpened) beginJson();
          writeJsonChunk(
            `],"export":${JSON.stringify({
              status,
              exported: exportedCount,
              ...(finalResumeCursor ? { resumeCursor: finalResumeCursor } : {}),
            })}}`
          );
        };

        try {
          if (format === "ndjson") {
            writeNdjson(
              JSON.stringify({
                meta: {
                  requestId,
                  format: "ndjson",
                  schema: "v1",
                  category,
                  profile: exportProfile,
                  layout: exportLayout,
                  includeRawPayload,
                },
              })
            );
          } else if (!(category === "saved-objects" && exportLayout === "relational") && format === "json") {
            beginJson();
          } else if (format === "csv" && !relationalCsvZip) {
            controller.enqueue(encoder.encode(`${getCSVHeader(category, exportProfile, includeRawPayload)}\n`));
          }

          if (category === "saved-objects") {
            const limit = maxRows;
            const savedRows: Array<{
              id: number | null;
              canonicalId: string;
              displayName: string;
              notes: string | null;
              eventPayload: unknown;
              createdAt: string;
            }> = [];

            if (useMockStore || !db) {
              const saved =
                savedObjectsCollectionId !== undefined
                  ? (getCollectionWithItems(user.userId, savedObjectsCollectionId)?.items ?? [])
                  : listSavedObjects(user.userId, 1, limit).objects;
              for (const item of saved) {
                if (timeoutFired) break;
                const candidate = {
                  id: item.id ?? null,
                  canonicalId: item.canonicalId,
                  displayName: item.displayName,
                  notes: item.notes ?? null,
                  eventPayload: item.eventPayload ?? null,
                  createdAt: item.createdAt,
                };
                if (!matchesSavedObjectFilters(candidate, savedObjectFilters)) continue;
                savedRows.push(candidate);
                exportedCount += 1;
                if (exportedCount >= limit) break;
              }
            } else {
              let offset = 0;
              while (exportedCount < limit && !timeoutFired) {
                const batchLimit = Math.min(EXPORT_CHUNK_SIZE, limit - exportedCount);
                const result =
                  savedObjectsCollectionId === undefined
                    ? await db.execute({
                        sql: `
                          SELECT id, canonical_id, display_name, notes, event_payload, created_at
                          FROM saved_objects
                          WHERE user_id = ?
                          ORDER BY created_at DESC
                          LIMIT ? OFFSET ?
                        `,
                        args: [user.userId, batchLimit, offset],
                      })
                    : await db.execute({
                        sql: `
                          SELECT so.id, so.canonical_id, so.display_name, so.notes, so.event_payload, so.created_at
                          FROM collection_items ci
                          JOIN saved_objects so ON so.id = ci.saved_object_id
                          JOIN collections c ON c.id = ci.collection_id
                          WHERE c.user_id = ? AND c.id = ?
                          ORDER BY ci.position ASC, ci.added_at DESC
                          LIMIT ? OFFSET ?
                        `,
                        args: [user.userId, savedObjectsCollectionId, batchLimit, offset],
                      });

                const rows = result.rows as Record<string, unknown>[];
                if (rows.length === 0) break;
                for (const dbRow of rows) {
                  if (timeoutFired) break;
                  const candidate = {
                    id: Number(dbRow.id ?? 0) || null,
                    canonicalId: String(dbRow.canonical_id ?? ""),
                    displayName: String(dbRow.display_name ?? ""),
                    notes: (dbRow.notes as string | null | undefined) ?? null,
                    eventPayload: dbRow.event_payload ?? null,
                    createdAt: String(dbRow.created_at ?? ""),
                  };
                  if (!matchesSavedObjectFilters(candidate, savedObjectFilters)) continue;
                  savedRows.push(candidate);
                  exportedCount += 1;
                  if (exportedCount >= limit) break;
                }

                offset += rows.length;
                if (rows.length < batchLimit) break;
              }
            }

            if (exportLayout === "relational") {
              const objectRows: Record<string, unknown>[] = [];
              const eventRows: Record<string, unknown>[] = [];
              for (const savedRow of savedRows) {
                const relational = buildSavedObjectRelationalRows(savedRow, includeRawPayload);
                objectRows.push(relational.objectRow);
                if (relational.eventRow) eventRows.push(relational.eventRow);
              }

              if (format === "csv") {
                const objectCsvFields = RELATIONAL_OBJECT_CSV_FIELDS;
                const eventCsvFields = includeRawPayload
                  ? RELATIONAL_EVENT_CSV_FIELDS
                  : RELATIONAL_EVENT_CSV_FIELDS.filter((field) => field.key !== "event_payload_json");

                const objectsCsv = [
                  objectCsvFields.map((field) => field.header).join(","),
                  ...objectRows.map((row) => toCSVWithFields(row, objectCsvFields)),
                ].join("\n");
                const eventsCsv = [
                  eventCsvFields.map((field) => field.header).join(","),
                  ...eventRows.map((row) => toCSVWithFields(row, eventCsvFields)),
                ].join("\n");

                const schemaJson = JSON.stringify(
                  {
                    schema: "v1",
                    layout: "relational",
                    tables: {
                      saved_objects: objectCsvFields.map((field) => ({ key: field.key, header: field.header })),
                      saved_events: eventCsvFields.map((field) => ({ key: field.key, header: field.header })),
                    },
                    joinKey: "saved_object_id",
                    units: {
                      event_speed_kms: "km/s",
                      event_half_angle_deg: "deg",
                      event_latitude_deg: "deg",
                      event_longitude_deg: "deg",
                      event_altitude_km: "km",
                      event_impact_energy_kt: "kt",
                      event_radiated_energy_j: "J",
                    },
                  },
                  null,
                  2
                );
                const readme = [
                  "Cosmic Index relational saved-objects export",
                  "",
                  "Files:",
                  "- saved_objects.csv: one row per saved object",
                  "- saved_events.csv: one row per saved event payload",
                  "- schema.json: columns and units",
                  "",
                  "Join key:",
                  "- saved_object_id",
                ].join("\n");

                const archive = buildZip([
                  { name: "saved_objects.csv", content: objectsCsv },
                  { name: "saved_events.csv", content: eventsCsv },
                  { name: "schema.json", content: schemaJson },
                  { name: "README.txt", content: readme },
                ]);
                controller.enqueue(archive);
              } else if (format === "json") {
                writeJsonChunk(
                  JSON.stringify({
                    meta: {
                      requestId,
                      format: "json",
                      schema: "v1",
                      category,
                      profile: exportProfile,
                      layout: exportLayout,
                      includeRawPayload,
                    },
                    data: {
                      saved_objects: objectRows,
                      saved_events: eventRows,
                    },
                    export: {
                      status: timeoutFired ? "partial_timeout" : "complete",
                      exported: exportedCount,
                    },
                  })
                );
              } else {
                for (const row of objectRows) {
                  writeNdjson(JSON.stringify({ table: "saved_objects", ...row }));
                }
                for (const row of eventRows) {
                  writeNdjson(JSON.stringify({ table: "saved_events", ...row }));
                }
              }
            } else {
              for (const savedRow of savedRows) {
                const row = buildSavedObjectExportRow(savedRow, {
                  profile: exportProfile,
                  includeRawPayload,
                });
                if (format === "csv") {
                  controller.enqueue(encoder.encode(`${toCSVRow(row, category, exportProfile, includeRawPayload)}\n`));
                } else if (format === "json") {
                  writeJsonRow(row);
                } else {
                  writeNdjson(JSON.stringify(row));
                }
              }
            }
          } else if (category === "exoplanets") {
            let cursorValue = resumeCursor?.lastId;
            let hasMore = true;

            while (hasMore && exportedCount < maxRows && !timeoutFired) {
              const limit = Math.min(EXPORT_CHUNK_SIZE, maxRows - exportedCount);
              const exoplanetParams: ExoplanetQueryParams = {
                ...(filters as ExoplanetQueryParams),
                paginationMode: "cursor",
                cursor: cursorValue,
                limit,
              };
              const result = await searchExoplanets(exoplanetParams);

              if (result.objects.length === 0) break;
              for (const item of result.objects) {
                if (timeoutFired) break;
                const row = buildExoplanetExportRow(item, exportProfile);
                if (format === "csv") {
                  controller.enqueue(encoder.encode(`${toCSVRow(row, category, exportProfile)}\n`));
                } else if (format === "json") {
                  writeJsonRow(row);
                } else {
                  writeNdjson(JSON.stringify(row));
                }
                exportedCount += 1;
                if (exportedCount >= maxRows) break;
              }

              hasMore = result.hasMore;
              cursorValue = result.nextCursor;
              if (!cursorValue) break;
            }

            if (cursorValue && (exportedCount >= maxRows || timeoutFired || hasMore)) {
              finalResumeCursor = encodeExportCursor({
                category: "exoplanets",
                lastId: cursorValue,
                filterHash,
                expiresAt: Date.now() + CURSOR_EXPIRY_MS,
              });
            }
          } else if (category === "stars") {
            let cursorValue = resumeCursor?.lastId;
            let hasMore = true;

            while (hasMore && exportedCount < maxRows && !timeoutFired) {
              const limit = Math.min(EXPORT_CHUNK_SIZE, maxRows - exportedCount);
              const starParams: StarQueryParams = {
                ...(filters as StarQueryParams),
                paginationMode: "cursor",
                cursor: cursorValue,
                limit,
              };
              const result = await searchStars(starParams);

              if (result.objects.length === 0) break;
              for (const item of result.objects) {
                if (timeoutFired) break;
                const row = buildStarExportRow(item, exportProfile);
                if (format === "csv") {
                  controller.enqueue(encoder.encode(`${toCSVRow(row, category, exportProfile)}\n`));
                } else if (format === "json") {
                  writeJsonRow(row);
                } else {
                  writeNdjson(JSON.stringify(row));
                }
                exportedCount += 1;
                if (exportedCount >= maxRows) break;
              }

              hasMore = result.hasMore;
              cursorValue = result.nextCursor;
              if (!cursorValue) break;
            }

            if (cursorValue && (exportedCount >= maxRows || timeoutFired || hasMore)) {
              finalResumeCursor = encodeExportCursor({
                category: "stars",
                lastId: cursorValue,
                filterHash,
                expiresAt: Date.now() + CURSOR_EXPIRY_MS,
              });
            }
          } else {
            let page = 1;
            let hasMore = true;

            while (hasMore && exportedCount < maxRows && !timeoutFired) {
              const limit = Math.min(EXPORT_CHUNK_SIZE, maxRows - exportedCount);
              const smallBodyParams: SmallBodyQueryParams = {
                ...(filters as SmallBodyQueryParams),
                page,
                limit,
              };
              const result = await fetchSmallBodies(smallBodyParams);

              if (result.objects.length === 0) break;
              for (const item of result.objects) {
                if (timeoutFired) break;
                const row = buildSmallBodyExportRow(item, exportProfile);
                if (format === "csv") {
                  controller.enqueue(encoder.encode(`${toCSVRow(row, category, exportProfile)}\n`));
                } else if (format === "json") {
                  writeJsonRow(row);
                } else {
                  writeNdjson(JSON.stringify(row));
                }
                exportedCount += 1;
                if (exportedCount >= maxRows) break;
              }

              hasMore = result.hasMore;
              page += 1;
            }
          }

          if (timeoutFired) {
            finalStatus = "partial_timeout";
            finalErrorCode = "timeout";
            if (format === "ndjson") {
              writeNdjson(
                JSON.stringify({
                  meta: {
                    status: "partial_timeout",
                    exported: exportedCount,
                    ...(finalResumeCursor ? { resumeCursor: finalResumeCursor } : {}),
                  },
                })
              );
            } else if (format === "json" && !relationalJson) {
              endJson("partial_timeout");
            }
          } else if (format === "ndjson") {
            writeNdjson(
              JSON.stringify({
                meta: {
                  status: "complete",
                  exported: exportedCount,
                  ...(finalResumeCursor ? { resumeCursor: finalResumeCursor } : {}),
                },
              })
            );
          } else if (format === "json" && !relationalJson) {
            endJson("complete");
          }

          controller.close();
        } catch {
          finalStatus = "failed_error";
          finalErrorCode = "unknown_error";
          if (format === "ndjson") {
            writeNdjson(
              JSON.stringify({
                meta: {
                  status: "partial_timeout",
                  exported: exportedCount,
                },
              })
            );
          } else if (format === "json" && !relationalJson) {
            endJson("failed_error");
          } else if (format === "json") {
            writeJsonChunk(
              JSON.stringify({
                meta: {
                  requestId,
                  format: "json",
                  schema: "v1",
                  category,
                  profile: exportProfile,
                  layout: exportLayout,
                  includeRawPayload,
                },
                data: {
                  saved_objects: [],
                  saved_events: [],
                },
                export: {
                  status: "failed_error",
                  exported: exportedCount,
                },
              })
            );
          }
          controller.close();
        } finally {
          await finalize();
        }
      },
      async cancel() {
        finalStatus = "failed_error";
        finalErrorCode = "abort_signal";
        await finalize();
      },
    });

    return new Response(stream, { headers });
  } catch (error) {
    return authErrorResponse(error);
  }
}
