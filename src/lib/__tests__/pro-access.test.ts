import { afterEach, describe, expect, it } from "bun:test";
import { resolveProAccess } from "@/lib/pro-access";

const ENV_KEYS = [
  "PRO_PRODUCT_ENABLED",
  "PRO_BILLING_ENABLED",
  "PRO_SURFACES_ENABLED",
  "WAITLIST_ENABLED",
  "INTERNAL_ADMIN_IDS",
  "PRO_ROLLOUT_ADMIN_IDS",
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

describe("resolveProAccess", () => {
  it("keeps Pro closed for public users while exposing waitlist preview", () => {
    process.env.PRO_PRODUCT_ENABLED = "false";

    const access = resolveProAccess({ userId: "user_public", tier: "free" });

    expect(access.gate.productEnabled).toBe(false);
    expect(access.canAccessCollections).toBe(false);
    expect(access.canAccessProSurfaces).toBe(false);
    expect(access.canStartCheckout).toBe(false);
    expect(access.canManageBilling).toBe(false);
    expect(access.shouldShowWaitlist).toBe(true);
    expect(access.upgradePreviewAvailable).toBe(true);
  });

  it("lets internal admins test Pro before public launch", () => {
    process.env.PRO_PRODUCT_ENABLED = "false";
    process.env.PRO_BILLING_ENABLED = "true";
    process.env.PRO_SURFACES_ENABLED = "true";
    process.env.INTERNAL_ADMIN_IDS = "user_admin";

    const access = resolveProAccess({ userId: "user_admin", tier: "free" });

    expect(access.isInternalAdmin).toBe(true);
    expect(access.canAccessCollections).toBe(true);
    expect(access.canAccessProSurfaces).toBe(true);
    expect(access.canStartCheckout).toBe(true);
    expect(access.canManageBilling).toBe(true);
    expect(access.canAccessWaitlist).toBe(true);
    expect(access.shouldShowWaitlist).toBe(false);
  });
});
