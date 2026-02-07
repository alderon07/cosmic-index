import { Suspense } from "react";
import { ExoplanetData, ExoplanetQuerySchema, ExoplanetQueryParams } from "@/lib/types";
import { searchExoplanets } from "@/lib/exoplanet-index";
import { ExoplanetsLoadingSkeleton, ExoplanetsPageClient } from "./exoplanets-page-client";
import { PaginatedResult } from "@/lib/api-client";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

interface ExoplanetsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function toSingleValueParams(
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

  return (
    <Suspense fallback={<ExoplanetsLoadingSkeleton />}>
      <ExoplanetsPageClient
        initialData={initialData}
        initialError={initialError}
        initialFetchKey={initialFetchKey}
      />
    </Suspense>
  );
}
