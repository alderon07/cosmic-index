import type { MetadataRoute } from "next";
import { GUIDES } from "@/content/guide-index";
import { GUIDE_ARTICLES } from "@/content/guides/articles";
import {
  getCuratedCatalogPaths,
  type CatalogDetailKind,
} from "@/lib/catalog-index-policy";
import { BASE_URL } from "@/lib/config";

const CATALOG_KINDS: readonly CatalogDetailKind[] = [
  "exoplanet",
  "star",
  "small-body",
];

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
    { url: `${BASE_URL}/learn` },
    { url: `${BASE_URL}/about` },
    ...GUIDES.map((guide) => ({
      url: `${BASE_URL}/learn/${guide.slug}`,
      lastModified: GUIDE_ARTICLES[guide.slug].updatedAt ?? GUIDE_ARTICLES[guide.slug].publishedAt,
    })),
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
    ...CATALOG_KINDS.flatMap((kind) =>
      getCuratedCatalogPaths(kind).map((path) => ({ url: `${BASE_URL}${path}` })),
    ),
  ];

  return staticPages;
}
