import { Redis } from "@upstash/redis";
import net from "node:net";

// ═══════════════════════════════════════════════════════════════════════════════
// Redis Client
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// Rate Limit Configuration
// ═══════════════════════════════════════════════════════════════════════════════

export const RATE_LIMITS = {
  BROWSE: { requests: 100, windowMs: 60_000 },        // 100 req/min
  DETAIL: { requests: 200, windowMs: 60_000 },        // 200 req/min
  SITEMAP: { requests: 10, windowMs: 60 * 60_000 },   // 10 req/hour
  GLOBAL: { requests: 300, windowMs: 60_000 },         // 300 req/min across all endpoints
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

const BURST_LIMITS: Record<RateLimitType, { requests: number; windowMs: number } | null> = {
  BROWSE:  { requests: 20, windowMs: 10_000 },   // max 20 per 10s
  DETAIL:  { requests: 40, windowMs: 10_000 },   // max 40 per 10s
  SITEMAP: null,                                   // no burst limit
  GLOBAL:  { requests: 60, windowMs: 10_000 },   // max 60 per 10s globally
};

// ═══════════════════════════════════════════════════════════════════════════════
// Client Identification
// ═══════════════════════════════════════════════════════════════════════════════

export type ClientConfidence = "ip" | "fingerprint" | "unknown";

export interface ClientIdentity {
  id: string;
  confidence: ClientConfidence;
}

// Provider-specific headers gated by env vars (not header sniffing)
const TRUST_PROVIDER_HEADERS = {
  cloudflare: () => process.env.TRUST_CLOUDFLARE_HEADERS === "true",
  fly: () => process.env.TRUST_FLY_HEADERS === "true",
};

/** DJB2 hash — fast, good distribution for bucketing (not cryptographic) */
function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

/** Extract a validated IP string, or null */
function extractValidIp(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return net.isIP(trimmed) ? trimmed : null;
}

/** Get client identifier with confidence level from request headers */
export function getClientIdentifier(request: Request): ClientIdentity {
  // 1. CF-Connecting-IP (only if trusted)
  if (TRUST_PROVIDER_HEADERS.cloudflare()) {
    const ip = extractValidIp(request.headers.get("cf-connecting-ip"));
    if (ip) return { id: ip, confidence: "ip" };
  }

  // 2. Fly-Client-IP (only if trusted)
  if (TRUST_PROVIDER_HEADERS.fly()) {
    const ip = extractValidIp(request.headers.get("fly-client-ip"));
    if (ip) return { id: ip, confidence: "ip" };
  }

  // 3. x-forwarded-for (first hop, validated)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ip = extractValidIp(forwarded.split(",")[0]);
    if (ip) return { id: ip, confidence: "ip" };
  }

  // 4. x-real-ip (validated)
  const realIp = extractValidIp(request.headers.get("x-real-ip"));
  if (realIp) return { id: realIp, confidence: "ip" };

  // 5. Fingerprint from User-Agent + Accept-Language + Sec-CH-UA
  const ua = request.headers.get("user-agent") ?? "";
  const secChUa = request.headers.get("sec-ch-ua") ?? "";
  const acceptLang = request.headers.get("accept-language") ?? "";
  const fingerprintInput = `${ua}|${secChUa}|${acceptLang}`;

  if (ua || secChUa) {
    return { id: `fp:${djb2Hash(fingerprintInput)}`, confidence: "fingerprint" };
  }

  // 6. No identifying information at all
  return { id: "unknown", confidence: "unknown" };
}

// Confidence-based limit scaling divisors
const CONFIDENCE_DIVISORS: Record<ClientConfidence, number> = {
  ip: 1,
  fingerprint: 2,
  unknown: 10,
};

function effectiveLimit(limit: number, confidence: ClientConfidence): number {
  return Math.max(1, Math.floor(limit / CONFIDENCE_DIVISORS[confidence]));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Rate Limit Result
// ═══════════════════════════════════════════════════════════════════════════════

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  effectiveLimit: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Redis Key Prefix
// ═══════════════════════════════════════════════════════════════════════════════

function redisKey(type: RateLimitType, identifier: string): string {
  const env = process.env.NODE_ENV ?? "development";
  return `ratelimit:cosmic:${env}:${type}:${identifier}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Atomic Lua Script
// ═══════════════════════════════════════════════════════════════════════════════

// Lua script for atomic sliding window + burst check.
// Replaces the non-atomic pipeline — runs as a single Redis operation.
//
// KEYS[1] = rate limit key
// ARGV[1] = windowStart (ms), ARGV[2] = burstStart (ms, 0 if no burst),
// ARGV[3] = now (ms), ARGV[4] = windowLimit, ARGV[5] = burstLimit (0 if none),
// ARGV[6] = member (unique), ARGV[7] = ttl (seconds)
//
// Returns: { allowed (0/1), windowCount, burstCount }
const RATE_LIMIT_LUA = `
local key = KEYS[1]
local windowStart = tonumber(ARGV[1])
local burstStart  = tonumber(ARGV[2])
local now         = tonumber(ARGV[3])
local windowLimit = tonumber(ARGV[4])
local burstLimit  = tonumber(ARGV[5])
local member      = ARGV[6]
local ttl         = tonumber(ARGV[7])

redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)

local windowCount = redis.call('ZCARD', key)

local burstCount = 0
if burstStart > 0 then
  burstCount = redis.call('ZCOUNT', key, burstStart, '+inf')
end

local allowed = 1

if windowCount >= windowLimit then
  allowed = 0
end
if burstLimit > 0 and burstCount >= burstLimit then
  allowed = 0
end

if allowed == 1 then
  redis.call('ZADD', key, now, member)
end

redis.call('EXPIRE', key, ttl)

return { allowed, windowCount, burstCount }
`;

// Lazily initialized Lua script instance (needs Redis client).
// Uses redis.createScript() which auto-caches via EVALSHA.
let rateLimitScript: ReturnType<Redis["createScript"]> | null = null;

function getRateLimitScript(client: Redis) {
  if (!rateLimitScript) {
    rateLimitScript = client.createScript<[number, number, number]>(RATE_LIMIT_LUA);
  }
  return rateLimitScript;
}

/** Run the Lua rate limit script against Redis */
async function runRateLimitScript(
  client: Redis,
  key: string,
  args: string[],
): Promise<[number, number, number]> {
  const script = getRateLimitScript(client);
  // Script.exec() internally uses EVALSHA with auto-fallback to full script
  return script.exec([key], args) as Promise<[number, number, number]>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// In-Memory Fallback Rate Limiter
// ═══════════════════════════════════════════════════════════════════════════════

const MAX_MEMORY_ENTRIES = 10_000;

interface MemoryEntry {
  timestamps: number[];
  lastAccess: number;
}

const memoryStore = new Map<string, MemoryEntry>();

function evictOldestEntries(): void {
  if (memoryStore.size <= MAX_MEMORY_ENTRIES) return;

  const entries = Array.from(memoryStore.entries());
  entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);

  const toRemove = Math.ceil(memoryStore.size * 0.1);
  for (let i = 0; i < toRemove; i++) {
    memoryStore.delete(entries[i][0]);
  }
}

function checkRateLimitMemory(
  identifier: string,
  type: RateLimitType,
  confidence: ClientConfidence = "ip",
): RateLimitResult {
  const config = RATE_LIMITS[type];
  const burst = BURST_LIMITS[type];
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const key = `${type}:${identifier}`;

  let entry = memoryStore.get(key);
  if (!entry) {
    entry = { timestamps: [], lastAccess: now };
    memoryStore.set(key, entry);
    evictOldestEntries();
  }

  // Remove timestamps outside the main window
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);
  entry.lastAccess = now;

  const windowLim = effectiveLimit(config.requests, confidence);
  const windowCount = entry.timestamps.length;

  // Check burst window
  let burstExceeded = false;
  if (burst) {
    const burstStart = now - burst.windowMs;
    const burstLim = effectiveLimit(burst.requests, confidence);
    const burstCount = entry.timestamps.filter((ts) => ts > burstStart).length;
    burstExceeded = burstCount >= burstLim;
  }

  const allowed = windowCount < windowLim && !burstExceeded;

  if (allowed) {
    entry.timestamps.push(now);
  }

  return {
    allowed,
    remaining: Math.max(0, windowLim - windowCount - (allowed ? 1 : 0)),
    resetTime: now + config.windowMs,
    effectiveLimit: windowLim,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Rate Limit Check
// ═══════════════════════════════════════════════════════════════════════════════

export async function checkRateLimit(
  identifier: string,
  type: RateLimitType,
  confidence: ClientConfidence = "ip",
): Promise<RateLimitResult> {
  const client = getRedis();
  const config = RATE_LIMITS[type];
  const burst = BURST_LIMITS[type];

  // If Redis not configured, use in-memory fallback
  if (!client) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[RateLimit] Redis unavailable, using in-memory fallback");
    }
    return checkRateLimitMemory(identifier, type, confidence);
  }

  const now = Date.now();
  const windowStart = now - config.windowMs;
  const key = redisKey(type, identifier);
  const windowLim = effectiveLimit(config.requests, confidence);
  const burstLim = burst ? effectiveLimit(burst.requests, confidence) : 0;
  const burstStart = burst ? now - burst.windowMs : 0;
  const member = `${now}:${Math.random().toString(36).slice(2, 10)}`;
  const ttl = Math.ceil(config.windowMs / 1000);

  try {
    const [allowed, windowCount] = await runRateLimitScript(
      client,
      key,
      [
        windowStart.toString(),
        burstStart.toString(),
        now.toString(),
        windowLim.toString(),
        burstLim.toString(),
        member,
        ttl.toString(),
      ],
    );

    const isAllowed = allowed === 1;
    const remaining = isAllowed
      ? Math.max(0, windowLim - windowCount - 1)
      : 0;

    return {
      allowed: isAllowed,
      remaining,
      resetTime: now + config.windowMs,
      effectiveLimit: windowLim,
    };
  } catch (error) {
    console.error("[RateLimit] Redis error, falling back to in-memory:", error);
    return checkRateLimitMemory(identifier, type, confidence);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Rate Limit Headers
// ═══════════════════════════════════════════════════════════════════════════════

// Includes both legacy X-RateLimit-* headers and IETF draft-standard RateLimit-* headers.
// - X-RateLimit-Reset: epoch milliseconds (legacy convention)
// - RateLimit-Reset: seconds until reset (IETF draft convention, NOT epoch)
export function getRateLimitHeaders(
  result: RateLimitResult,
  type?: RateLimitType,
): Record<string, string> {
  const windowLimit = result.effectiveLimit;
  const resetSeconds = Math.max(1, Math.ceil((result.resetTime - Date.now()) / 1000));
  const config = type ? RATE_LIMITS[type] : undefined;
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
