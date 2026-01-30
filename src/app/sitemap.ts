import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  // Main static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/exoplanets`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/small-bodies`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  return staticPages;
}

// Note: Dynamic sitemaps for individual objects are available at:
// - /sitemap-exoplanets (all exoplanets)
// - /sitemap-small-bodies (NEOs and PHAs)
//
// These can be submitted to Google Search Console alongside /sitemap.xml
