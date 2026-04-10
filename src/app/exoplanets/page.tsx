import type { Metadata } from "next";
import { Suspense } from "react";
import { ExoplanetData, ExoplanetQuerySchema, ExoplanetQueryParams } from "@/lib/types";
import { searchExoplanets } from "@/lib/exoplanet-index";
import { ExoplanetsLoadingSkeleton, ExoplanetsPageClient } from "./exoplanets-page-client";
import { PaginatedResult } from "@/lib/api-client";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildCollectionPageJsonLd,
  buildHubMetadata,
  toSingleValueParams,
} from "@/lib/seo";

interface ExoplanetsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const EXOPLANETS_HUB_DESCRIPTION =
  "Explore over 5,000 confirmed exoplanets from NASA's Exoplanet Archive. Search and filter by discovery method, size, habitability, and more.";
const EXOPLANETS_VARIANT_KEYS = [
  "query",
  "discoveryMethod",
  "year",
  "hasRadius",
  "hasMass",
  "sizeCategory",
  "habitable",
  "facility",
  "multiPlanet",
  "maxDistancePc",
  "sort",
  "order",
  "page",
  "limit",
  "view",
] as const;

export async function generateMetadata({
  searchParams,
}: ExoplanetsPageProps): Promise<Metadata> {
  const rawParams = toSingleValueParams(await searchParams);

  return buildHubMetadata({
    title: "Exoplanets",
    description: EXOPLANETS_HUB_DESCRIPTION,
    path: "/exoplanets",
    variantKeys: EXOPLANETS_VARIANT_KEYS,
    params: rawParams,
    imageAlt: "Cosmic Index - Exoplanets",
  });
}

function buildInitialFetchKey(params: ExoplanetQueryParams): string {
  const query = new URLSearchParams();
  if (params.query) query.set("query", params.query);
  if (params.discoveryMethod) query.set("discoveryMethod", params.discoveryMethod);
  if (params.year) query.set("year", params.year.toString());
  if (params.hasRadius) query.set("hasRadius", "true");
  if (params.hasMass) query.set("hasMass", "true");
  if (params.sizeCategory) query.set("sizeCategory", params.sizeCategory);
  if (params.habitable) query.set("habitable", "true");
  if (params.facility) query.set("facility", params.facility);
  if (params.multiPlanet) query.set("multiPlanet", "true");
  if (params.maxDistancePc) query.set("maxDistancePc", params.maxDistancePc.toString());
  if (params.sort) query.set("sort", params.sort);
  if (params.order) query.set("order", params.order);
  query.set("page", (params.page ?? 1).toString());
  query.set("limit", (params.limit ?? DEFAULT_PAGE_SIZE).toString());
  return query.toString();
}

export default async function ExoplanetsPage({ searchParams }: ExoplanetsPageProps) {
  const resolvedSearchParams = await searchParams;
  const rawParams = toSingleValueParams(resolvedSearchParams);
  const parsed = ExoplanetQuerySchema.safeParse(rawParams);

  let initialData: PaginatedResult<ExoplanetData> | null = null;
  let initialError: string | null = null;
  let initialFetchKey = buildInitialFetchKey({ page: 1, limit: DEFAULT_PAGE_SIZE });

  if (!parsed.success) {
    initialError = "Invalid query parameters.";
  } else {
    const query = parsed.data;
    initialFetchKey = buildInitialFetchKey(query);
    try {
      const result = await searchExoplanets(query);
      initialData = result.usedCursor
        ? {
            objects: result.objects,
            limit: result.limit,
            hasMore: result.hasMore,
            mode: "cursor",
            nextCursor: result.nextCursor,
          }
        : {
            objects: result.objects,
            total: result.total,
            page: result.page,
            limit: result.limit,
            hasMore: result.hasMore,
            mode: "offset",
          };
    } catch (error) {
      initialError = error instanceof Error ? error.message : "An error occurred";
    }
  }

  const collectionPageJsonLd = buildCollectionPageJsonLd({
    name: "Exoplanets",
    description: EXOPLANETS_HUB_DESCRIPTION,
    path: "/exoplanets",
    sourceName: "NASA Exoplanet Archive",
    sourceUrl: "https://exoplanetarchive.ipac.caltech.edu/",
    items: initialData?.objects.slice(0, 10).map((exoplanet) => ({
      name: exoplanet.displayName,
      path: `/exoplanets/${exoplanet.id}`,
    })),
  });

  return (
    <>
      <JsonLd data={collectionPageJsonLd} />
      <Suspense fallback={<ExoplanetsLoadingSkeleton />}>
        <ExoplanetsPageClient
          initialData={initialData}
          initialError={initialError}
          initialFetchKey={initialFetchKey}
        />
      </Suspense>
    </>
  );
}
