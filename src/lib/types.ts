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
}

export interface SmallBodyQueryParams {
  query?: string;
  kind?: SmallBodyKind;
  neo?: boolean;
  pha?: boolean;
  orbitClass?: string;
  page?: number;
  limit?: number;
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
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type ExoplanetSortOption = z.infer<typeof ExoplanetQuerySchema>["sort"];

export const SmallBodyQuerySchema = z.object({
  query: normalizedString(100).optional(),
  kind: z.enum(["asteroid", "comet"]).optional(),
  neo: z.coerce.boolean().optional(),
  pha: z.coerce.boolean().optional(),
  orbitClass: normalizedString(10).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const StarQuerySchema = z.object({
  query: normalizedString(128).optional(),
  spectralClass: z.enum(["O", "B", "A", "F", "G", "K", "M"]).optional(),
  minPlanets: z.coerce.number().int().min(1).max(50).optional(),
  multiPlanet: z.coerce.boolean().optional(),
  maxDistancePc: z.coerce.number().positive().max(100_000).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  sort: z.enum(["name", "distance", "vmag", "planetCount", "planetCountDesc"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
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
