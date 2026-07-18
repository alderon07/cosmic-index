import { searchStars } from "@/lib/star-index";
import {
  buildUrl,
  generateSitemapXml,
  getIsoDate,
  SITEMAP_BATCH_SIZE,
  SITEMAP_CACHE_TTL_MS,
  MAX_URLS_PER_SITEMAP,
  type SitemapUrl,
} from "@/lib/sitemap";
import {
  sitemapUnavailableResponse,
  sitemapXmlResponse,
} from "@/lib/sitemap-response";

export const dynamic = "force-dynamic";
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

    while (hasMore && page <= 10 && allUrls.length < MAX_URLS_PER_SITEMAP) {
      const result = await searchStars({
        page,
        limit: SITEMAP_BATCH_SIZE,
      });

      for (const star of result.objects) {
        if (allUrls.length >= MAX_URLS_PER_SITEMAP) break;
        allUrls.push({
          loc: buildUrl(`/stars/${star.id}`),
        });
      }

      hasMore = result.hasMore;
      page += 1;
    }

    const xml = generateSitemapXml(allUrls);
    cachedSitemap = {
      xml,
      lastmod: generatedAt,
      expiresAt: Date.now() + SITEMAP_CACHE_TTL_MS,
    };

    return sitemapXmlResponse(xml, generatedAt);
  } catch (error) {
    console.error("Error generating stars sitemap:", error);

    if (cachedSitemap) {
      return sitemapXmlResponse(cachedSitemap.xml, cachedSitemap.lastmod);
    }

    return sitemapUnavailableResponse();
  }
}
