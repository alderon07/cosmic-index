import { Redis } from "@upstash/redis";

// Initialize Redis client - will be null if env vars not set
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

// Rate limit configuration
export const RATE_LIMITS = {
  BROWSE: { requests: 100, windowMs: 60 * 1000 },  // 100 req/min
  DETAIL: { requests: 200, windowMs: 60 * 1000 },  // 200 req/min
  SITEMAP: { requests: 10, windowMs: 60 * 60 * 1000 },  // 10 req/hour
} as const;

// ── In-Memory Fallback Rate Limiter ─────────────────────────────────────────

const MAX_MEMORY_ENTRIES = 10_000;

interface MemoryEntry {
  timestamps: number[];
  lastAccess: number;
}

// In-memory storage for rate limiting when Redis is unavailable
const memoryStore = new Map<string, MemoryEntry>();

// LRU eviction: remove oldest entries when exceeding max size
function evictOldestEntries(): void {
  if (memoryStore.size <= MAX_MEMORY_ENTRIES) return;

  // Sort by lastAccess and remove oldest 10%
  const entries = Array.from(memoryStore.entries());
  entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);

  const toRemove = Math.ceil(memoryStore.size * 0.1);
  for (let i = 0; i < toRemove; i++) {
    memoryStore.delete(entries[i][0]);
  }
}

// In-memory sliding window rate limiter
function checkRateLimitMemory(
  identifier: string,
  type: RateLimitType
): RateLimitResult {
  const config = RATE_LIMITS[type];
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const key = `${type}:${identifier}`;

  let entry = memoryStore.get(key);

  if (!entry) {
    entry = { timestamps: [], lastAccess: now };
    memoryStore.set(key, entry);
    evictOldestEntries();
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);
  entry.lastAccess = now;

  const currentCount = entry.timestamps.length;
  const allowed = currentCount < config.requests;

  if (allowed) {
    entry.timestamps.push(now);
  }

  return {
    allowed,
    remaining: Math.max(0, config.requests - currentCount - (allowed ? 1 : 0)),
    resetTime: now + config.windowMs,
  };
}

export type RateLimitType = keyof typeof RATE_LIMITS;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

// Sliding window rate limiter using Redis with in-memory fallback
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType
): Promise<RateLimitResult> {
  const client = getRedis();
  const config = RATE_LIMITS[type];

  // If Redis not configured, use in-memory fallback
  if (!client) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[RateLimit] Redis unavailable, using in-memory fallback");
    }
    return checkRateLimitMemory(identifier, type);
  }

  const now = Date.now();
  const windowStart = now - config.windowMs;
  const key = `ratelimit:${type}:${identifier}`;

  try {
    // Use a pipeline for atomic operations
    const pipeline = client.pipeline();

    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Count requests in current window
    pipeline.zcard(key);

    // Add current request
    pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` });

    // Set expiry on the key
    pipeline.expire(key, Math.ceil(config.windowMs / 1000));

    const results = await pipeline.exec();
    const currentCount = (results[1] as number) || 0;

    const allowed = currentCount < config.requests;
    const remaining = Math.max(0, config.requests - currentCount - 1);
    const resetTime = now + config.windowMs;

    return { allowed, remaining, resetTime };
  } catch (error) {
    console.error("[RateLimit] Redis error, falling back to in-memory:", error);
    // On Redis error, fall back to in-memory rate limiting
    return checkRateLimitMemory(identifier, type);
  }
}

// Get client identifier from request headers
export function getClientIdentifier(request: Request): string {
  // Try various headers for the real IP
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to a default identifier
  return "anonymous";
}

// Create rate limit headers for response
// Includes both legacy X-RateLimit-* headers and IETF draft-standard RateLimit-* headers.
// - X-RateLimit-Reset: epoch milliseconds (legacy convention)
// - RateLimit-Reset: seconds until reset (IETF draft convention, NOT epoch)
export function getRateLimitHeaders(
  result: RateLimitResult,
  type?: RateLimitType,
): Record<string, string> {
  const config = type ? RATE_LIMITS[type] : undefined;
  const windowLimit = config?.requests ?? 100;
  const resetSeconds = Math.max(1, Math.ceil((result.resetTime - Date.now()) / 1000));
  const windowSeconds = config ? Math.ceil(config.windowMs / 1000) : 60;

  return {
    // Legacy headers (backward compat)
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.resetTime.toString(),
    // IETF draft-standard headers
    "RateLimit-Limit": windowLimit.toString(),
    "RateLimit-Remaining": result.remaining.toString(),
    "RateLimit-Reset": resetSeconds.toString(),
    "RateLimit-Policy": `${windowLimit};w=${windowSeconds}`,
  };
}
