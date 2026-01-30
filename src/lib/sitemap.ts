/**
 * Sitemap utilities for generating XML sitemaps
 */
import { BASE_URL } from "@/lib/config";

// Google's limit for URLs per sitemap
export const MAX_URLS_PER_SITEMAP = 50000;

// Reasonable batch size for API requests
export const SITEMAP_BATCH_SIZE = 10000;

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

/**
 * Generate XML sitemap from URL entries
 */
export function generateSitemapXml(urls: SitemapUrl[]): string {
  const urlEntries = urls
    .map((url) => {
      let entry = `  <url>\n    <loc>${escapeXml(url.loc)}</loc>`;
      if (url.lastmod) {
        entry += `\n    <lastmod>${url.lastmod}</lastmod>`;
      }
      if (url.changefreq) {
        entry += `\n    <changefreq>${url.changefreq}</changefreq>`;
      }
      if (url.priority !== undefined) {
        entry += `\n    <priority>${url.priority.toFixed(1)}</priority>`;
      }
      entry += "\n  </url>";
      return entry;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

/**
 * Generate sitemap index XML for multiple sitemaps
 */
export function generateSitemapIndexXml(
  sitemapUrls: { loc: string; lastmod?: string }[]
): string {
  const sitemapEntries = sitemapUrls
    .map((sitemap) => {
      let entry = `  <sitemap>\n    <loc>${escapeXml(sitemap.loc)}</loc>`;
      if (sitemap.lastmod) {
        entry += `\n    <lastmod>${sitemap.lastmod}</lastmod>`;
      }
      entry += "\n  </sitemap>";
      return entry;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</sitemapindex>`;
}

/**
 * Escape special XML characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Get the current date in ISO format for lastmod
 */
export function getIsoDate(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Build the full URL for a sitemap entry
 */
export function buildUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

/**
 * Calculate the number of sitemap pages needed for a given total
 */
export function calculateSitemapPages(total: number, batchSize: number = SITEMAP_BATCH_SIZE): number {
  return Math.ceil(total / Math.min(batchSize, MAX_URLS_PER_SITEMAP));
}
