import {
  SpaceWeatherEventType,
  SPACE_WEATHER_EVENT_TYPES,
} from "@/lib/types";

const EVENT_TYPE_ORDER: SpaceWeatherEventType[] = [...SPACE_WEATHER_EVENT_TYPES];

export function parseEventTypesParam(value?: string | null): SpaceWeatherEventType[] {
  if (!value) return [...EVENT_TYPE_ORDER];

  const allowed = new Set<SpaceWeatherEventType>(EVENT_TYPE_ORDER);
  const unique = new Set<SpaceWeatherEventType>();

  for (const part of value.split(",")) {
    const candidate = part.trim().toUpperCase() as SpaceWeatherEventType;
    if (allowed.has(candidate)) {
      unique.add(candidate);
    }
  }

  if (unique.size === 0) {
    return [...EVENT_TYPE_ORDER];
  }

  return EVENT_TYPE_ORDER.filter((type) => unique.has(type));
}
