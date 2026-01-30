// Site configuration - update domain here when it changes
export const SITE_CONFIG = {
  name: "Cosmic Index",
  url: "https://cosmic-index.vercel.app",
  description:
    "A retrofuturistic space encyclopedia for discovering exoplanets, host stars, asteroids, and comets.",
  ogImage: "/og-image.png",
} as const;

// Convenience export for common use
export const BASE_URL = SITE_CONFIG.url;
