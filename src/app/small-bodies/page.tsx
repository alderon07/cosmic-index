import type { Metadata } from "next";
import { Suspense } from "react";
import {
  SmallBodyData,
  SmallBodyQueryParams,
  SmallBodyQuerySchema,
} from "@/lib/types";
import { fetchSmallBodies } from "@/lib/jpl-sbdb";
import {
  SmallBodiesLoadingSkeleton,
  SmallBodiesPageClient,
} from "./small-bodies-page-client";
import { PaginatedResult } from "@/lib/api-client";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildCollectionPageJsonLd,
  buildHubMetadata,
  toSingleValueParams,
} from "@/lib/seo";

interface SmallBodiesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const SMALL_BODIES_HUB_DESCRIPTION =
  "Discover over 1,000,000 asteroids and comets from JPL's Small-Body Database. Search and filter by type, orbit class, NEO status, and potential hazard classification.";
const SMALL_BODIES_VARIANT_KEYS = [
  "query",
  "kind",
  "neo",
  "pha",
  "orbitClass",
  "page",
  "limit",
  "view",
] as const;

export async function generateMetadata({
  searchParams,
}: SmallBodiesPageProps): Promise<Metadata> {
  const rawParams = toSingleValueParams(await searchParams);

  return buildHubMetadata({
    title: "Small Bodies",
    description: SMALL_BODIES_HUB_DESCRIPTION,
    path: "/small-bodies",
    variantKeys: SMALL_BODIES_VARIANT_KEYS,
    params: rawParams,
    imageAlt: "Cosmic Index - Small Bodies",
  });
}

function buildInitialFetchKey(params: SmallBodyQueryParams): string {
  const query = new URLSearchParams();
  if (params.query) query.set("query", params.query);
  if (params.kind) query.set("kind", params.kind);
  if (params.neo) query.set("neo", "true");
  if (params.pha) query.set("pha", "true");
  if (params.orbitClass) query.set("orbitClass", params.orbitClass);
  query.set("page", (params.page ?? 1).toString());
  query.set("limit", (params.limit ?? DEFAULT_PAGE_SIZE).toString());
  return query.toString();
}

export default async function SmallBodiesPage({
  searchParams,
}: SmallBodiesPageProps) {
  const resolvedSearchParams = await searchParams;
  const rawParams = toSingleValueParams(resolvedSearchParams);
  const parsed = SmallBodyQuerySchema.safeParse(rawParams);

  let initialData: PaginatedResult<SmallBodyData> | null = null;
  let initialError: string | null = null;
  let initialFetchKey = buildInitialFetchKey({ page: 1, limit: DEFAULT_PAGE_SIZE });

  if (!parsed.success) {
    initialError = "Invalid query parameters.";
  } else {
    const query = parsed.data;
    initialFetchKey = buildInitialFetchKey(query);
    try {
      const result = await fetchSmallBodies({
        ...query,
        page: query.page ?? 1,
      });
      initialData = {
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
    name: "Small Bodies",
    description: SMALL_BODIES_HUB_DESCRIPTION,
    path: "/small-bodies",
    sourceName: "JPL Small-Body Database",
    sourceUrl: "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html",
    items: initialData?.objects.slice(0, 10).map((body) => ({
      name: body.displayName,
      path: `/small-bodies/${body.id}`,
    })),
  });

  return (
    <>
      <JsonLd data={collectionPageJsonLd} />
      <Suspense fallback={<SmallBodiesLoadingSkeleton />}>
        <SmallBodiesPageClient
          initialData={initialData}
          initialError={initialError}
          initialFetchKey={initialFetchKey}
        />
      </Suspense>
    </>
  );
}
