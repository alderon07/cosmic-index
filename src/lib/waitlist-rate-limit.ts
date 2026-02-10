import crypto from "node:crypto";
import { Redis } from "@upstash/redis";
import { getClientIdentifier } from "@/lib/rate-limit";

const WAITLIST_IP_LIMIT = 5;
const WAITLIST_IP_WINDOW_SEC = 15 * 60;
const WAITLIST_EMAIL_LIMIT = 3;
const WAITLIST_EMAIL_WINDOW_SEC = 24 * 60 * 60;

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  redis = new Redis({ url, token });
  return redis;
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

interface WindowResult {
  allowed: boolean;
  retryAfterSec: number;
}

async function checkWindow(params: {
  client: Redis;
  key: string;
  limit: number;
  windowSec: number;
}): Promise<WindowResult> {
  const count = await params.client.incr(params.key);
  if (count === 1) {
    await params.client.expire(params.key, params.windowSec);
  }

  const ttl = await params.client.ttl(params.key);
  const retryAfterSec = ttl > 0 ? ttl : params.windowSec;

  return {
    allowed: count <= params.limit,
    retryAfterSec,
  };
}

export interface WaitlistRateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
  unavailable: boolean;
}

export async function checkWaitlistRateLimit(params: {
  request: Request;
  emailNormalized: string;
}): Promise<WaitlistRateLimitResult> {
  const client = getRedis();
  if (!client) {
    return { allowed: false, retryAfterSec: 60, unavailable: true };
  }

  const env = process.env.NODE_ENV ?? "development";
  const identity = getClientIdentifier(params.request);
  const ipKey = `waitlist:ip:${env}:${identity.id}`;
  const emailKey = `waitlist:email:${env}:${sha256(params.emailNormalized)}`;

  try {
    const ipWindow = await checkWindow({
      client,
      key: ipKey,
      limit: WAITLIST_IP_LIMIT,
      windowSec: WAITLIST_IP_WINDOW_SEC,
    });

    if (!ipWindow.allowed) {
      return {
        allowed: false,
        retryAfterSec: ipWindow.retryAfterSec,
        unavailable: false,
      };
    }

    const emailWindow = await checkWindow({
      client,
      key: emailKey,
      limit: WAITLIST_EMAIL_LIMIT,
      windowSec: WAITLIST_EMAIL_WINDOW_SEC,
    });

    if (!emailWindow.allowed) {
      return {
        allowed: false,
        retryAfterSec: emailWindow.retryAfterSec,
        unavailable: false,
      };
    }

    return { allowed: true, retryAfterSec: 0, unavailable: false };
  } catch (error) {
    console.error("[waitlist] rate limit check failed", error);
    return { allowed: false, retryAfterSec: 60, unavailable: true };
  }
}
