import { NextResponse } from "next/server";
import { fetchSmallBodies } from "@/lib/jpl-sbdb";
import {
  generateSitemapXml,
  buildUrl,
  getIsoDate,
  SitemapUrl,
} from "@/lib/sitemap";

// Force dynamic rendering - sitemaps fetch external APIs
export const dynamic = "force-dynamic";

// No revalidation caching - use response headers instead
export const revalidate = 0;

// Small batch size to avoid API timeouts
const BATCH_SIZE = 100;

// Maximum objects to include - keep it small for build reliability
// PHAs are the most newsworthy objects
const MAX_OBJECTS = 2000;

export async function GET() {
  try {
    const allUrls: SitemapUrl[] = [];
    const lastmod = getIsoDate();

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
            lastmod,
            changefreq: "monthly",
            priority: 0.7,
          });
          fetched++;
        }

        hasMore = result.hasMore && fetched < MAX_OBJECTS;
        page++;

        // Limit to 20 pages to prevent runaway requests
        if (page > 20) break;
      } catch (err) {
        console.error("Error fetching small bodies for sitemap:", err);
        // If fetching fails, continue with what we have
        break;
      }
    }

    const xml = generateSitemapXml(allUrls);

    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (error) {
    console.error("Error generating small body sitemap:", error);
    // Return an empty sitemap rather than erroring
    const xml = generateSitemapXml([]);
    return new NextResponse(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  }
}
