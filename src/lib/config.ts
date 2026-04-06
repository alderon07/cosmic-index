function normalizeBaseUrl(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  return normalized.replace(/\/+$/, "");
}

const resolvedBaseUrl =
  normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ?? "https://cosmicindex.dev";

export const SITE_CONFIG = {
  name: "Cosmic Index",
  url: resolvedBaseUrl,
  description:
    "A retrofuturistic space encyclopedia for discovering exoplanets, host stars, asteroids, and comets.",
  ogImage: "/og-image.png",
} as const;

// Convenience export for common use
export const BASE_URL = SITE_CONFIG.url;
