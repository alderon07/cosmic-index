import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import GuidePage, {
  generateMetadata,
  generateStaticParams,
} from "./[slug]/page";
import { GUIDES } from "@/content/guide-index";
import { GUIDE_ARTICLES } from "@/content/guides/articles";

const SOURCE_HOSTS = new Set([
  "science.nasa.gov",
  "exoplanetarchive.ipac.caltech.edu",
  "www.swpc.noaa.gov",
  "cneos.jpl.nasa.gov",
]);

describe("public field guides", () => {
  it("prebuilds all published guides", () => {
    expect(generateStaticParams()).toHaveLength(GUIDES.length);
  });

  it.each(GUIDES)(
    "renders $slug with readable content, sources, and working section links",
    async (guide) => {
      const params = Promise.resolve({ slug: guide.slug });
      const html = renderToStaticMarkup(await GuidePage({ params }));
      const metadata = await generateMetadata({ params });
      expect(metadata.alternates?.canonical).toBe(
        `https://cosmicindex.dev/learn/${guide.slug}`,
      );
      expect(html.match(/<h1\b/g)).toHaveLength(1);
      expect(html).toContain(`href="${guide.toolHref}"`);
      expect(html).toContain("<caption");
      expect(html).toContain('"@type":"Article"');
      expect(html).toContain('href="/about"');
      expect(html).toContain("Save for later");
      for (const section of GUIDE_ARTICLES[guide.slug].sections) {
        expect(html).toContain(`href="#${section.id}"`);
        expect(html).toContain(`id="${section.id}"`);
        for (const source of section.sources ?? []) {
          const url = new URL(source.href);
          expect(url.protocol).toBe("https:");
          expect(SOURCE_HOSTS.has(url.hostname)).toBe(true);
          expect(html).toContain(`href="${source.href}"`);
        }
      }
    },
  );

  it("renders the real case study with source values and usable catalog links before hydration", async () => {
    const html = renderToStaticMarkup(await GuidePage({ params: Promise.resolve({ slug: "trappist-1-comparison" }) }));
    expect(html).toContain("TRAPPIST-1 b");
    expect(html).toContain("TRAPPIST-1 e");
    expect(html).toContain("1.116");
    expect(html).toContain('href="/exoplanets/TRAPPIST-1%20b"');
    expect(html).toContain('href="/exoplanets/TRAPPIST-1%20e"');
    expect(html).toContain('id="earth-interval"');
    expect(html).toContain("20");
    expect(html).toContain("4.9");
  });

  it.each(["unpublished", "constructor", "__proto__"])(
    "returns not found for %s rather than another article",
    async (slug) => {
      const params = Promise.resolve({ slug });
      await expect(GuidePage({ params })).rejects.toThrow(
        "NEXT_HTTP_ERROR_FALLBACK;404",
      );
      await expect(generateMetadata({ params })).rejects.toThrow(
        "NEXT_HTTP_ERROR_FALLBACK;404",
      );
    },
  );
});
