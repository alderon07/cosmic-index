import { NextResponse } from "next/server";
import { generateSitemapXml } from "@/lib/sitemap";

const PUBLIC_SITEMAP_CACHE_CONTROL =
  "public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600";

export function sitemapXmlResponse(xml: string, lastmod: string): NextResponse {
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": PUBLIC_SITEMAP_CACHE_CONTROL,
      "Last-Modified": new Date(`${lastmod}T00:00:00.000Z`).toUTCString(),
    },
  });
}

export function sitemapUnavailableResponse(): NextResponse {
  return new NextResponse(generateSitemapXml([]), {
    status: 503,
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "no-store",
      "Retry-After": "300",
    },
  });
}
