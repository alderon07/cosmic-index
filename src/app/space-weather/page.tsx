import { Suspense } from "react";
import { fetchSpaceWeather } from "@/lib/nasa-donki";
import {
  AnySpaceWeatherEvent,
  SpaceWeatherEventType,
} from "@/lib/types";
import { EventStreamResult } from "@/lib/api-client";
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

function parseEventTypes(value?: string): SpaceWeatherEventType[] {
  if (!value) return ["FLR", "CME", "GST"];
  const parsed = value
    .split(",")
    .map((type) => type.trim().toUpperCase())
    .filter(
      (type): type is SpaceWeatherEventType =>
        type === "FLR" || type === "CME" || type === "GST"
    );
  return parsed.length > 0 ? parsed : ["FLR", "CME", "GST"];
}

function buildInitialFetchKey(eventTypes: SpaceWeatherEventType[]) {
  const query = new URLSearchParams();
  if (eventTypes.length < 3) {
    query.set("eventTypes", eventTypes.join(","));
  }
  query.set("limit", "100");
  return query.toString();
}

export default async function SpaceWeatherPage({
  searchParams,
}: SpaceWeatherPageProps) {
  const resolvedSearchParams = await searchParams;
  const raw = toSingleValueParams(resolvedSearchParams);

  const eventTypes = parseEventTypes(raw.eventTypes);
  const initialFetchKey = buildInitialFetchKey(eventTypes);

  let initialData: EventStreamResult<AnySpaceWeatherEvent> | null = null;
  let initialError: string | null = null;

  try {
    const result = await fetchSpaceWeather({
      eventTypes,
      limit: 100,
    });
    initialData = {
      events: result.events,
      count: result.events.length,
      meta: {
        count: result.events.length,
        limitApplied: 100,
        dateRange: result.meta.dateRange,
        typesIncluded: result.meta.typesIncluded,
        ...(result.meta.warnings ? { warnings: result.meta.warnings } : {}),
      },
    };
  } catch (error) {
    initialError = error instanceof Error ? error.message : "An error occurred";
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
