import { afterEach, describe, expect, it } from "bun:test";
import {
  getProGate,
  getProBillingEnabled,
  getProSurfacesEnabled,
  getWaitlistEnabled,
  isProFeatureEnabled,
} from "@/lib/runtime-mode";

const ENV_KEYS = [
  "PRO_PRODUCT_ENABLED",
  "PRO_SURFACES_ENABLED",
  "NEXT_PUBLIC_PRO_SURFACES_ENABLED",
  "PRO_BILLING_ENABLED",
  "NEXT_PUBLIC_PRO_BILLING_ENABLED",
  "WAITLIST_ENABLED",
  "NEXT_PUBLIC_WAITLIST_ENABLED",
  "LIMIT_MODE",
  "LIMIT_MODE_FORCE_ENFORCE",
  "FORCE_ENFORCE_LIMIT_MODE",
  "WAITLIST_ENFORCE_THRESHOLD",
] as const;

const ORIGINAL_ENV = new Map<string, string | undefined>(
  ENV_KEYS.map((key) => [key, process.env[key]])
);

function resetEnv() {
  for (const key of ENV_KEYS) {
    const original = ORIGINAL_ENV.get(key);
    if (original === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = original;
    }
  }
}

afterEach(() => {
  resetEnv();
});

describe("runtime-mode Pro gate", () => {
  it("reads Pro rollout flags from server env only", () => {
    process.env.PRO_BILLING_ENABLED = "false";
    process.env.NEXT_PUBLIC_PRO_BILLING_ENABLED = "true";
    process.env.PRO_SURFACES_ENABLED = "false";
    process.env.NEXT_PUBLIC_PRO_SURFACES_ENABLED = "true";
    delete process.env.WAITLIST_ENABLED;
    process.env.NEXT_PUBLIC_WAITLIST_ENABLED = "false";

    const gate = getProGate();

    expect(gate.productEnabled).toBe(false);
    expect(gate.billingEnabled).toBe(false);
    expect(gate.surfacesEnabled).toBe(false);
    expect(gate.waitlistEnabled).toBe(true);
    expect(getProBillingEnabled()).toBe(false);
    expect(getProSurfacesEnabled()).toBe(false);
    expect(getWaitlistEnabled()).toBe(true);
    expect(isProFeatureEnabled("billing")).toBe(false);
    expect(isProFeatureEnabled("pro_surfaces")).toBe(false);
    expect(isProFeatureEnabled("waitlist")).toBe(true);
  });

  it("returns normalized rollout configuration from one place", () => {
    process.env.PRO_PRODUCT_ENABLED = "yes";
    process.env.PRO_BILLING_ENABLED = "yes";
    process.env.PRO_SURFACES_ENABLED = "1";
    process.env.WAITLIST_ENABLED = "no";
    process.env.LIMIT_MODE = "enforce";
    process.env.LIMIT_MODE_FORCE_ENFORCE = "true";
    process.env.WAITLIST_ENFORCE_THRESHOLD = "250";

    expect(getProGate()).toEqual({
      productEnabled: true,
      billingEnabled: true,
      surfacesEnabled: true,
      waitlistEnabled: false,
      configuredLimitMode: "enforce",
      forceEnforce: true,
      waitlistEnforceThreshold: 250,
    });
  });
});
