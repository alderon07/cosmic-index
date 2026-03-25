import { afterEach, describe, expect, it } from "bun:test";
import { resolveLimitMode } from "@/lib/feature-policy";

const ENV_KEYS = [
  "PRO_PRODUCT_ENABLED",
  "LIMIT_MODE",
  "LIMIT_MODE_FORCE_ENFORCE",
  "FORCE_ENFORCE_LIMIT_MODE",
  "WAITLIST_ENABLED",
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

describe("resolveLimitMode", () => {
  it("drops to warn when enforce mode is configured but waitlist threshold is not reached", async () => {
    process.env.LIMIT_MODE = "enforce";
    process.env.WAITLIST_ENABLED = "true";
    process.env.WAITLIST_ENFORCE_THRESHOLD = "125";

    const result = await resolveLimitMode({ waitlistCountOverride: 24 });

    expect(result).toMatchObject({
      configuredMode: "enforce",
      effectiveMode: "warn",
      reason: "threshold_not_reached",
      waitlistEnabled: true,
      threshold: 125,
      waitlistCount: 24,
      reached: false,
    });
  });

  it("enforces once the waitlist threshold is reached", async () => {
    process.env.LIMIT_MODE = "enforce";
    process.env.WAITLIST_ENABLED = "true";
    process.env.WAITLIST_ENFORCE_THRESHOLD = "125";

    const result = await resolveLimitMode({ waitlistCountOverride: 125 });

    expect(result).toMatchObject({
      configuredMode: "enforce",
      effectiveMode: "enforce",
      reason: "threshold_reached",
      waitlistEnabled: true,
      threshold: 125,
      waitlistCount: 125,
      reached: true,
    });
  });
});
