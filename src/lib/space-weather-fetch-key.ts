import { SpaceWeatherEventType } from "@/lib/types";

export const SPACE_WEATHER_LIMIT = 100;

export function buildSpaceWeatherFetchKey(
  eventTypes: SpaceWeatherEventType[],
  limit = SPACE_WEATHER_LIMIT
): string {
  const params = new URLSearchParams();
  if (eventTypes.length < 3) {
    params.set("eventTypes", eventTypes.join(","));
  }
  params.set("limit", limit.toString());
  return params.toString();
}
