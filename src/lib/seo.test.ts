import { describe, expect, it } from "bun:test";
import {
  buildBreadcrumbJsonLd,
  buildCollectionPageJsonLd,
  buildFaqPageJsonLd,
  buildHubMetadata,
  toSingleValueParams,
} from "@/lib/seo";

describe("seo helpers", () => {
  it("normalizes search params to single values", () => {
    const params = toSingleValueParams({
      query: "kepler",
      sort: ["distance", "name"],
      empty: undefined,
    });

    expect(params).toEqual({
      query: "kepler",
      sort: "distance",
    });
  });

  it("builds indexable metadata for clean hub urls", () => {
    const metadata = buildHubMetadata({
      title: "Stars",
      description: "Browse host stars.",
      path: "/stars",
      variantKeys: ["query", "page"],
      params: {},
      imageAlt: "Cosmic Index - Stars",
    });

    expect(metadata.alternates?.canonical).toBe("https://cosmicindex.dev/stars");
    expect(metadata.robots).toMatchObject({
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
      },
    });
    expect(metadata.openGraph?.url).toBe("https://cosmicindex.dev/stars");
  });

  it("marks variant hub urls as noindex", () => {
    const metadata = buildHubMetadata({
      title: "Exoplanets",
      description: "Browse exoplanets.",
      path: "/exoplanets",
      variantKeys: ["query", "page", "view"],
      params: { query: "kepler" },
    });

    expect(metadata.alternates?.canonical).toBe("https://cosmicindex.dev/exoplanets");
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
      },
    });
  });

  it("builds collection page json-ld with visible item list entries", () => {
    const jsonLd = buildCollectionPageJsonLd({
      name: "Exoplanets",
      description: "Browse exoplanets.",
      path: "/exoplanets",
      sourceName: "NASA Exoplanet Archive",
      sourceUrl: "https://exoplanetarchive.ipac.caltech.edu/",
      items: [
        { name: "Kepler-22 b", path: "/exoplanets/kepler-22-b" },
        { name: "TRAPPIST-1 e", path: "/exoplanets/trappist-1-e" },
      ],
    });

    expect(jsonLd.mainEntity).toMatchObject({
      "@type": "ItemList",
      numberOfItems: 2,
    });
    expect(jsonLd.about).toMatchObject({
      "@type": "Dataset",
      name: "NASA Exoplanet Archive",
      description: "Browse exoplanets.",
      license: "https://science.data.nasa.gov/about/license",
      creator: {
        "@type": "Organization",
        name: "NASA Exoplanet Archive",
        url: "https://exoplanetarchive.ipac.caltech.edu/",
      },
    });
  });

  it("builds breadcrumb json-ld with canonical urls", () => {
    const jsonLd = buildBreadcrumbJsonLd([
      { label: "Home", href: "/" },
      { label: "Stars", href: "/stars" },
      { label: "TRAPPIST-1" },
    ]);

    expect(jsonLd.itemListElement[0]).toMatchObject({
      position: 1,
      item: "https://cosmicindex.dev/",
    });
    expect(jsonLd.itemListElement[2]).toMatchObject({
      position: 3,
      name: "TRAPPIST-1",
    });
  });

  it("builds faq page json-ld with question and answer entries", () => {
    const jsonLd = buildFaqPageJsonLd({
      name: "FAQ",
      description: "Frequently asked questions.",
      path: "/faq",
      questions: [
        {
          question: "Where does the data come from?",
          answer: "From public datasets and operational sources.",
        },
      ],
    });

    expect(jsonLd).toMatchObject({
      "@type": "FAQPage",
      url: "https://cosmicindex.dev/faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "Where does the data come from?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "From public datasets and operational sources.",
          },
        },
      ],
    });
  });
});
