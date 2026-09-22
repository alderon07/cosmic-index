import { getCuratedCatalogPaths } from "@/lib/catalog-index-policy";
import { buildUrl, generateSitemapXml, getIsoDate } from "@/lib/sitemap";
import { sitemapXmlResponse } from "@/lib/sitemap-response";

export const dynamic = "force-static";

export function GET() {
  const generatedAt = getIsoDate();
  const urls = getCuratedCatalogPaths("exoplanet").map((path) => ({
    loc: buildUrl(path),
  }));

  return sitemapXmlResponse(generateSitemapXml(urls), generatedAt);
}
