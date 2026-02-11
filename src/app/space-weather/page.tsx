import { Suspense } from "react";
import { fetchSpaceWeather } from "@/lib/nasa-donki";
import {
  AnySpaceWeatherEvent,
  SpaceWeatherQuerySchema,
} from "@/lib/types";
import { EventStreamResult } from "@/lib/api-client";
import {
  buildSpaceWeatherFetchKey,
  SPACE_WEATHER_LIMIT,
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
    limit: raw.limit,
  });

  let initialData: EventStreamResult<AnySpaceWeatherEvent> | null = null;
  let initialError: string | null = null;
  let initialFetchKey = buildSpaceWeatherFetchKey(
    ["FLR", "CME", "GST"],
    SPACE_WEATHER_LIMIT
  );

  if (!parsed.success) {
    initialError = "Invalid query parameters.";
  } else {
    const limit = parsed.data.limit ?? SPACE_WEATHER_LIMIT;
    const eventTypes = parseEventTypesParam(parsed.data.eventTypes);

    initialFetchKey = buildSpaceWeatherFetchKey(eventTypes, limit);

    try {
      const result = await fetchSpaceWeather({
        eventTypes,
        limit,
      });

      initialData = {
        events: result.events,
        count: result.count,
        meta: result.meta,
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
