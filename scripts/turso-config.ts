type TursoEnv = Record<string, string | undefined> & {
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
};

function getHostname(url: string): string | null {
  if (url.startsWith("file:")) {
    return null;
  }

  const normalizedUrl = url.startsWith("libsql://") ? url.replace("libsql://", "https://") : url;

  try {
    return new URL(normalizedUrl).hostname;
  } catch {
    return null;
  }
}

function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function requiresTursoAuthToken(url: string): boolean {
  const hostname = getHostname(url);
  if (!hostname) {
    return false;
  }

  return !isLocalHostname(hostname);
}

export function getTursoConfig(env: TursoEnv = process.env): { url: string; authToken?: string } {
  const url = env.TURSO_DATABASE_URL?.trim();
  const authToken = env.TURSO_AUTH_TOKEN?.trim() || undefined;

  if (!url) {
    throw new Error("TURSO_DATABASE_URL environment variable not set");
  }

  if (requiresTursoAuthToken(url) && !authToken) {
    throw new Error("TURSO_AUTH_TOKEN environment variable not set for remote Turso database");
  }

  return { url, authToken };
}

function getNestedStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  if ("status" in error && typeof error.status === "number") {
    return error.status;
  }

  if ("cause" in error) {
    return getNestedStatus(error.cause);
  }

  return undefined;
}

export function formatTursoError(error: unknown): string | null {
  if (getNestedStatus(error) !== 401) {
    return null;
  }

  return (
    "Turso authentication failed (HTTP 401). Check that TURSO_DATABASE_URL points to the " +
    "intended database and that TURSO_AUTH_TOKEN is present and still valid."
  );
}
