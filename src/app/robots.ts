import type { MetadataRoute } from "next";

const BASE_URL = "https://cosmic-index.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
    ],
    sitemap: [
      `${BASE_URL}/sitemap.xml`,
      `${BASE_URL}/sitemap-exoplanets`,
      `${BASE_URL}/sitemap-small-bodies`,
    ],
  };
}
