import { describe, expect, it } from "bun:test";

import { formatTursoError, getTursoConfig, requiresTursoAuthToken } from "./turso-config";

describe("requiresTursoAuthToken", () => {
  it("requires a token for remote libsql URLs", () => {
    expect(requiresTursoAuthToken("libsql://cosmic-index.turso.io")).toBe(true);
  });

  it("does not require a token for local libsql URLs", () => {
    expect(requiresTursoAuthToken("libsql://localhost:8080")).toBe(false);
  });

  it("does not require a token for file URLs", () => {
    expect(requiresTursoAuthToken("file:local.db")).toBe(false);
  });
});

describe("getTursoConfig", () => {
  it("throws when the database URL is missing", () => {
    expect(() => getTursoConfig({})).toThrow("TURSO_DATABASE_URL environment variable not set");
  });

  it("throws when a remote Turso URL is configured without a token", () => {
    expect(() => getTursoConfig({ TURSO_DATABASE_URL: "libsql://cosmic-index.turso.io" })).toThrow(
      "TURSO_AUTH_TOKEN environment variable not set for remote Turso database"
    );
  });

  it("allows local file-backed development config without a token", () => {
    expect(getTursoConfig({ TURSO_DATABASE_URL: "file:local.db" })).toEqual({
      url: "file:local.db",
      authToken: undefined,
    });
  });
});

describe("formatTursoError", () => {
  it("returns a high-signal hint for auth failures", () => {
    const message = formatTursoError({
      code: "SERVER_ERROR",
      cause: { status: 401 },
    });

    expect(message).toContain("Turso authentication failed");
    expect(message).toContain("TURSO_AUTH_TOKEN");
    expect(message).toContain("TURSO_DATABASE_URL");
  });

  it("returns null for non-auth failures", () => {
    expect(formatTursoError(new Error("boom"))).toBeNull();
  });
});
