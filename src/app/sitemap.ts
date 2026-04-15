import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/config";
import { getIsoDate } from "@/lib/sitemap";

const STATIC_SITEMAP_LASTMOD = getIsoDate();

export default function sitemap(): MetadataRoute.Sitemap {
  // Main static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: STATIC_SITEMAP_LASTMOD,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/exoplanets`,
      lastModified: STATIC_SITEMAP_LASTMOD,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/stars`,
      lastModified: STATIC_SITEMAP_LASTMOD,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/small-bodies`,
      lastModified: STATIC_SITEMAP_LASTMOD,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/close-approaches`,
      lastModified: STATIC_SITEMAP_LASTMOD,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/fireballs`,
      lastModified: STATIC_SITEMAP_LASTMOD,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: STATIC_SITEMAP_LASTMOD,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/space-weather`,
      lastModified: STATIC_SITEMAP_LASTMOD,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/space-weather/events`,
      lastModified: STATIC_SITEMAP_LASTMOD,
      changeFrequency: "daily",
      priority: 0.75,
    },
    {
      url: `${BASE_URL}/space-weather/alerts`,
      lastModified: STATIC_SITEMAP_LASTMOD,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/space-weather/solar`,
      lastModified: STATIC_SITEMAP_LASTMOD,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/space-weather/solar-wind`,
      lastModified: STATIC_SITEMAP_LASTMOD,
      changeFrequency: "daily",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/space-weather/geomagnetic`,
      lastModified: STATIC_SITEMAP_LASTMOD,
      changeFrequency: "daily",
      priority: 0.7,
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
