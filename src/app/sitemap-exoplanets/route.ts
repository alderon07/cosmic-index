import { searchExoplanets } from "@/lib/exoplanet-index";
import {
  generateSitemapXml,
  buildUrl,
  getIsoDate,
  SITEMAP_BATCH_SIZE,
  SITEMAP_CACHE_TTL_MS,
  MAX_URLS_PER_SITEMAP,
  SitemapUrl,
} from "@/lib/sitemap";
import {
  sitemapUnavailableResponse,
  sitemapXmlResponse,
} from "@/lib/sitemap-response";

// Force dynamic rendering - sitemaps fetch external APIs
export const dynamic = "force-dynamic";

// Cache the response for 24 hours via headers
export const revalidate = 0;

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
    let page = 1;
    let hasMore = true;

    // Fetch all exoplanets from the local index in batches.
    while (hasMore && page <= 10 && allUrls.length < MAX_URLS_PER_SITEMAP) {
      const result = await searchExoplanets({
        page,
        limit: SITEMAP_BATCH_SIZE,
      });

      for (const exoplanet of result.objects) {
        if (allUrls.length >= MAX_URLS_PER_SITEMAP) break;
        allUrls.push({
          loc: buildUrl(`/exoplanets/${exoplanet.id}`),
        });
      }

      hasMore = result.hasMore;
      page++;
    }

    const xml = generateSitemapXml(allUrls);
    cachedSitemap = {
      xml,
      lastmod: generatedAt,
      expiresAt: Date.now() + SITEMAP_CACHE_TTL_MS,
    };

    return sitemapXmlResponse(xml, generatedAt);
  } catch (error) {
    console.error("Error generating exoplanet sitemap:", error);

    if (cachedSitemap) {
      return sitemapXmlResponse(cachedSitemap.xml, cachedSitemap.lastmod);
    }

    return sitemapUnavailableResponse();
  }
}
