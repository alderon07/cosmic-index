import { SpaceWeatherEventType } from "@/lib/types";

const EVENT_TYPE_ORDER: SpaceWeatherEventType[] = ["FLR", "CME", "GST"];
export const SPACE_WEATHER_DEFAULT_API_LIMIT = 100;
export const SPACE_WEATHER_UI_PAGE_SIZE = 21;
export const SPACE_WEATHER_TIMELINE_LIMIT = 420;

function canonicalizeEventTypes(
  eventTypes: SpaceWeatherEventType[]
): SpaceWeatherEventType[] {
  const allowed = new Set<SpaceWeatherEventType>(EVENT_TYPE_ORDER);
  const selected = new Set<SpaceWeatherEventType>();

  for (const eventType of eventTypes) {
    if (allowed.has(eventType)) selected.add(eventType);
  }

  return EVENT_TYPE_ORDER.filter((eventType) => selected.has(eventType));
}

export function buildSpaceWeatherFetchKey(
  eventTypes: SpaceWeatherEventType[],
  limit = SPACE_WEATHER_DEFAULT_API_LIMIT,
  page?: number
): string {
  const canonicalEventTypes = canonicalizeEventTypes(eventTypes);
  const params = new URLSearchParams();
  params.set("v", "2");
  if (canonicalEventTypes.length < EVENT_TYPE_ORDER.length) {
    params.set("eventTypes", canonicalEventTypes.join(","));
  }
  params.set("limit", limit.toString());
  if (typeof page === "number") {
    params.set("page", page.toString());
  }
  return params.toString();
}
