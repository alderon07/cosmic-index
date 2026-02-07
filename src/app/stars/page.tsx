import { Suspense } from "react";
import { StarData, StarQueryParams, StarQuerySchema } from "@/lib/types";
import { searchStars } from "@/lib/star-index";
import { StarsLoadingSkeleton, StarsPageClient } from "./stars-page-client";
import { PaginatedResult } from "@/lib/api-client";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

interface StarsPageProps {
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

function buildInitialFetchKey(params: StarQueryParams): string {
  const query = new URLSearchParams();
  if (params.query) query.set("query", params.query);
  if (params.spectralClass) query.set("spectralClass", params.spectralClass);
  if (params.minPlanets) query.set("minPlanets", params.minPlanets.toString());
  if (params.multiPlanet) query.set("multiPlanet", "true");
  if (params.maxDistancePc) query.set("maxDistancePc", params.maxDistancePc.toString());
  if (params.sort) query.set("sort", params.sort);
  if (params.order) query.set("order", params.order);
  query.set("page", (params.page ?? 1).toString());
  query.set("limit", (params.limit ?? DEFAULT_PAGE_SIZE).toString());
  return query.toString();
}

export default async function StarsPage({ searchParams }: StarsPageProps) {
  const resolvedSearchParams = await searchParams;
  const rawParams = toSingleValueParams(resolvedSearchParams);
  const parsed = StarQuerySchema.safeParse(rawParams);

  let initialData: PaginatedResult<StarData> | null = null;
  let initialError: string | null = null;
  let initialFetchKey = buildInitialFetchKey({ page: 1, limit: DEFAULT_PAGE_SIZE });

  if (!parsed.success) {
    initialError = "Invalid query parameters.";
  } else {
    const query = parsed.data;
    initialFetchKey = buildInitialFetchKey(query);
    try {
      const result = await searchStars(query);
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
    <Suspense fallback={<StarsLoadingSkeleton />}>
      <StarsPageClient
        initialData={initialData}
        initialError={initialError}
        initialFetchKey={initialFetchKey}
      />
    </Suspense>
  );
}
