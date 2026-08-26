import { describe, expect, test } from "bun:test";

import {
  getSentryEnvironment,
  getSentryRelease,
  getSentryTracesSampleRate,
} from "@/lib/sentry";

describe("Sentry runtime configuration", () => {
  test("samples every trace outside production and ten percent in production", () => {
    expect(getSentryTracesSampleRate("development")).toBe(1);
    expect(getSentryTracesSampleRate("test")).toBe(1);
    expect(getSentryTracesSampleRate("production")).toBe(0.1);
  });

  test("prefers a configured environment and otherwise uses the deployment environment", () => {
    expect(getSentryEnvironment(" staging ", "preview", "production")).toBe(
      "staging",
    );
    expect(getSentryEnvironment(undefined, "preview", "production")).toBe(
      "preview",
    );
    expect(getSentryEnvironment(undefined, undefined, "development")).toBe(
      "development",
    );
  });

  test("uses an explicit release before the deployment commit and ignores blank values", () => {
    expect(getSentryRelease(" release-42 ", "commit-17")).toBe("release-42");
    expect(getSentryRelease("  ", " commit-17 ")).toBe("commit-17");
    expect(getSentryRelease(undefined, undefined)).toBeUndefined();
  });
});
