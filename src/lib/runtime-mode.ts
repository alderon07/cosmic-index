export type RuntimeTier = "free" | "pro";

function envEnabled(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function envDisabled(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "0" || normalized === "false" || normalized === "no";
}

export function isClerkServerConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
  );
}

export function isClerkClientConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

/**
 * Mock auth defaults to enabled when Clerk is not configured.
 * Set COSMIC_USE_MOCK_AUTH=0/false to force unauthenticated mode instead.
 */
export function isMockAuthEnabled(): boolean {
  if (
    envEnabled(process.env.COSMIC_USE_MOCK_AUTH) ||
    envEnabled(process.env.NEXT_PUBLIC_USE_MOCK_AUTH)
  ) {
    return true;
  }
  if (
    envDisabled(process.env.COSMIC_USE_MOCK_AUTH) ||
    envDisabled(process.env.NEXT_PUBLIC_USE_MOCK_AUTH)
  ) {
    return false;
  }
  return !isClerkServerConfigured();
}

/**
 * Client-side equivalent. Uses NEXT_PUBLIC_USE_MOCK_AUTH override.
 */
export function isMockAuthClientEnabled(): boolean {
  if (envEnabled(process.env.NEXT_PUBLIC_USE_MOCK_AUTH)) return true;
  if (envDisabled(process.env.NEXT_PUBLIC_USE_MOCK_AUTH)) return false;
  return !isClerkClientConfigured();
}

export function getMockUserId(): string {
  return process.env.COSMIC_MOCK_USER_ID || process.env.NEXT_PUBLIC_MOCK_USER_ID || "mock-user";
}

export function getMockUserEmail(): string {
  return (
    process.env.COSMIC_MOCK_USER_EMAIL ||
    process.env.NEXT_PUBLIC_MOCK_USER_EMAIL ||
    "mock@cosmic-index.local"
  );
}

export function getMockUserTier(): RuntimeTier {
  const value =
    process.env.COSMIC_MOCK_USER_TIER || process.env.NEXT_PUBLIC_MOCK_USER_TIER;
  return value === "free" ? "free" : "pro";
}

export function isMockProEnabled(): boolean {
  return getMockUserTier() === "pro";
}

export function isMockUserStoreEnabled(): boolean {
  return isMockAuthEnabled() || envEnabled(process.env.COSMIC_USE_MOCK_USER_STORE);
}

export function isMockStripeEnabled(): boolean {
  if (envEnabled(process.env.COSMIC_USE_MOCK_STRIPE)) return true;
  if (envDisabled(process.env.COSMIC_USE_MOCK_STRIPE)) return false;
  return !process.env.STRIPE_SECRET_KEY;
}
