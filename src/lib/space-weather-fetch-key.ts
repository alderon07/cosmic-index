import {
  SpaceWeatherEventType,
  SpaceWeatherNotificationFilterType,
  SPACE_WEATHER_EVENT_TYPES,
} from "@/lib/types";

const EVENT_TYPE_ORDER: SpaceWeatherEventType[] = [...SPACE_WEATHER_EVENT_TYPES];
export const SPACE_WEATHER_DEFAULT_API_LIMIT = 100;
export const SPACE_WEATHER_UI_PAGE_SIZE = 21;
export const SPACE_WEATHER_TIMELINE_LIMIT = 420;
export const SPACE_WEATHER_NOTIFICATIONS_UI_LIMIT = 8;

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

export function buildSpaceWeatherNotificationsFetchKey(
  limit = SPACE_WEATHER_NOTIFICATIONS_UI_LIMIT,
  page?: number,
  type: SpaceWeatherNotificationFilterType = "all",
): string {
  const params = new URLSearchParams();
  params.set("v", "1");
  params.set("limit", limit.toString());
  params.set("type", type);
  if (typeof page === "number") {
    params.set("page", page.toString());
  }
  return params.toString();
}
