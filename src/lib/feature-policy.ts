import type { Client } from "@libsql/client";
import {
  LimitMode,
  getProGate,
} from "@/lib/runtime-mode";
import { resolveProAccess } from "@/lib/pro-access";

type LimitModeReason =
  | "configured"
  | "force_enforce";

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

export function invalidateWaitlistCountCache(): void {
  // Waitlist caching is retired alongside the public waitlist flow.
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

export async function resolveLimitMode(_params?: {
  db?: Client | null;
  waitlistCountOverride?: number | null;
}): Promise<LimitModeResolution> {
  void _params;
  const gate = getProGate();
  const configuredMode = gate.configuredLimitMode;

  if (gate.forceEnforce) {
    return {
      configuredMode,
      effectiveMode: "enforce",
      reason: "force_enforce",
      waitlistEnabled: false,
      threshold: 0,
      waitlistCount: null,
      reached: true,
    };
  }

  return {
    configuredMode,
    effectiveMode: configuredMode,
    reason: "configured",
    waitlistEnabled: false,
    threshold: 0,
    waitlistCount: null,
    reached: configuredMode === "enforce",
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
