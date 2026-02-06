import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./constants";

// Object Types
export type ObjectType = "EXOPLANET" | "SMALL_BODY" | "STAR";
export type DataSource = "NASA_EXOPLANET_ARCHIVE" | "JPL_SBDB";
export type SmallBodyKind = "asteroid" | "comet";
export type SpectralClass = "O" | "B" | "A" | "F" | "G" | "K" | "M" | "Unknown";

// Key Fact Interface
export interface KeyFact {
  label: string;
  value: string;
  unit?: string;
}

// Source Link Interface
export interface SourceLink {
  label: string;
  url: string;
}

// Base Cosmic Object Interface
export interface CosmicObject {
  id: string;                    // URL-safe slug
  type: ObjectType;
  displayName: string;
  aliases: string[];
  source: DataSource;
  sourceId: string;              // Original upstream ID
  summary: string;               // Auto-generated description
  keyFacts: KeyFact[];
  links: SourceLink[];
  discoveredYear?: number;
  raw?: Record<string, unknown>; // Debug data
}

// Exoplanet-specific Interface
export interface ExoplanetData extends CosmicObject {
  type: "EXOPLANET";
  hostStar: string;
  discoveryMethod: string;
  discoveryFacility?: string;
  orbitalPeriodDays?: number;
  radiusEarth?: number;
  massEarth?: number;
  massIsEstimated?: boolean;
  distanceParsecs?: number;
  equilibriumTempK?: number;
  // Host star properties
  starsInSystem?: number;
  planetsInSystem?: number;
  spectralType?: string;
  starTempK?: number;
  starMassSolar?: number;
  starRadiusSolar?: number;
  starLuminosity?: number;
  // Coordinates
  ra?: number;
  dec?: number;
}

// Small Body-specific Interface
export interface SmallBodyData extends CosmicObject {
  type: "SMALL_BODY";
  bodyKind: SmallBodyKind;
  orbitClass: string;
  isNeo: boolean;
  isPha: boolean;
  diameterKm?: number;
  absoluteMagnitude?: number;
}

// Star-specific Interface (host stars of exoplanets)
export interface StarData extends CosmicObject {
  type: "STAR";
  hostname: string;
  spectralType?: string;
  spectralClass?: SpectralClass;

  starTempK?: number;
  starMassSolar?: number;
  starRadiusSolar?: number;
  starLuminosity?: number;          // log L☉
  metallicityFeH?: number;
  ageGyr?: number;

  distanceParsecs?: number;
  vMag?: number;
  kMag?: number;
  ra?: number;
  dec?: number;

  starsInSystem?: number;
  planetsInSystem?: number;
  planetCount: number;
}

// Union type for all cosmic objects
export type AnyCosmicObject = ExoplanetData | SmallBodyData | StarData;

// API Response Types
export interface PaginatedResponse<T> {
  objects: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export type ExoplanetListResponse = PaginatedResponse<ExoplanetData>;
export type SmallBodyListResponse = PaginatedResponse<SmallBodyData>;

// Size category type for exoplanet filtering
export type SizeCategory = "earth" | "super-earth" | "neptune" | "jupiter";

// Sort order type
export type SortOrder = "asc" | "desc";

// Query Parameters
export interface ExoplanetQueryParams {
  query?: string;
  discoveryMethod?: string;
  year?: number;
  hasRadius?: boolean;
  hasMass?: boolean;
  sizeCategory?: SizeCategory;
  habitable?: boolean;
  facility?: string;
  multiPlanet?: boolean;
  maxDistancePc?: number;
  hostStar?: string;             // Filter by host star name
  sort?: "name" | "discovered" | "distance" | "radius" | "mass";
  order?: SortOrder;
  page?: number;
  limit?: number;
  paginationMode?: "offset" | "cursor";
  cursor?: string;
}

export interface SmallBodyQueryParams {
  query?: string;
  kind?: SmallBodyKind;
  neo?: boolean;
  pha?: boolean;
  orbitClass?: string;
  page?: number;
  limit?: number;
  paginationMode?: "offset" | "cursor";
  cursor?: string;
}

export interface StarQueryParams {
  query?: string;                    // hostname search
  spectralClass?: SpectralClass;
  minPlanets?: number;               // 1, 2, 3+
  multiPlanet?: boolean;             // shorthand for minPlanets >= 2
  maxDistancePc?: number;
  page?: number;
  limit?: number;
  sort?: "name" | "distance" | "vmag" | "planetCount" | "planetCountDesc";
  order?: SortOrder;
  paginationMode?: "offset" | "cursor";
  cursor?: string;
}

// Zod Schemas for Validation

// Key Fact Schema
export const KeyFactSchema = z.object({
  label: z.string(),
  value: z.string(),
  unit: z.string().optional(),
});

// Source Link Schema
export const SourceLinkSchema = z.object({
  label: z.string(),
  url: z.string().url(),
});

// Base Cosmic Object Schema
export const CosmicObjectSchema = z.object({
  id: z.string(),
  type: z.enum(["EXOPLANET", "SMALL_BODY", "STAR"]),
  displayName: z.string(),
  aliases: z.array(z.string()),
  source: z.enum(["NASA_EXOPLANET_ARCHIVE", "JPL_SBDB"]),
  sourceId: z.string(),
  summary: z.string(),
  keyFacts: z.array(KeyFactSchema),
  links: z.array(SourceLinkSchema),
  discoveredYear: z.number().optional(),
  raw: z.record(z.string(), z.unknown()).optional(),
});

// Exoplanet Schema
export const ExoplanetDataSchema = CosmicObjectSchema.extend({
  type: z.literal("EXOPLANET"),
  hostStar: z.string(),
  discoveryMethod: z.string(),
  discoveryFacility: z.string().optional(),
  orbitalPeriodDays: z.number().optional(),
  radiusEarth: z.number().optional(),
  massEarth: z.number().optional(),
  massIsEstimated: z.boolean().optional(),
  distanceParsecs: z.number().optional(),
  equilibriumTempK: z.number().optional(),
  // Host star properties
  starsInSystem: z.number().optional(),
  planetsInSystem: z.number().optional(),
  spectralType: z.string().optional(),
  starTempK: z.number().optional(),
  starMassSolar: z.number().optional(),
  starRadiusSolar: z.number().optional(),
  starLuminosity: z.number().optional(),
  // Coordinates
  ra: z.number().optional(),
  dec: z.number().optional(),
});

// Small Body Schema
export const SmallBodyDataSchema = CosmicObjectSchema.extend({
  type: z.literal("SMALL_BODY"),
  bodyKind: z.enum(["asteroid", "comet"]),
  orbitClass: z.string(),
  isNeo: z.boolean(),
  isPha: z.boolean(),
  diameterKm: z.number().optional(),
  absoluteMagnitude: z.number().optional(),
});

// Star Schema
export const StarDataSchema = CosmicObjectSchema.extend({
  type: z.literal("STAR"),
  hostname: z.string(),
  spectralType: z.string().optional(),
  spectralClass: z.enum(["O", "B", "A", "F", "G", "K", "M", "Unknown"]).optional(),
  starTempK: z.number().optional(),
  starMassSolar: z.number().optional(),
  starRadiusSolar: z.number().optional(),
  starLuminosity: z.number().optional(),
  metallicityFeH: z.number().optional(),
  ageGyr: z.number().optional(),
  distanceParsecs: z.number().optional(),
  vMag: z.number().optional(),
  kMag: z.number().optional(),
  ra: z.number().optional(),
  dec: z.number().optional(),
  starsInSystem: z.number().optional(),
  planetsInSystem: z.number().optional(),
  planetCount: z.number(),
});

// Union schema for runtime validation (must be after individual schemas are defined)
export const AnyCosmicObjectSchema = z.discriminatedUnion("type", [
  ExoplanetDataSchema,
  SmallBodyDataSchema,
  StarDataSchema,
]);

// Query Parameter Schemas with NFKC normalization and length limits

// Helper to normalize unicode and trim/limit strings
const normalizedString = (maxLength: number) =>
  z
    .string()
    .transform((s) => s.normalize("NFKC")) // Normalize weird Unicode
    .pipe(z.string().trim().max(maxLength));

export const ExoplanetQuerySchema = z.object({
  query: normalizedString(128).optional(),
  discoveryMethod: normalizedString(64).optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
  hasRadius: z.coerce.boolean().optional(),
  hasMass: z.coerce.boolean().optional(),
  sizeCategory: z.enum(["earth", "super-earth", "neptune", "jupiter"]).optional(),
  habitable: z.coerce.boolean().optional(),
  facility: normalizedString(64).optional(),
  multiPlanet: z.coerce.boolean().optional(),
  maxDistancePc: z.coerce.number().positive().max(100_000).optional(),
  sort: z.enum(["name", "discovered", "distance", "radius", "mass"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  paginationMode: z.enum(["offset", "cursor"]).optional(),
  cursor: z.string().max(500).optional(),
});

export type ExoplanetSortOption = z.infer<typeof ExoplanetQuerySchema>["sort"];

export const SmallBodyQuerySchema = z.object({
  query: normalizedString(100).optional(),
  kind: z.enum(["asteroid", "comet"]).optional(),
  neo: z.coerce.boolean().optional(),
  pha: z.coerce.boolean().optional(),
  orbitClass: normalizedString(10).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  paginationMode: z.enum(["offset", "cursor"]).optional(),
  cursor: z.string().max(500).optional(),
});

export const StarQuerySchema = z.object({
  query: normalizedString(128).optional(),
  spectralClass: z.enum(["O", "B", "A", "F", "G", "K", "M"]).optional(),
  minPlanets: z.coerce.number().int().min(1).max(50).optional(),
  multiPlanet: z.coerce.boolean().optional(),
  maxDistancePc: z.coerce.number().positive().max(100_000).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  sort: z.enum(["name", "distance", "vmag", "planetCount", "planetCountDesc"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  paginationMode: z.enum(["offset", "cursor"]).optional(),
  cursor: z.string().max(500).optional(),
});

// NASA Exoplanet Archive Raw Response Schema
export const NASAExoplanetRawSchema = z.object({
  pl_name: z.string(),
  hostname: z.string().nullable(),
  discoverymethod: z.string().nullable(),
  disc_year: z.number().nullable(),
  disc_facility: z.string().nullable(),
  pl_orbper: z.number().nullable(),
  pl_rade: z.number().nullable(),
  pl_masse: z.number().nullable(),
  sy_dist: z.number().nullable(),
  pl_eqt: z.number().nullable(),
  // Host star properties
  sy_snum: z.number().nullable(),
  sy_pnum: z.number().nullable(),
  st_spectype: z.string().nullable(),
  st_teff: z.number().nullable(),
  st_mass: z.number().nullable(),
  st_rad: z.number().nullable(),
  st_lum: z.number().nullable(),
  // Coordinates
  ra: z.number().nullable(),
  dec: z.number().nullable(),
});

// JPL SBDB Raw Response Schema
export const JPLSmallBodyRawSchema = z.object({
  spkid: z.string().optional(),
  full_name: z.string().optional(),
  kind: z.string().optional(),
  pdes: z.string().optional(),
  name: z.string().nullable().optional(),
  neo: z.string().optional(),
  pha: z.string().optional(),
  class: z.string().optional(),
  diameter: z.string().nullable().optional(),
  H: z.string().nullable().optional(),
});

// Utility function to create URL-safe slugs using URL encoding
// This is fully reversible - decodeURIComponent() recovers the original exactly
export function createSlug(name: string): string {
  const normalized = name.normalize("NFKC").trim();
  return encodeURIComponent(normalized);
}

// Decode a slug back to the original name
export function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    // Return as-is if decoding fails (invalid encoding)
    return slug;
  }
}

// Format number with optional precision
export function formatNumber(value: number | undefined | null, precision: number = 2): string {
  if (value === undefined || value === null) return "Unknown";
  return value.toFixed(precision);
}

// Discovery methods for filtering
export const DISCOVERY_METHODS = [
  "Transit",
  "Radial Velocity",
  "Imaging",
  "Microlensing",
  "Eclipse Timing Variations",
  "Pulsar Timing",
  "Transit Timing Variations",
  "Orbital Brightness Modulation",
  "Pulsation Timing Variations",
  "Disk Kinematics",
  "Astrometry",
] as const;

// Discovery facilities for filtering (top facilities by planet count)
export const DISCOVERY_FACILITIES = [
  "Kepler",
  "TESS",
  "K2",
  "La Silla Observatory",
  "W. M. Keck Observatory",
  "Multiple Observatories",
] as const;

// Size category definitions (in Earth radii)
export const SIZE_CATEGORIES = {
  earth: { label: "Earth-sized", min: 0.5, max: 1.5 },
  "super-earth": { label: "Super-Earth", min: 1.5, max: 2.5 },
  neptune: { label: "Neptune-sized", min: 2.5, max: 10 },
  jupiter: { label: "Jupiter-sized", min: 10, max: null },
} as const;

// Track unknown discovery methods to log only once
const loggedUnknownMethods = new Set<string>();

// Normalize discovery method with soft enum - accepts unknown values but logs them
export function normalizeDiscoveryMethod(method: string): string {
  const trimmed = method.trim();
  const normalized = trimmed.toLowerCase();

  // Try to match known methods (case-insensitive)
  for (const known of DISCOVERY_METHODS) {
    if (known.toLowerCase() === normalized) {
      return known;
    }
  }

  // Unknown method - log once, then accept
  if (!loggedUnknownMethods.has(normalized)) {
    loggedUnknownMethods.add(normalized);
    console.warn(`[Exoplanet] Unknown discovery method encountered: ${trimmed}`);
  }
  return trimmed;
}

// Small body orbit classes (for display)
export const ORBIT_CLASSES = {
  // Asteroids
  AMO: "Amor",
  APO: "Apollo",
  ATE: "Aten",
  IEO: "Atira",
  MBA: "Main Belt",
  TNO: "Trans-Neptunian",
  CEN: "Centaur",
  TJN: "Jupiter Trojan",
  IMB: "Inner Main Belt",
  OMB: "Outer Main Belt",
  MCA: "Mars-Crossing",
  AST: "Asteroid",
  // Comets
  COM: "Comet",
  HTC: "Halley-type Comet",
  ETc: "Encke-type Comet",
  JFc: "Jupiter-family Comet",
  JFC: "Jupiter-family Comet",
  CTc: "Chiron-type Comet",
  PAR: "Parabolic Comet",
  HYP: "Hyperbolic Comet",
} as const;

// Orbit class codes organized by body type (for filtering)
export const ASTEROID_ORBIT_CLASSES = [
  { code: "IEO", label: "Atira" },
  { code: "ATE", label: "Aten" },
  { code: "APO", label: "Apollo" },
  { code: "AMO", label: "Amor" },
  { code: "MCA", label: "Mars-Crossing" },
  { code: "IMB", label: "Inner Main Belt" },
  { code: "MBA", label: "Main Belt" },
  { code: "OMB", label: "Outer Main Belt" },
  { code: "TJN", label: "Jupiter Trojan" },
] as const;

export const COMET_ORBIT_CLASSES = [
  { code: "JFC", label: "Jupiter-family" },
  { code: "HTC", label: "Halley-type" },
  { code: "ETc", label: "Encke-type" },
  { code: "CTc", label: "Chiron-type" },
  { code: "COM", label: "Comet" },
  { code: "PAR", label: "Parabolic" },
  { code: "HYP", label: "Hyperbolic" },
] as const;

export const SHARED_ORBIT_CLASSES = [
  { code: "CEN", label: "Centaur" },
  { code: "TNO", label: "Trans-Neptunian" },
] as const;

// Type for orbit class codes
export type OrbitClassCode = keyof typeof ORBIT_CLASSES;

// Type guards for cosmic objects
export function isExoplanet(obj: AnyCosmicObject): obj is ExoplanetData {
  return obj.type === "EXOPLANET";
}

export function isSmallBody(obj: AnyCosmicObject): obj is SmallBodyData {
  return obj.type === "SMALL_BODY";
}

export function isStar(obj: AnyCosmicObject): obj is StarData {
  return obj.type === "STAR";
}

// Spectral class descriptions and colors for UI
export const SPECTRAL_CLASS_INFO = {
  O: { label: "O", description: "Blue", tempRange: "30,000+ K", color: "#9BB0FF" },
  B: { label: "B", description: "Blue-White", tempRange: "10,000-30,000 K", color: "#AABFFF" },
  A: { label: "A", description: "White", tempRange: "7,500-10,000 K", color: "#CAD7FF" },
  F: { label: "F", description: "Yellow-White", tempRange: "6,000-7,500 K", color: "#F8F7FF" },
  G: { label: "G", description: "Yellow (Sun-like)", tempRange: "5,200-6,000 K", color: "#FFF4EA" },
  K: { label: "K", description: "Orange", tempRange: "3,700-5,200 K", color: "#FFD2A1" },
  M: { label: "M", description: "Red", tempRange: "2,400-3,700 K", color: "#FFCC6F" },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Close Approach Types (CNEOS Flyby Radar)
// ═══════════════════════════════════════════════════════════════════════════════

// Close Approach Event (NOT a CosmicObject - this is an event stream)
export interface CloseApproach {
  // Identity - use des + orbit_id + cd for uniqueness
  id: string;                      // slugified `${des}_${orbit_id}_${cd}`
  designation: string;             // e.g., "2024 YY8", "433 Eros"
  orbitId: string;                 // orbit solution ID
  fullName?: string;               // formatted full name

  // Timing - keep raw string, don't mess with timezones
  approachTimeRaw: string;         // raw `cd` string from API (e.g., "2025-Jan-01 05:24")
  timeUncertainty?: string;        // formatted uncertainty (e.g., "00:19" = ±19 min, "< 00:01")
  jd?: number;                     // Julian date (optional, for sorting precision)

  // Distance - compute via km for accuracy
  distanceAu: number;              // nominal distance (AU)
  distanceKm: number;              // = distanceAu * AU_KM
  distanceLd: number;              // = distanceKm / LD_KM
  distanceMinAu: number;           // 3-sigma minimum (AU)
  distanceMaxAu: number;           // 3-sigma maximum (AU)

  // Velocity
  relativeVelocityKmS: number;     // km/s relative to Earth
  velocityInfinityKmS?: number;    // km/s at infinity (hyperbolic excess velocity)

  // Size - separate measured vs estimated
  absoluteMagnitude: number;       // H value (brightness)
  diameterMeasured?: {             // from API (often null)
    km: number;
    sigma?: number;
  };
  diameterEstimated?: {            // computed from H + albedo range
    minKm: number;
    maxKm: number;
    albedoRange: [number, number]; // e.g., [0.05, 0.25]
  };

  // Flags - optional, only set when known
  isPha?: boolean;                 // true only if PHA filter was applied or API confirms
}

export type CloseApproachSortField = "date" | "dist" | "v-rel" | "h";

export interface CloseApproachQueryParams {
  dateMin?: string;                // default: "now"
  dateMax?: string;                // default: "+60" (60 days)
  distMaxLd?: number;              // UI uses LD → converted to AU for API
  phaOnly?: boolean;               // filter to PHAs only
  sort?: CloseApproachSortField;
  order?: SortOrder;
  limit?: number;
}

export interface CloseApproachListResponse {
  events: CloseApproach[];
  meta: {
    count: number;
    phaFilterApplied: boolean;     // so UI knows "all results are PHAs"
    queryApplied: Record<string, string>;  // debug: what we sent to CNEOS
  };
  highlights?: {                   // precomputed for UI
    closestApproach?: CloseApproach;
    fastestFlyby?: CloseApproach;
  };
}

// Zod schema for Close Approach query validation
export const CloseApproachQuerySchema = z.object({
  dateMin: z.string().max(20).optional(),
  dateMax: z.string().max(20).optional(),
  distMaxLd: z.coerce.number().positive().max(100).optional(),
  phaOnly: z.coerce.boolean().optional(),
  sort: z.enum(["date", "dist", "v-rel", "h"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// APOD Types (Astronomy Picture of the Day)
// ═══════════════════════════════════════════════════════════════════════════════

// APOD Data Interface (NOT extending CosmicObject - it's media, not a catalog object)
export interface APODData {
  date: string;           // YYYY-MM-DD
  title: string;
  explanation: string;
  imageUrl: string;
  imageUrlHd?: string;
  mediaType: "image" | "video";
  copyright?: string;
  thumbnailUrl?: string;  // For videos
}

// Zod schema for APOD API route validation
export const APODQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Fireball Types (CNEOS Atmospheric Impact Events)
// ═══════════════════════════════════════════════════════════════════════════════

// Fireball Event (NOT a CosmicObject - this is an event stream like Close Approaches)
export interface FireballEvent {
  id: string;                    // Generated: date-based slug
  date: string;                  // ISO datetime string
  dateRaw: string;               // Raw date string from API

  // Energy (always present)
  radiatedEnergyJ: number;       // Radiated energy in Joules (×10¹⁰)
  impactEnergyKt?: number;       // Impact energy in kilotons TNT (sometimes missing)

  // Location (OFTEN MISSING - not all fireballs have location data)
  latitude?: number;             // Decimal degrees (positive = N, negative = S)
  longitude?: number;            // Decimal degrees (positive = E, negative = W)
  altitudeKm?: number;           // Altitude at peak brightness

  // Velocity (OFTEN MISSING)
  velocityKmS?: number;          // Entry velocity

  // Computed flags for UI
  hasLocation: boolean;          // lat/lon both present
  hasAltitude: boolean;          // altitude present
  hasVelocity: boolean;          // velocity present
  isComplete: boolean;           // all optional fields present
}

export type FireballSortField = "date" | "energy" | "impact-e" | "vel" | "alt";

export interface FireballQueryParams {
  dateMin?: string;              // YYYY-MM-DD
  dateMax?: string;              // YYYY-MM-DD
  reqLoc?: boolean;              // Only events with lat/lon (maps to req-loc)
  reqAlt?: boolean;              // Only events with altitude (maps to req-alt)
  reqVel?: boolean;              // Only events with velocity (maps to req-vel)
  sort?: FireballSortField;
  order?: SortOrder;
  limit?: number;                // Default: 100 (most recent)
}

export interface FireballListResponse {
  events: FireballEvent[];
  count: number;
  meta: {
    filtersApplied: Record<string, string>;  // Debug: what we sent to API
  };
}

// Zod schema for Fireball query validation
export const FireballQuerySchema = z.object({
  dateMin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateMax: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reqLoc: z.coerce.boolean().optional(),
  reqAlt: z.coerce.boolean().optional(),
  reqVel: z.coerce.boolean().optional(),
  sort: z.enum(["date", "energy", "impact-e", "vel", "alt"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Space Weather Types (NASA DONKI)
// ═══════════════════════════════════════════════════════════════════════════════

export type SpaceWeatherEventType = "FLR" | "CME" | "GST";

// Severity levels matching NOAA Space Weather Scales
export type SpaceWeatherSeverity = "minor" | "moderate" | "strong" | "severe" | "extreme";

// Base interface for all space weather events
export interface SpaceWeatherEvent {
  id: string;
  eventType: SpaceWeatherEventType;
  startTime: string; // ISO datetime
  // linkedEvents from DONKI are objects with activityID, not just strings
  // Keep raw shape flexible since format varies between event types
  linkedEvents?: Array<{ activityID: string } & Record<string, unknown>>;
}

// Solar Flare
export interface SolarFlareEvent extends SpaceWeatherEvent {
  eventType: "FLR";
  peakTime?: string;
  endTime?: string;
  classType: string; // "M1.2", "X2.5", etc.
  sourceLocation?: string; // "N15W30"
  activeRegionNum?: number;
}

// Coronal Mass Ejection
export interface CMEEvent extends SpaceWeatherEvent {
  eventType: "CME";
  sourceLocation?: string;
  activeRegionNum?: number;
  speed?: number; // km/s (from analysis)
  halfAngle?: number; // degrees
  cmeType?: string; // "S", "C", "O" etc.
}

// Geomagnetic Storm
export interface GSTEvent extends SpaceWeatherEvent {
  eventType: "GST";
  kpIndex: number; // Max Kp value
  allKpReadings: Array<{
    observedTime: string;
    kpIndex: number;
    source: string;
  }>;
}

export type AnySpaceWeatherEvent = SolarFlareEvent | CMEEvent | GSTEvent;

export interface SpaceWeatherQueryParams {
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  eventTypes?: SpaceWeatherEventType[]; // Filter by type
  limit?: number;
}

export interface SpaceWeatherListResponse {
  events: AnySpaceWeatherEvent[];
  count: number;
  meta: {
    dateRange: { start: string; end: string };
    typesIncluded: SpaceWeatherEventType[];
    warnings?: string[]; // Partial failure notices (e.g., "CME endpoint unavailable")
  };
}

// Zod schema for Space Weather query validation
export const SpaceWeatherQuerySchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  eventTypes: z.string().optional(), // Comma-separated: "FLR,CME,GST"
  limit: z.coerce.number().int().min(1).max(500).default(100),
});
