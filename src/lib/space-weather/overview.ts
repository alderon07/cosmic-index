import { CACHE_KEYS, CACHE_TTL, withCache } from "@/lib/cache";
import { fetchSpaceWeather, SPACE_WEATHER_MAX_TOTAL_RESULTS } from "@/lib/nasa-donki";
import { fetchUnifiedSpaceWeatherAlerts } from "@/lib/space-weather/alerts";
import { SPACE_WEATHER_EVENT_TYPES, type AnySpaceWeatherEvent } from "@/lib/types";
import type { SpaceWeatherOverviewSnapshot } from "@/lib/space-weather/models";

export const SPACE_WEATHER_EVENT_WINDOW_DAYS = 90;
export const SPACE_WEATHER_NOTIFICATIONS_WINDOW_DAYS = 30;

function getFirstWarning(warnings?: string[]): string | null {
  if (!warnings || warnings.length === 0) return null;
  return warnings[0] ?? null;
}

function getDominantType(events: AnySpaceWeatherEvent[]): AnySpaceWeatherEvent["eventType"] | null {
  if (events.length === 0) return null;

  const counts = new Map<AnySpaceWeatherEvent["eventType"], number>();
  for (const event of events) {
    counts.set(event.eventType, (counts.get(event.eventType) ?? 0) + 1);
  }

  let dominantType: AnySpaceWeatherEvent["eventType"] | null = null;
  let dominantCount = -1;
  for (const eventType of SPACE_WEATHER_EVENT_TYPES) {
    const count = counts.get(eventType) ?? 0;
    if (count > dominantCount) {
      dominantType = eventType;
      dominantCount = count;
    }
  }

  return dominantType;
}

export async function buildSpaceWeatherOverviewSnapshot(): Promise<SpaceWeatherOverviewSnapshot> {
  return withCache(
    CACHE_KEYS.SPACE_WEATHER_OVERVIEW,
    CACHE_TTL.SPACE_WEATHER_OVERVIEW,
    async () => {
      const generatedAt = new Date().toISOString();

      const [eventsResult, alertsResult] = await Promise.allSettled([
        fetchSpaceWeather({
          eventTypes: [...SPACE_WEATHER_EVENT_TYPES],
          limit: SPACE_WEATHER_MAX_TOTAL_RESULTS,
          page: 1,
        }),
        fetchUnifiedSpaceWeatherAlerts({
          type: "all",
          limit: 8,
          page: 1,
        }),
      ]);

      if (eventsResult.status === "fulfilled") {
        const latestEvent = eventsResult.value.events[0] ?? null;
        return {
          generatedAt,
          latestEvent,
          eventSummary: {
            total: eventsResult.value.totalAvailable,
            dominantType: getDominantType(eventsResult.value.events),
            windowDays: SPACE_WEATHER_EVENT_WINDOW_DAYS,
            warning: getFirstWarning(eventsResult.value.meta.warnings),
          },
          notificationSummary: alertsResult.status === "fulfilled"
            ? {
                total: alertsResult.value.totalAvailable,
                latestIssuedAt: alertsResult.value.alerts[0]?.issuedAt ?? null,
                warning: getFirstWarning(alertsResult.value.meta.warnings),
                sourcesIncluded: alertsResult.value.meta.sourcesIncluded,
              }
            : {
                total: 0,
                latestIssuedAt: null,
                warning:
                  alertsResult.reason instanceof Error
                    ? alertsResult.reason.message
                    : "Alerts are temporarily unavailable.",
              },
        };
      }

      return {
        generatedAt,
        latestEvent: null,
        eventSummary: {
          total: 0,
          dominantType: null,
          windowDays: SPACE_WEATHER_EVENT_WINDOW_DAYS,
          warning:
            eventsResult.reason instanceof Error
              ? eventsResult.reason.message
              : "Space weather events are temporarily unavailable.",
        },
        notificationSummary: alertsResult.status === "fulfilled"
          ? {
              total: alertsResult.value.totalAvailable,
              latestIssuedAt: alertsResult.value.alerts[0]?.issuedAt ?? null,
              warning: getFirstWarning(alertsResult.value.meta.warnings),
              sourcesIncluded: alertsResult.value.meta.sourcesIncluded,
            }
          : {
              total: 0,
              latestIssuedAt: null,
              warning:
                alertsResult.reason instanceof Error
                  ? alertsResult.reason.message
                  : "Alerts are temporarily unavailable.",
            },
      };
    },
  );
}
