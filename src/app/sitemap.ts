import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  // Main static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
    },
    {
      url: `${BASE_URL}/exoplanets`,
    },
    {
      url: `${BASE_URL}/stars`,
    },
    {
      url: `${BASE_URL}/small-bodies`,
    },
    {
      url: `${BASE_URL}/close-approaches`,
    },
    {
      url: `${BASE_URL}/fireballs`,
    },
    {
      url: `${BASE_URL}/faq`,
    },
    {
      url: `${BASE_URL}/space-weather`,
    },
    {
      url: `${BASE_URL}/space-weather/events`,
    },
    {
      url: `${BASE_URL}/space-weather/alerts`,
    },
    {
      url: `${BASE_URL}/space-weather/solar`,
    },
    {
      url: `${BASE_URL}/space-weather/solar-wind`,
    },
    {
      url: `${BASE_URL}/space-weather/geomagnetic`,
    },
  ];

  return staticPages;
}

// Note: Dynamic sitemaps for individual objects are available at:
// - /sitemap-exoplanets (all exoplanets)
// - /sitemap-stars (all indexed stars)
// - /sitemap-small-bodies (NEOs and PHAs)
//
// These can be submitted to Google Search Console alongside /sitemap.xml
