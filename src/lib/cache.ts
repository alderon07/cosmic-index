import { Redis } from "@upstash/redis";

// Initialize Redis client - will be null if env vars not set
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("Upstash Redis not configured - caching disabled");
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
} as const;

// Cache key prefixes
export const CACHE_KEYS = {
  EXOPLANET_BROWSE: "exo:browse",
  EXOPLANET_DETAIL: "exo:detail",
  SMALL_BODY_BROWSE: "sb:browse",
  SMALL_BODY_DETAIL: "sb:detail",
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
    console.error("Cache get error:", error);
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
    console.error("Cache set error:", error);
  }
}

// Delete cached data
export async function deleteCached(key: string): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    await client.del(key);
  } catch (error) {
    console.error("Cache delete error:", error);
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
