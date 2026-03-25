import type { Client } from "@libsql/client";
import {
  LimitMode,
  getProGate,
} from "@/lib/runtime-mode";
import { resolveProAccess } from "@/lib/pro-access";
import { getActiveWaitlistCount } from "@/lib/waitlist";

type LimitModeReason =
  | "configured"
  | "force_enforce"
  | "waitlist_disabled"
  | "threshold_reached"
  | "threshold_not_reached"
  | "waitlist_status_unavailable";

export interface LimitModeResolution {
  configuredMode: LimitMode;
  effectiveMode: LimitMode;
  reason: LimitModeReason;
  waitlistEnabled: boolean;
  threshold: number;
  waitlistCount: number | null;
  reached: boolean;
}

export interface LimitPolicyMetadata {
  configuredMode: LimitMode;
  effectiveMode: LimitMode;
  wouldBlock: boolean;
  waitlistEnabled: boolean;
  upgradePreviewAvailable: boolean;
}

let waitlistCountCache: { value: number; expiresAt: number } | null = null;
const WAITLIST_CACHE_TTL_MS = 60_000;

async function loadWaitlistCount(db: Client | null | undefined): Promise<number | null> {
  if (!db) return null;

  const now = Date.now();
  if (waitlistCountCache && waitlistCountCache.expiresAt > now) {
    return waitlistCountCache.value;
  }

  const count = await getActiveWaitlistCount(db);
  waitlistCountCache = { value: count, expiresAt: now + WAITLIST_CACHE_TTL_MS };
  return count;
}

export function invalidateWaitlistCountCache(): void {
  waitlistCountCache = null;
}

export function getProPolicy() {
  const gate = getProGate();

  return {
    surfacesEnabled: gate.surfacesEnabled,
    billingEnabled: gate.billingEnabled,
    showPreview: !gate.surfacesEnabled,
    canAccessAlerts: gate.surfacesEnabled,
  };
}

export async function resolveLimitMode(params?: {
  db?: Client | null;
  waitlistCountOverride?: number | null;
}): Promise<LimitModeResolution> {
  const gate = getProGate();
  const configuredMode = gate.configuredLimitMode;
  const waitlistEnabled = gate.waitlistEnabled;
  const threshold = gate.waitlistEnforceThreshold;

  if (gate.forceEnforce) {
    return {
      configuredMode,
      effectiveMode: "enforce",
      reason: "force_enforce",
      waitlistEnabled,
      threshold,
      waitlistCount: params?.waitlistCountOverride ?? null,
      reached: true,
    };
  }

  if (configuredMode !== "enforce") {
    return {
      configuredMode,
      effectiveMode: configuredMode,
      reason: "configured",
      waitlistEnabled,
      threshold,
      waitlistCount: params?.waitlistCountOverride ?? null,
      reached: false,
    };
  }

  if (!waitlistEnabled) {
    return {
      configuredMode,
      effectiveMode: "enforce",
      reason: "waitlist_disabled",
      waitlistEnabled,
      threshold,
      waitlistCount: params?.waitlistCountOverride ?? null,
      reached: true,
    };
  }

  const count =
    params?.waitlistCountOverride ??
    (await loadWaitlistCount(params?.db));

  if (count === null) {
    return {
      configuredMode,
      effectiveMode: "enforce",
      reason: "waitlist_status_unavailable",
      waitlistEnabled,
      threshold,
      waitlistCount: null,
      reached: true,
    };
  }

  const reached = count >= threshold;
  if (!reached) {
    return {
      configuredMode,
      effectiveMode: "warn",
      reason: "threshold_not_reached",
      waitlistEnabled,
      threshold,
      waitlistCount: count,
      reached: false,
    };
  }

  return {
    configuredMode,
    effectiveMode: "enforce",
    reason: "threshold_reached",
    waitlistEnabled,
    threshold,
    waitlistCount: count,
    reached,
  };
}

export function toLimitPolicyMetadata(
  mode: LimitModeResolution,
  wouldBlock: boolean
): LimitPolicyMetadata {
  return {
    configuredMode: mode.configuredMode,
    effectiveMode: mode.effectiveMode,
    wouldBlock,
    waitlistEnabled: mode.waitlistEnabled,
    upgradePreviewAvailable: resolveProAccess(null).upgradePreviewAvailable,
  };
}
