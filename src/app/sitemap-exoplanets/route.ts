import { NextRequest, NextResponse } from "next/server";
import { fetchExoplanets } from "@/lib/nasa-exoplanet";
import {
  generateSitemapXml,
  buildUrl,
  getIsoDate,
  SITEMAP_BATCH_SIZE,
  SitemapUrl,
} from "@/lib/sitemap";
import {
  checkRateLimit,
  getClientIdentifier,
  getRateLimitHeaders,
} from "@/lib/rate-limit";

// Force dynamic rendering - sitemaps fetch external APIs
export const dynamic = "force-dynamic";

// Cache the response for 24 hours via headers
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Rate limiting - sitemaps are expensive, limit to 10 req/hour
    const clientId = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit(clientId, "SITEMAP");

    if (!rateLimitResult.allowed) {
      return new NextResponse("Rate limit exceeded. Please try again later.", {
        status: 429,
        headers: {
          "Content-Type": "text/plain",
          ...getRateLimitHeaders(rateLimitResult),
        },
      });
    }
    const allUrls: SitemapUrl[] = [];
    const lastmod = getIsoDate();
    let page = 1;
    let hasMore = true;

    // Fetch all exoplanets in batches
    // With ~5,000 exoplanets, this should complete in a few requests
    while (hasMore && page <= 10) {
      // Safety limit of 10 pages
      const result = await fetchExoplanets({
        page,
        limit: SITEMAP_BATCH_SIZE,
      });

      for (const exoplanet of result.objects) {
        allUrls.push({
          loc: buildUrl(`/exoplanets/${exoplanet.id}`),
          lastmod,
          changefreq: "monthly",
          priority: 0.6,
        });
      }

      hasMore = result.hasMore;
      page++;
    }

    const xml = generateSitemapXml(allUrls);

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        ...getRateLimitHeaders(rateLimitResult),
      },
    });
  } catch (error) {
    console.error("Error generating exoplanet sitemap:", error);
    return new NextResponse("Error generating sitemap", { status: 500 });
  }
}
