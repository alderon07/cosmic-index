import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./constants";

// Object Types
export type ObjectType = "EXOPLANET" | "SMALL_BODY";
export type DataSource = "NASA_EXOPLANET_ARCHIVE" | "JPL_SBDB";
export type SmallBodyKind = "asteroid" | "comet";

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
  orbitalPeriodDays?: number;
  radiusEarth?: number;
  massEarth?: number;
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

// Union type for all cosmic objects
export type AnyCosmicObject = ExoplanetData | SmallBodyData;

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

// Query Parameters
export interface ExoplanetQueryParams {
  query?: string;
  discoveryMethod?: string;
  yearFrom?: number;
  yearTo?: number;
  hasRadius?: boolean;
  hasMass?: boolean;
  page?: number;
  limit?: number;
}

export interface SmallBodyQueryParams {
  query?: string;
  kind?: SmallBodyKind;
  neo?: boolean;
  pha?: boolean;
  page?: number;
  limit?: number;
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
  type: z.enum(["EXOPLANET", "SMALL_BODY"]),
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
  orbitalPeriodDays: z.number().optional(),
  radiusEarth: z.number().optional(),
  massEarth: z.number().optional(),
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

// Union schema for runtime validation (must be after individual schemas are defined)
export const AnyCosmicObjectSchema = z.discriminatedUnion("type", [
  ExoplanetDataSchema,
  SmallBodyDataSchema,
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
  yearFrom: z.coerce.number().int().min(1900).max(2100).optional(),
  yearTo: z.coerce.number().int().min(1900).max(2100).optional(),
  hasRadius: z.coerce.boolean().optional(),
  hasMass: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const SmallBodyQuerySchema = z.object({
  query: normalizedString(100).optional(),
  kind: z.enum(["asteroid", "comet"]).optional(),
  neo: z.coerce.boolean().optional(),
  pha: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

// NASA Exoplanet Archive Raw Response Schema
export const NASAExoplanetRawSchema = z.object({
  pl_name: z.string(),
  hostname: z.string().nullable(),
  discoverymethod: z.string().nullable(),
  disc_year: z.number().nullable(),
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

// Small body orbit classes
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
  // Comets
  COM: "Comet",
  HTC: "Halley-type Comet",
  ETc: "Encke-type Comet",
  JFc: "Jupiter-family Comet",
  JFC: "Jupiter-family Comet",
  CTc: "Chiron-type Comet",
} as const;
