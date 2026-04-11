import type { Metadata } from "next";
import { BASE_URL, SITE_CONFIG } from "@/lib/config";

export interface SeoBreadcrumbItem {
  label: string;
  href?: string;
}

export interface SeoItemListEntry {
  name: string;
  path: string;
}

const DEFAULT_DATASET_LICENSE_URL = "https://science.data.nasa.gov/about/license";

const GOOGLEBOT_ROBOTS = {
  follow: true,
  "max-video-preview": -1,
  "max-image-preview": "large" as const,
  "max-snippet": -1,
};

export function toSingleValueParams(
  params: Record<string, string | string[] | undefined>
): Record<string, string> {
  const entries: Array<[string, string]> = [];

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      entries.push([key, value]);
    } else if (Array.isArray(value) && value.length > 0) {
      entries.push([key, value[0]]);
    }
  }

  return Object.fromEntries(entries);
}

export function hasSeoVariant(
  params: Record<string, string>,
  relevantKeys: readonly string[]
): boolean {
  return relevantKeys.some((key) => {
    const value = params[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

export function buildRobots(index: boolean): NonNullable<Metadata["robots"]> {
  return {
    index,
    follow: true,
    googleBot: {
      index,
      ...GOOGLEBOT_ROBOTS,
    },
  };
}

export function buildHubMetadata(input: {
  title: string;
  description: string;
  path: string;
  variantKeys: readonly string[];
  params: Record<string, string>;
  openGraphType?: "website" | "article";
  imageAlt?: string;
}): Metadata {
  const canonicalUrl = `${BASE_URL}${input.path}`;
  const indexable = !hasSeoVariant(input.params, input.variantKeys);
  const imageAlt = input.imageAlt ?? `${SITE_CONFIG.name} - ${input.title}`;

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: canonicalUrl,
    },
    robots: buildRobots(indexable),
    openGraph: {
      type: input.openGraphType ?? "website",
      url: canonicalUrl,
      siteName: SITE_CONFIG.name,
      title: `${input.title} | ${SITE_CONFIG.name}`,
      description: input.description,
      images: [
        {
          url: SITE_CONFIG.ogImage,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${input.title} | ${SITE_CONFIG.name}`,
      description: input.description,
      images: [SITE_CONFIG.ogImage],
    },
  };
}

export function buildBreadcrumbJsonLd(items: SeoBreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${BASE_URL}${item.href}` } : {}),
    })),
  };
}

export function buildCollectionPageJsonLd(input: {
  name: string;
  description: string;
  path: string;
  sourceName: string;
  sourceUrl: string;
  sourceDescription?: string;
  sourceLicense?: string;
  sourceCreatorName?: string;
  sourceCreatorUrl?: string;
  items?: SeoItemListEntry[];
}) {
  const url = `${BASE_URL}${input.path}`;
  const itemList =
    input.items && input.items.length > 0
      ? {
          "@type": "ItemList",
          itemListOrder: "https://schema.org/ItemListOrderAscending",
          numberOfItems: input.items.length,
          itemListElement: input.items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            url: `${BASE_URL}${item.path}`,
          })),
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url,
    isPartOf: {
      "@type": "WebSite",
      name: SITE_CONFIG.name,
      url: BASE_URL,
    },
    about: {
      "@type": "Dataset",
      name: input.sourceName,
      description: input.sourceDescription ?? input.description,
      url: input.sourceUrl,
      creator: {
        "@type": "Organization",
        name: input.sourceCreatorName ?? input.sourceName,
        url: input.sourceCreatorUrl ?? input.sourceUrl,
      },
      license: input.sourceLicense ?? DEFAULT_DATASET_LICENSE_URL,
    },
    ...(itemList ? { mainEntity: itemList } : {}),
  };
}
