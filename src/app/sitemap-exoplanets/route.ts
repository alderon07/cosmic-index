import { NextResponse } from "next/server";
import { searchExoplanets } from "@/lib/exoplanet-index";
import {
  generateSitemapXml,
  buildUrl,
  getIsoDate,
  SITEMAP_BATCH_SIZE,
  SITEMAP_CACHE_TTL_MS,
  SitemapUrl,
} from "@/lib/sitemap";

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

function xmlResponse(xml: string, lastmod: string) {
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600",
      "Last-Modified": new Date(`${lastmod}T00:00:00.000Z`).toUTCString(),
    },
  });
}

export async function GET() {
  if (cachedSitemap && cachedSitemap.expiresAt > Date.now()) {
    return xmlResponse(cachedSitemap.xml, cachedSitemap.lastmod);
  }

  try {
    const allUrls: SitemapUrl[] = [];
    const generatedAt = getIsoDate();
    let page = 1;
    let hasMore = true;

    // Fetch all exoplanets from the local index in batches.
    while (hasMore && page <= 10) {
      const result = await searchExoplanets({
        page,
        limit: SITEMAP_BATCH_SIZE,
      });

      for (const exoplanet of result.objects) {
        allUrls.push({
          loc: buildUrl(`/exoplanets/${exoplanet.id}`),
          changefreq: "monthly",
          priority: 0.6,
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

    return xmlResponse(xml, generatedAt);
  } catch (error) {
    console.error("Error generating exoplanet sitemap:", error);

    if (cachedSitemap) {
      return xmlResponse(cachedSitemap.xml, cachedSitemap.lastmod);
    }

    return xmlResponse(generateSitemapXml([]), getIsoDate());
  }
}
