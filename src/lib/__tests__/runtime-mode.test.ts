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
  "LIMIT_MODE",
  "LIMIT_MODE_FORCE_ENFORCE",
  "FORCE_ENFORCE_LIMIT_MODE",
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

    const gate = getProGate();

    expect(gate.productEnabled).toBe(true);
    expect(gate.billingEnabled).toBe(false);
    expect(gate.surfacesEnabled).toBe(false);
    expect(gate.waitlistEnabled).toBe(false);
    expect(getProBillingEnabled()).toBe(false);
    expect(getProSurfacesEnabled()).toBe(false);
    expect(getWaitlistEnabled()).toBe(false);
    expect(isProFeatureEnabled("billing")).toBe(false);
    expect(isProFeatureEnabled("pro_surfaces")).toBe(false);
    expect(isProFeatureEnabled("waitlist")).toBe(false);
  });

  it("returns normalized rollout configuration from one place and retires waitlist fields", () => {
    process.env.PRO_PRODUCT_ENABLED = "yes";
    process.env.PRO_BILLING_ENABLED = "yes";
    process.env.PRO_SURFACES_ENABLED = "1";
    process.env.LIMIT_MODE = "enforce";
    process.env.LIMIT_MODE_FORCE_ENFORCE = "true";

    expect(getProGate()).toEqual({
      productEnabled: true,
      billingEnabled: true,
      surfacesEnabled: true,
      waitlistEnabled: false,
      configuredLimitMode: "enforce",
      forceEnforce: true,
      waitlistEnforceThreshold: 0,
    });
  });

  it("defaults product, billing, and surfaces to enabled when unset", () => {
    const gate = getProGate();

    expect(gate.productEnabled).toBe(true);
    expect(gate.billingEnabled).toBe(true);
    expect(gate.surfacesEnabled).toBe(true);
    expect(gate.waitlistEnabled).toBe(false);
  });
});
