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
} as const;

type RateLimitType = keyof typeof RATE_LIMITS;

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

// Sliding window rate limiter using Redis
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType
): Promise<RateLimitResult> {
  const client = getRedis();
  const config = RATE_LIMITS[type];

  // If Redis not configured, allow all requests
  if (!client) {
    return { allowed: true, remaining: config.requests, resetTime: 0 };
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
    console.error("Rate limit check error:", error);
    // On error, allow the request
    return { allowed: true, remaining: config.requests, resetTime: 0 };
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
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.resetTime.toString(),
  };
}
