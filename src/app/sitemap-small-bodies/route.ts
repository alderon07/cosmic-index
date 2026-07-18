import { fetchSmallBodies } from "@/lib/jpl-sbdb";
import {
  generateSitemapXml,
  buildUrl,
  getIsoDate,
  SITEMAP_CACHE_TTL_MS,
  SitemapUrl,
} from "@/lib/sitemap";
import {
  sitemapUnavailableResponse,
  sitemapXmlResponse,
} from "@/lib/sitemap-response";

// Force dynamic rendering - sitemaps fetch external APIs
export const dynamic = "force-dynamic";

// No revalidation caching - use response headers instead
export const revalidate = 0;

// Small batch size to avoid API timeouts
const BATCH_SIZE = 100;

// Maximum objects to include - keep it small for build reliability
// PHAs are the most newsworthy objects
const MAX_OBJECTS = 2000;

let cachedSitemap:
  | {
      xml: string;
      lastmod: string;
      expiresAt: number;
    }
  | null = null;

export async function GET() {
  if (cachedSitemap && cachedSitemap.expiresAt > Date.now()) {
    return sitemapXmlResponse(cachedSitemap.xml, cachedSitemap.lastmod);
  }

  try {
    const allUrls: SitemapUrl[] = [];
    const generatedAt = getIsoDate();

    // Only fetch PHAs (Potentially Hazardous Asteroids) - most newsworthy
    // This keeps the sitemap small and focused on the most important objects
    let page = 1;
    let hasMore = true;
    let fetched = 0;

    while (hasMore && fetched < MAX_OBJECTS) {
      try {
        const result = await fetchSmallBodies({
          pha: true,
          page,
          limit: BATCH_SIZE,
        });

        for (const body of result.objects) {
          allUrls.push({
            loc: buildUrl(`/small-bodies/${body.id}`),
          });
          fetched++;
        }

        hasMore = result.hasMore && fetched < MAX_OBJECTS;
        page++;

        // Limit to 20 pages to prevent runaway requests
        if (page > 20) break;
      } catch (err) {
        console.error("Error fetching small bodies for sitemap:", err);
        if (allUrls.length === 0) throw err;
        // Preserve a useful partial sitemap if a later batch fails.
        break;
      }
    }

    const xml = generateSitemapXml(allUrls);
    cachedSitemap = {
      xml,
      lastmod: generatedAt,
      expiresAt: Date.now() + SITEMAP_CACHE_TTL_MS,
    };

    return sitemapXmlResponse(xml, generatedAt);
  } catch (error) {
    console.error("Error generating small body sitemap:", error);

    if (cachedSitemap) {
      return sitemapXmlResponse(cachedSitemap.xml, cachedSitemap.lastmod);
    }

    return sitemapUnavailableResponse();
  }
}
