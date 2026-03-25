export type LimitMode = "shadow" | "warn" | "enforce";
export type ProFeature = "billing" | "pro_surfaces" | "waitlist";

export interface ProGate {
  productEnabled: boolean;
  billingEnabled: boolean;
  surfacesEnabled: boolean;
  waitlistEnabled: boolean;
  configuredLimitMode: LimitMode;
  forceEnforce: boolean;
  waitlistEnforceThreshold: number;
}

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

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

export function isClerkServerConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
  );
}

export function isClerkClientConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

function getServerFlag(value: string | undefined, fallback: boolean): boolean {
  if (envEnabled(value)) return true;
  if (envDisabled(value)) return false;
  return fallback;
}

export function getProGate(): ProGate {
  const productEnabled = getServerFlag(process.env.PRO_PRODUCT_ENABLED, false);

  return {
    productEnabled,
    surfacesEnabled: getServerFlag(process.env.PRO_SURFACES_ENABLED, productEnabled),
    billingEnabled: getServerFlag(process.env.PRO_BILLING_ENABLED, productEnabled),
    waitlistEnabled: getServerFlag(process.env.WAITLIST_ENABLED, !productEnabled),
    configuredLimitMode: getConfiguredLimitMode(),
    forceEnforce: getForceEnforce(),
    waitlistEnforceThreshold: getWaitlistEnforceThreshold(),
  };
}

export function getProProductEnabled(): boolean {
  return getProGate().productEnabled;
}

export function isProFeatureEnabled(feature: ProFeature): boolean {
  const gate = getProGate();

  switch (feature) {
    case "billing":
      return gate.billingEnabled;
    case "pro_surfaces":
      return gate.surfacesEnabled;
    case "waitlist":
      return gate.waitlistEnabled;
  }
}

export function getProSurfacesEnabled(): boolean {
  return getProGate().surfacesEnabled;
}

export function getProBillingEnabled(): boolean {
  return getProGate().billingEnabled;
}

export function getWaitlistEnabled(): boolean {
  return getProGate().waitlistEnabled;
}

export function getConfiguredLimitMode(): LimitMode {
  const raw = process.env.LIMIT_MODE?.trim().toLowerCase();
  if (raw === "warn") return "warn";
  if (raw === "enforce") return "enforce";
  return "shadow";
}

export function getForceEnforce(): boolean {
  return (
    envEnabled(process.env.LIMIT_MODE_FORCE_ENFORCE) ||
    envEnabled(process.env.FORCE_ENFORCE_LIMIT_MODE)
  );
}

export function getWaitlistEnforceThreshold(): number {
  return parsePositiveInt(process.env.WAITLIST_ENFORCE_THRESHOLD, 125);
}

function parseAdminIds(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getInternalAdminIds(): string[] {
  const preferred = parseAdminIds(process.env.INTERNAL_ADMIN_IDS);
  if (preferred.length > 0) return preferred;
  return parseAdminIds(process.env.PRO_ROLLOUT_ADMIN_IDS);
}

/**
 * @deprecated Prefer getInternalAdminIds().
 */
export function getProRolloutAdminIds(): string[] {
  return getInternalAdminIds();
}
