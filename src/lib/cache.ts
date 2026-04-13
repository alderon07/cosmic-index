import { Redis } from "@upstash/redis";

// Initialize Redis client - will be null if env vars not set
let redis: Redis | null = null;
let hasWarnedBuildDisable = false;
let hasWarnedMissingConfig = false;
let redisDisabledUntil = 0;

const REDIS_FAILURE_BACKOFF_MS = 60_000;
const WARNED_CACHE_FAILURES = new Set<string>();

function isRedisTemporarilyDisabled(): boolean {
  if (redisDisabledUntil <= 0) return false;
  if (Date.now() < redisDisabledUntil) return true;

  redisDisabledUntil = 0;
  return false;
}

function warnCacheFailureOnce(operation: "get" | "set" | "delete", error: unknown): void {
  const warningKey = `${operation}:${error instanceof Error ? error.name : typeof error}`;
  if (WARNED_CACHE_FAILURES.has(warningKey)) return;
  WARNED_CACHE_FAILURES.add(warningKey);

  const suffix = error instanceof Error && error.message
    ? ` (${error.message})`
    : "";
  console.warn(
    `[cache] Redis ${operation} failed; temporarily disabling cache-backed reads/writes${suffix}.`,
  );
}

function disableRedisTemporarily(operation: "get" | "set" | "delete", error: unknown): void {
  redis = null;
  redisDisabledUntil = Date.now() + REDIS_FAILURE_BACKOFF_MS;
  warnCacheFailureOnce(operation, error);
}

function isBuildPhase(): boolean {
  return (
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build"
  );
}

function getRedis(): Redis | null {
  if (redis) return redis;

  // Skip Redis calls during static build to avoid dynamic fetch usage in prerender.
  if (isBuildPhase()) {
    if (!hasWarnedBuildDisable) {
      console.info("Upstash Redis disabled during build phase");
      hasWarnedBuildDisable = true;
    }
    return null;
  }

  if (isRedisTemporarilyDisabled()) {
    return null;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (!hasWarnedMissingConfig) {
      console.warn("Upstash Redis not configured - caching disabled");
      hasWarnedMissingConfig = true;
    }
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

// Cache TTL values in seconds
export const CACHE_TTL = {
  EXOPLANETS_BROWSE: 12 * 60 * 60,  // 12 hours
  EXOPLANETS_DETAIL: 24 * 60 * 60,  // 24 hours
  SMALL_BODIES_BROWSE: 12 * 60 * 60, // 12 hours
  SMALL_BODIES_DETAIL: 7 * 24 * 60 * 60, // 7 days
  STARS_BROWSE: 12 * 60 * 60,        // 12 hours
  STARS_DETAIL: 24 * 60 * 60,        // 24 hours
  STARS_PLANETS: 12 * 60 * 60,       // 12 hours (planets in system)
  NASA_IMAGES: 24 * 60 * 60,         // 24 hours
  NASA_IMAGES_EMPTY: 2 * 60 * 60,    // 2 hours (avoid hammering for objects with 0 images)
  CLOSE_APPROACH_LIST: 60 * 60,      // 1 hour
  CLOSE_APPROACH_UPCOMING: 30 * 60,  // 30 min for dashboard widget
  APOD: 6 * 60 * 60,                 // 6 hours (refreshes multiple times/day for freshness)
  FIREBALL_LIST: 60 * 60,            // 1 hour (data updates infrequently)
  SPACE_WEATHER: 30 * 60,            // 30 minutes (more real-time data)
  SPACE_WEATHER_DETAIL: 6 * 60 * 60, // 6 hours (events don't change after recording)
  SPACE_WEATHER_NOTIFICATIONS: 10 * 60, // 10 minutes (more volatile alert stream)
  SPACE_WEATHER_OVERVIEW: 10 * 60, // 10 minutes (server-composed dashboard snapshot)
  SPACE_WEATHER_SOLAR_SUVI: 15 * 60, // 15 minutes (quicklook imagery)
  SPACE_WEATHER_SOLAR_DRAP: 5 * 60, // 5 minutes (rapidly updating absorption model)
  SPACE_WEATHER_SOLAR_FLARE_FORECAST: 60 * 60, // 1 hour (forecast product)
  SPACE_WEATHER_GEOMAGNETIC_HP30: 30 * 60, // 30 minutes (near real-time nowcast)
  SPACE_WEATHER_GEOMAGNETIC_AE: 60 * 60, // 1 hour (quicklook/provisional feed with lag)
} as const;

// Cache key prefixes
export const CACHE_KEYS = {
  EXOPLANET_BROWSE: "exo:browse",
  EXOPLANET_DETAIL: "exo:detail",
  SMALL_BODY_BROWSE: "sb:browse",
  SMALL_BODY_DETAIL: "sb:detail",
  STARS_BROWSE: "star:browse",
  STARS_DETAIL: "star:detail",
  STARS_PLANETS: "star:planets",
  NASA_IMAGES: "img",
  CLOSE_APPROACH_LIST: "ca:list",
  CLOSE_APPROACH_UPCOMING: "ca:upcoming",
  APOD: "apod",
  FIREBALL_LIST: "fireball:list",
  SPACE_WEATHER_FLR: "sw:flr",
  SPACE_WEATHER_CME: "sw:cme",
  SPACE_WEATHER_GST: "sw:gst",
  SPACE_WEATHER_IPS: "sw:ips",
  SPACE_WEATHER_HSS: "sw:hss",
  SPACE_WEATHER_SEP: "sw:sep",
  SPACE_WEATHER_NOTIFICATIONS: "sw:notifications",
  SPACE_WEATHER_OVERVIEW: "sw:overview",
  SPACE_WEATHER_SOLAR_SUVI: "sw:solar:suvi",
  SPACE_WEATHER_SOLAR_DRAP: "sw:solar:drap",
  SPACE_WEATHER_SOLAR_FLARE_FORECAST: "sw:solar:flare-forecast",
  SPACE_WEATHER_GEOMAGNETIC_HP30: "sw:geomagnetic:hp30",
  SPACE_WEATHER_GEOMAGNETIC_AE: "sw:geomagnetic:ae",
} as const;

// Create a hash from query parameters for cache keys
export function hashParams(params: Record<string, unknown>): string {
  const sorted = Object.keys(params)
    .sort()
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== "")
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Get cached data
export async function getCached<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    const data = await client.get<T>(key);
    return data;
  } catch (error) {
    disableRedisTemporarily("get", error);
    return null;
  }
}

// Set cached data with TTL
export async function setCached<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    await client.set(key, data, { ex: ttlSeconds });
  } catch (error) {
    disableRedisTemporarily("set", error);
  }
}

// Delete cached data
export async function deleteCached(key: string): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    await client.del(key);
  } catch (error) {
    disableRedisTemporarily("delete", error);
  }
}

// Cache wrapper with fetch-on-miss pattern
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Try to get from cache first
  const cached = await getCached<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();

  // Store in cache
  await setCached(key, data, ttlSeconds);

  return data;
}

// Generate Cache-Control header value
export function getCacheControlHeader(ttlSeconds: number): string {
  return `public, s-maxage=${ttlSeconds}, stale-while-revalidate=${ttlSeconds * 2}`;
}

export function __resetCacheStateForTests(): void {
  redis = null;
  redisDisabledUntil = 0;
  hasWarnedBuildDisable = false;
  hasWarnedMissingConfig = false;
  WARNED_CACHE_FAILURES.clear();
}

export function __setRedisClientForTests(client: Redis | null): void {
  redis = client;
  redisDisabledUntil = 0;
}
