import { afterEach, describe, expect, it } from "bun:test";
import { resolveLimitMode } from "@/lib/feature-policy";

const ENV_KEYS = [
  "PRO_PRODUCT_ENABLED",
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

describe("resolveLimitMode", () => {
  it("enforces immediately when enforce mode is configured", async () => {
    process.env.LIMIT_MODE = "enforce";

    const result = await resolveLimitMode({ waitlistCountOverride: 24 });

    expect(result).toMatchObject({
      configuredMode: "enforce",
      effectiveMode: "enforce",
      reason: "configured",
      waitlistEnabled: false,
      threshold: 0,
      waitlistCount: null,
      reached: true,
    });
  });

  it("force override still enforces", async () => {
    process.env.LIMIT_MODE = "enforce";
    process.env.LIMIT_MODE_FORCE_ENFORCE = "true";

    const result = await resolveLimitMode();

    expect(result).toMatchObject({
      configuredMode: "enforce",
      effectiveMode: "enforce",
      reason: "force_enforce",
      waitlistEnabled: false,
      threshold: 0,
      waitlistCount: null,
      reached: true,
    });
  });
});
