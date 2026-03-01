import type { Client } from "@libsql/client";
import {
  LimitMode,
  getConfiguredLimitMode,
  getForceEnforce,
  getProBillingEnabled,
  getProSurfacesEnabled,
  getWaitlistEnabled,
  getWaitlistEnforceThreshold,
} from "@/lib/runtime-mode";
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
  const surfacesEnabled = getProSurfacesEnabled();
  const billingEnabled = getProBillingEnabled();

  return {
    surfacesEnabled,
    billingEnabled,
    showPreview: !surfacesEnabled,
    canAccessAlerts: surfacesEnabled,
  };
}

export async function resolveLimitMode(params?: {
  db?: Client | null;
  waitlistCountOverride?: number | null;
}): Promise<LimitModeResolution> {
  const configuredMode = getConfiguredLimitMode();
  const waitlistEnabled = getWaitlistEnabled();
  const threshold = getWaitlistEnforceThreshold();

  if (getForceEnforce()) {
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
  return {
    configuredMode,
    effectiveMode: "enforce",
    reason: reached ? "threshold_reached" : "threshold_not_reached",
    waitlistEnabled,
    threshold,
    waitlistCount: count,
    reached: true,
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
    upgradePreviewAvailable: !getProSurfacesEnabled(),
  };
}
