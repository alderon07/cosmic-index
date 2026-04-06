import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Space Weather",
  description:
    "Track NASA DONKI space weather events (FLR/CME/GST/IPS/HSS/SEP) from the last 90 days, plus recent notifications.",
};

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
    const shouldDeferCmeForInitialRender =
      page === 1 &&
      eventTypes.includes("CME") &&
      eventTypes.length > 1;
    const serverEventTypes = shouldDeferCmeForInitialRender
      ? eventTypes.filter((eventType) => eventType !== "CME")
      : eventTypes;

    initialFetchKey = buildSpaceWeatherFetchKey(eventTypes, limit, page);

    try {
      const result = await fetchSpaceWeather({
        eventTypes: serverEventTypes,
        limit,
        page,
      });
      const initialWarnings = [...(result.meta.warnings ?? [])];
      if (shouldDeferCmeForInitialRender) {
        initialWarnings.unshift(
          "Coronal Mass Ejection data is loading in the background to speed up the initial page render."
        );
      }

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
          ...(initialWarnings.length > 0 ? { warnings: initialWarnings } : {}),
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
        forceBackgroundRefresh={
          parsed.success &&
          (parsed.data.page ?? 1) === 1 &&
          parseEventTypesParam(parsed.data.eventTypes).includes("CME") &&
          parseEventTypesParam(parsed.data.eventTypes).length > 1
        }
      />
    </Suspense>
  );
}
