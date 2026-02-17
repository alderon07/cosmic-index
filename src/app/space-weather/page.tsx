import { Suspense } from "react";
import { fetchSpaceWeather } from "@/lib/nasa-donki";
import {
  AnySpaceWeatherEvent,
  SPACE_WEATHER_EVENT_TYPES,
  SpaceWeatherQuerySchema,
} from "@/lib/types";
import { PaginatedResult } from "@/lib/api-client";
import {
  buildSpaceWeatherFetchKey,
  SPACE_WEATHER_UI_PAGE_SIZE,
} from "@/lib/space-weather-fetch-key";
import { parseEventTypesParam } from "@/lib/space-weather-url";
import {
  SpaceWeatherLoadingSkeleton,
  SpaceWeatherPageClient,
} from "./space-weather-page-client";

interface SpaceWeatherPageProps {
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

export default async function SpaceWeatherPage({
  searchParams,
}: SpaceWeatherPageProps) {
  const resolvedSearchParams = await searchParams;
  const raw = toSingleValueParams(resolvedSearchParams);
  const parsed = SpaceWeatherQuerySchema.safeParse({
    eventTypes: raw.eventTypes,
    page: raw.page,
  });

  let initialData: PaginatedResult<AnySpaceWeatherEvent> | null = null;
  let initialError: string | null = null;
  let initialFetchKey = buildSpaceWeatherFetchKey(
    [...SPACE_WEATHER_EVENT_TYPES],
    SPACE_WEATHER_UI_PAGE_SIZE,
    1
  );

  if (!parsed.success) {
    initialError = "Invalid query parameters.";
  } else {
    const page = parsed.data.page ?? 1;
    const limit = SPACE_WEATHER_UI_PAGE_SIZE;
    const eventTypes = parseEventTypesParam(parsed.data.eventTypes);

    initialFetchKey = buildSpaceWeatherFetchKey(eventTypes, limit, page);

    try {
      const result = await fetchSpaceWeather({
        eventTypes,
        limit,
        page,
      });

      initialData = {
        objects: result.events,
        total: result.totalAvailable,
        page,
        limit,
        hasMore: page * limit < result.totalAvailable,
        mode: "offset",
        meta: {
          count: result.count,
          limitApplied: result.limitApplied,
          totalAvailable: result.totalAvailable,
          ...result.meta,
        },
      };
    } catch (error) {
      initialError = error instanceof Error ? error.message : "An error occurred";
    }
  }

  return (
    <Suspense fallback={<SpaceWeatherLoadingSkeleton />}>
      <SpaceWeatherPageClient
        initialData={initialData}
        initialError={initialError}
        initialFetchKey={initialFetchKey}
      />
    </Suspense>
  );
}
