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

interface SmallBodiesPageProps {
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

  return (
    <Suspense fallback={<SmallBodiesLoadingSkeleton />}>
      <SmallBodiesPageClient
        initialData={initialData}
        initialError={initialError}
        initialFetchKey={initialFetchKey}
      />
    </Suspense>
  );
}
