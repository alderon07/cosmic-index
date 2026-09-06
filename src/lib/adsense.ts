const ADSENSE_CLIENT_ID_PATTERN = /^ca-pub-\d{16}$/;
const ADSENSE_SLOT_ID_PATTERN = /^\d{10}$/;

// Explicit editorial inventory. Catalog/search/detail screens stay ad-free,
// including sparse records and empty or failed upstream responses. Adding a
// route elsewhere must not automatically opt it into monetization.
const AD_ELIGIBLE_PATHS = new Set([
  "/",
  "/learn/comparing-exoplanets",
  "/learn/reading-space-weather",
  "/learn/understanding-asteroid-flybys",
]);

export const NO_ADS_MARKER_ATTRIBUTE = "data-no-ads";
export const NO_ADS_MARKER_SELECTOR = `[${NO_ADS_MARKER_ATTRIBUTE}]`;

export interface AdsenseConfig {
  enabled: boolean;
  clientId: string | null;
  footerSlotId: string | null;
}

type AdsenseEnvironment = Record<string, string | undefined>;

export function parseAdsenseClientId(value: string | undefined): string | null {
  return value && ADSENSE_CLIENT_ID_PATTERN.test(value) ? value : null;
}

export function parseAdsenseSlotId(value: string | undefined): string | null {
  return value && ADSENSE_SLOT_ID_PATTERN.test(value) ? value : null;
}

function parseEnabledFlag(value: string | undefined): boolean {
  return value === "true";
}

export function getAdsenseConfig(
  environment: AdsenseEnvironment = process.env
): AdsenseConfig {
  const clientId = parseAdsenseClientId(environment.GOOGLE_ADSENSE_CLIENT_ID);
  const footerSlotId = parseAdsenseSlotId(
    environment.GOOGLE_ADSENSE_FOOTER_SLOT_ID
  );

  return {
    enabled:
      parseEnabledFlag(environment.GOOGLE_ADSENSE_ENABLED) &&
      clientId !== null &&
      footerSlotId !== null,
    clientId,
    footerSlotId,
  };
}

export function isAdEligiblePath(pathname: string): boolean {
  return AD_ELIGIBLE_PATHS.has(pathname);
}

export function getAdsTxtLine(clientId: string | null | undefined): string | null {
  const parsedClientId = parseAdsenseClientId(clientId ?? undefined);
  if (!parsedClientId) return null;

  return `google.com, ${parsedClientId.slice(3)}, DIRECT, f08c47fec0942fa0`;
}
