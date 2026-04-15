import { CACHE_KEYS, CACHE_TTL, withCache } from "@/lib/cache";
import {
  fetchSpaceWeather,
  fetchSpaceWeatherNotifications,
  getEventSeverity,
  getEventTypeLabel,
  parseEventType,
  SPACE_WEATHER_NOTIFICATIONS_MAX_TOTAL_RESULTS,
} from "@/lib/nasa-donki";
import type {
  AnySpaceWeatherEvent,
  SpaceWeatherAlert,
  SpaceWeatherAlertCategory,
  SpaceWeatherAlertsListResponse,
  SpaceWeatherAlertsQueryParams,
  SpaceWeatherNotification,
  SpaceWeatherNotificationFilterType,
  SpaceWeatherNotificationType,
  SpaceWeatherSeverity,
} from "@/lib/types";

const SWPC_ALERTS_URL = "https://services.swpc.noaa.gov/products/alerts.json";
const ALERTS_FETCH_TIMEOUT_MS = 8_000;
const DEFAULT_UNIFIED_ALERTS_LIMIT = 20;

interface RawSwpcAlert {
  product_id?: string;
  issue_datetime?: string;
  message?: string;
}

function uniqueWarnings(warnings: Array<string | undefined>): string[] | undefined {
  const values = Array.from(new Set(warnings.filter(Boolean))) as string[];
  return values.length > 0 ? values : undefined;
}

function toAlertCategory(type: SpaceWeatherNotificationType): SpaceWeatherAlertCategory {
  switch (type) {
    case "FLR":
      return "flr";
    case "SEP":
      return "sep";
    case "CME":
      return "cme";
    case "IPS":
      return "ips";
    case "GST":
      return "gst";
    case "RBE":
      return "rbe";
    case "MPC":
      return "mpc";
    default:
      return "other";
  }
}

function isWeeklyDonkiReport(notification: SpaceWeatherNotification): boolean {
  return notification.type === "other" && /weekly space weather summary report/i.test(notification.body);
}

function buildAlertSummary(notification: SpaceWeatherNotification): string {
  const lines = notification.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const preferred = lines.find((line) => !/^activity id:/i.test(line));
  const fallback = preferred ?? lines[0] ?? "No notification summary provided.";
  return fallback.length > 220 ? `${fallback.slice(0, 217).trimEnd()}...` : fallback;
}

function buildAlertTitle(
  notification: SpaceWeatherNotification,
  relatedEvents: SpaceWeatherAlert["relatedEvents"],
): string {
  if (relatedEvents.length > 0) {
    return `${relatedEvents[0].typeLabel} alert`;
  }

  switch (notification.type) {
    case "FLR":
      return "Solar Flare alert";
    case "SEP":
      return "Solar Energetic Particle alert";
    case "CME":
      return "Coronal Mass Ejection alert";
    case "IPS":
      return "Interplanetary Shock alert";
    case "GST":
      return "Geomagnetic Storm alert";
    case "RBE":
      return "Radiation Belt Enhancement alert";
    case "MPC":
      return "Magnetopause Crossing alert";
    default:
      return "General space weather alert";
  }
}

async function fetchWithTimeout(input: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ALERTS_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(input, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`request failed (${response.status})`);
    }
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchSwpcRawAlerts(): Promise<RawSwpcAlert[]> {
  return withCache(CACHE_KEYS.SPACE_WEATHER_NOTIFICATIONS + ":swpc", CACHE_TTL.SPACE_WEATHER_NOTIFICATIONS, async () => {
    const response = await fetchWithTimeout(SWPC_ALERTS_URL);
    return response.json() as Promise<RawSwpcAlert[]>;
  });
}

function toIsoDateTime(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(`${normalized}Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toSwpcAlertCategory(alert: RawSwpcAlert): SpaceWeatherAlertCategory {
  const haystack = `${alert.product_id ?? ""}\n${alert.message ?? ""}`.toUpperCase();

  if (haystack.includes("GEOMAGNETIC") || haystack.includes("K-INDEX") || /^K\d/.test(alert.product_id ?? "")) {
    return "gst";
  }
  if (haystack.includes("PROTON")) return "sep";
  if (haystack.includes("X-RAY") || haystack.includes("SOLAR RADIATION")) return "flr";
  if (haystack.includes("CME")) return "cme";
  return "other";
}

function mapSeverityWord(word: string): SpaceWeatherSeverity | null {
  switch (word.toLowerCase()) {
    case "minor":
      return "minor";
    case "moderate":
      return "moderate";
    case "strong":
      return "strong";
    case "severe":
      return "severe";
    case "extreme":
      return "extreme";
    default:
      return null;
  }
}

function toSwpcAlertSeverity(alert: RawSwpcAlert): SpaceWeatherSeverity {
  const message = alert.message ?? "";

  const scaleMatch = message.match(/NOAA Scale:\s+[A-Z0-9]+\s*-\s*(Minor|Moderate|Strong|Severe|Extreme)/i);
  const scaleSeverity = scaleMatch?.[1] ? mapSeverityWord(scaleMatch[1]) : null;
  if (scaleSeverity) return scaleSeverity;

  const kpMatch = message.match(/K-index of\s+(\d+)/i);
  const kp = kpMatch?.[1] ? Number(kpMatch[1]) : NaN;
  if (Number.isFinite(kp)) {
    if (kp >= 9) return "extreme";
    if (kp >= 8) return "severe";
    if (kp >= 7) return "strong";
    if (kp >= 6) return "moderate";
    return "minor";
  }

  return "minor";
}

function extractSwpcHeadline(message: string): string {
  const lines = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const headline = lines.find((line) =>
    /^(WATCH|WARNING|ALERT|CONTINUED ALERT|EXTENDED WARNING|CANCEL WARNING)/i.test(line),
  );
  return headline ?? lines[0] ?? "SWPC alert";
}

function extractSwpcSummary(message: string): string {
  const lines = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const preferred = lines.find((line) => /^Comment:/i.test(line))
    ?? lines.find((line) => /^Potential Impacts:/i.test(line))
    ?? lines.find((line) => !/^(Space Weather Message Code|Serial Number|Issue Time|Valid From|Valid To|Now Valid Until|Warning Condition|NOAA Scale)/i.test(line));

  const summary = preferred?.replace(/^Comment:\s*/i, "").replace(/^Potential Impacts:\s*/i, "")
    ?? "SWPC operational alert.";

  return summary.length > 220 ? `${summary.slice(0, 217).trimEnd()}...` : summary;
}

function toNotificationFilter(category: SpaceWeatherAlertCategory): SpaceWeatherNotificationFilterType {
  switch (category) {
    case "flr":
      return "FLR";
    case "sep":
      return "SEP";
    case "cme":
      return "CME";
    case "ips":
      return "IPS";
    case "gst":
      return "GST";
    case "rbe":
      return "RBE";
    case "mpc":
      return "MPC";
    default:
      return "all";
  }
}

async function fetchSwpcSpaceWeatherAlerts(
  params: SpaceWeatherAlertsQueryParams,
  effectiveStart: string,
  effectiveEnd: string,
): Promise<SpaceWeatherAlert[]> {
  const filterType = params.type ?? "all";
  const rawAlerts = await fetchSwpcRawAlerts();
  const startTime = new Date(`${effectiveStart}T00:00:00Z`).getTime();
  const endTime = new Date(`${effectiveEnd}T23:59:59.999Z`).getTime();

  return rawAlerts
    .map((alert): SpaceWeatherAlert | null => {
      const issuedAt = toIsoDateTime(alert.issue_datetime);
      if (!issuedAt || !alert.message || !alert.product_id) return null;

      const category = toSwpcAlertCategory(alert);
      if (filterType !== "all" && toNotificationFilter(category) !== filterType) {
        return null;
      }

      const issuedAtTime = new Date(issuedAt).getTime();
      if (issuedAtTime < startTime || issuedAtTime > endTime) {
        return null;
      }

      const message = alert.message;
      const serialMatch = message.match(/Serial Number:\s*(\d+)/i);

      return {
        id: `swpc:${alert.product_id}:${serialMatch?.[1] ?? issuedAt}`,
        source: "swpc" as const,
        category,
        title: extractSwpcHeadline(message),
        summary: extractSwpcSummary(message),
        severity: toSwpcAlertSeverity(alert),
        issuedAt,
        sourceUrl: SWPC_ALERTS_URL,
        activityCount: 0,
        relatedEventIds: [],
        relatedEvents: [],
      } satisfies SpaceWeatherAlert;
    })
    .filter((alert): alert is SpaceWeatherAlert => alert !== null);
}

export async function fetchUnifiedSpaceWeatherAlerts(
  params: SpaceWeatherAlertsQueryParams = {},
): Promise<SpaceWeatherAlertsListResponse> {
  const notificationsResult = await fetchSpaceWeatherNotifications({
    ...params,
    page: undefined,
    limit: SPACE_WEATHER_NOTIFICATIONS_MAX_TOTAL_RESULTS,
  });
  const warnings = [...(notificationsResult.meta.warnings ?? [])];
  const alertableNotifications = notificationsResult.notifications.filter(
    (notification) => !isWeeklyDonkiReport(notification),
  );

  const uniqueActivityIds = Array.from(
    new Set(alertableNotifications.flatMap((notification) => notification.activityIDs)),
  );
  const eventTypes = Array.from(
    new Set(uniqueActivityIds.map((activityId) => parseEventType(activityId)).filter(Boolean)),
  ) as Array<AnySpaceWeatherEvent["eventType"]>;

  let eventsById = new Map<string, AnySpaceWeatherEvent>();
  if (eventTypes.length > 0) {
    try {
      const eventsResult = await fetchSpaceWeather({
        startDate: notificationsResult.meta.dateRange.effectiveStart,
        endDate: notificationsResult.meta.dateRange.effectiveEnd,
        eventTypes,
        limit: Math.max(100, uniqueActivityIds.length * 2),
        page: 1,
      });
      eventsById = new Map(eventsResult.events.map((event) => [event.id, event]));
      if (eventsResult.meta.warnings?.length) {
        warnings.push(...eventsResult.meta.warnings);
      }
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? `Related DONKI events are temporarily unavailable (${error.message}).`
          : "Related DONKI events are temporarily unavailable.",
      );
    }
  }

  let relatedEventsResolved = 0;
  const donkiAlerts: SpaceWeatherAlert[] = alertableNotifications.map((notification) => {
    const relatedEvents = notification.activityIDs.flatMap((activityId) => {
      const event = eventsById.get(activityId);
      if (!event) return [];
      relatedEventsResolved += 1;
      return [
        {
          id: event.id,
          eventType: event.eventType,
          typeLabel: getEventTypeLabel(event.eventType),
          severity: getEventSeverity(event),
          startTime: event.startTime,
        },
      ];
    });

    if (notification.activityIDs.length > 0 && relatedEvents.length !== notification.activityIDs.length) {
      warnings.push(
        `Some related activity IDs for alert ${notification.id} could not be resolved in the current DONKI event window.`,
      );
    }

    return {
      id: notification.id,
      source: "donki",
      category: toAlertCategory(notification.type),
      title: buildAlertTitle(notification, relatedEvents),
      summary: buildAlertSummary(notification),
      severity: relatedEvents[0]?.severity ?? "minor",
      issuedAt: notification.issuedAt,
      sourceUrl: notification.url,
      activityCount: notification.activityIDs.length,
      relatedEventIds: notification.activityIDs,
      relatedEvents,
    };
  });

  let swpcAlerts: SpaceWeatherAlert[] = [];
  try {
    swpcAlerts = await fetchSwpcSpaceWeatherAlerts(
      params,
      notificationsResult.meta.dateRange.effectiveStart,
      notificationsResult.meta.dateRange.effectiveEnd,
    );
  } catch (error) {
    warnings.push(
      error instanceof Error
        ? `SWPC alerts are temporarily unavailable (${error.message}).`
        : "SWPC alerts are temporarily unavailable.",
    );
  }

  const mergedAlerts = [...donkiAlerts, ...swpcAlerts].sort((left, right) =>
    right.issuedAt.localeCompare(left.issuedAt),
  );

  const limitApplied = params.limit ?? DEFAULT_UNIFIED_ALERTS_LIMIT;
  const currentPage = params.page;
  const pagedAlerts = typeof currentPage === "number"
    ? mergedAlerts.slice((currentPage - 1) * limitApplied, currentPage * limitApplied)
    : mergedAlerts.slice(0, limitApplied);

  return {
    alerts: pagedAlerts,
    count: pagedAlerts.length,
    totalAvailable: mergedAlerts.length,
    limitApplied,
    ...(typeof currentPage === "number" ? { page: currentPage } : {}),
    meta: {
      dateRange: notificationsResult.meta.dateRange,
      typeIncluded: notificationsResult.meta.typeIncluded,
      sourcesIncluded: swpcAlerts.length > 0 ? ["donki", "swpc"] : ["donki"],
      relatedEventsResolved,
      warnings: uniqueWarnings(warnings),
      totalCapApplied: notificationsResult.meta.totalCapApplied,
      totalCap: notificationsResult.meta.totalCap + swpcAlerts.length,
    },
  };
}
