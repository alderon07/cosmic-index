export const DEFAULT_SENTRY_DSN =
  "https://cdea12a727d65194b2896b6f3567d8b3@o4511978954620928.ingest.us.sentry.io/4511978960977920";

function normalizeOptionalValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function getSentryTracesSampleRate(
  nodeEnvironment: string | undefined,
): number {
  return nodeEnvironment === "production" ? 0.1 : 1;
}

export function getSentryEnvironment(
  configuredEnvironment: string | undefined,
  deploymentEnvironment: string | undefined,
  nodeEnvironment: string | undefined,
): string | undefined {
  return (
    normalizeOptionalValue(configuredEnvironment) ??
    normalizeOptionalValue(deploymentEnvironment) ??
    normalizeOptionalValue(nodeEnvironment)
  );
}

export function getSentryRelease(
  configuredRelease: string | undefined,
  deploymentCommit: string | undefined,
): string | undefined {
  return (
    normalizeOptionalValue(configuredRelease) ??
    normalizeOptionalValue(deploymentCommit)
  );
}
