import type { AnySpaceWeatherEvent, SpaceWeatherEventType } from "@/lib/types";

export interface SpaceWeatherEventSummary {
  total: number;
  dominantType: SpaceWeatherEventType | null;
  windowDays: number;
  warning: string | null;
}

export interface SpaceWeatherNotificationSummary {
  total: number;
  latestIssuedAt: string | null;
  warning: string | null;
  sourcesIncluded?: string[];
}

export interface SpaceWeatherOverviewSnapshot {
  generatedAt: string;
  latestEvent: AnySpaceWeatherEvent | null;
  eventSummary: SpaceWeatherEventSummary;
  notificationSummary: SpaceWeatherNotificationSummary;
}
