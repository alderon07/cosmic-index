"use client";

import { useQuery } from "@tanstack/react-query";
import { BellRing, Siren } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTooltip, TOOLTIP_CONTENT } from "@/components/info-tooltip";
import { DataFreshnessBadge } from "@/components/space-weather/data-freshness-badge";
import { apiFetchPaginated, type PaginatedResult } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { formatSpaceWeatherTimestamp } from "@/lib/space-weather/format";
import {
  AlertsPaginatedResultSchema,
  type AlertsPaginatedResultParsed,
} from "@/lib/space-weather/schemas";
import { SPACE_WEATHER_EVENT_ICONS } from "@/lib/space-weather-icons";
import {
  SPACE_WEATHER_SEVERITY_BADGE_CLASSES,
  THEMES,
} from "@/lib/theme";
import type { SpaceWeatherAlert, SpaceWeatherSeverity } from "@/lib/types";

const theme = THEMES["space-weather"];

interface AlertsDeskClientProps {
  initialAlerts: PaginatedResult<SpaceWeatherAlert>;
  generatedAt: string;
}

async function fetchAlerts(signal?: AbortSignal): Promise<AlertsPaginatedResultParsed> {
  const raw = await apiFetchPaginated<unknown>("/space-weather/alerts?limit=10&page=1", {
    signal,
  });
  return AlertsPaginatedResultSchema.parse(raw);
}

function SeverityIndicator({ severity }: { severity: SpaceWeatherSeverity }) {
  return (
    <Badge variant="outline" className={SPACE_WEATHER_SEVERITY_BADGE_CLASSES[severity]}>
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </Badge>
  );
}

export function AlertsDeskClient({
  initialAlerts,
  generatedAt,
}: AlertsDeskClientProps) {
  const parsedInitialAlerts = AlertsPaginatedResultSchema.parse(initialAlerts);

  const { data: alertsResult, isFetching } = useQuery<AlertsPaginatedResultParsed>({
    queryKey: queryKeys.spaceWeatherNotifications("alerts-desk"),
    queryFn: ({ signal }) => fetchAlerts(signal),
    initialData: parsedInitialAlerts,
    staleTime: 60_000,
    refetchInterval: 90_000,
    retry: 1,
  });

  const alerts = alertsResult.objects;
  const relatedEvents = alerts.flatMap((alert) => alert.relatedEvents);

  return (
    <>
      <section className="mb-6 flex flex-wrap items-center gap-3">
        <DataFreshnessBadge
          generatedAt={generatedAt}
          isFetching={isFetching}
        />
        <span className="rounded-full border border-border/40 bg-black/15 px-3 py-1.5 text-xs text-muted-foreground/80">
          {alerts.length} alert{alerts.length !== 1 ? "s" : ""} loaded
        </span>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {/* Unified Alerts */}
        <Card className={theme.cardSurface}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <BellRing className={`h-4 w-4 ${theme.icon}`} />
              Unified Alerts
            </CardTitle>
            <CardDescription>
              Alerts from both{" "}
              <InfoTooltip content={TOOLTIP_CONTENT.DONKI} theme="space-weather">
                DONKI
              </InfoTooltip>{" "}
              and{" "}
              <InfoTooltip content={TOOLTIP_CONTENT.SWPC} theme="space-weather">
                SWPC
              </InfoTooltip>
              , merged into a single stream sorted by time. Each alert shows its source,
              severity level, and any linked event activity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertsResult.meta?.warnings
              ? (alertsResult.meta.warnings as string[]).map((warning: string) => (
                  <div
                    key={warning}
                    className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-muted-foreground/80"
                  >
                    {warning}
                  </div>
                ))
              : null}
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground/80">
                No current alerts were returned.
              </p>
            ) : null}
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-xl border border-border/45 bg-black/15 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={theme.badge}>
                      {alert.category.toUpperCase()}
                    </Badge>
                    <SeverityIndicator severity={alert.severity} />
                    <span className="rounded-full border border-border/40 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
                      {alert.source}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground/70">
                    {formatSpaceWeatherTimestamp(alert.issuedAt)}
                  </span>
                </div>
                <p className="mt-3 font-medium text-foreground">{alert.title}</p>
                <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-foreground/85">
                  {alert.summary}
                </p>
                {alert.activityCount > 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground/70">
                    {alert.activityCount} linked activit{alert.activityCount === 1 ? "y" : "ies"}
                  </p>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Event Watchlist */}
        <Card className={theme.cardSurface}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <Siren className={`h-4 w-4 ${theme.icon}`} />
              Event Watchlist
            </CardTitle>
            <CardDescription>
              Space weather events linked to the current alerts. These are the underlying
              solar and geomagnetic events that triggered the notifications above.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {relatedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground/80">
                No linked events were resolved for the current alerts.
              </p>
            ) : null}
            {relatedEvents.map((event) => {
              const Icon = SPACE_WEATHER_EVENT_ICONS[event.eventType];
              return (
                <div
                  key={`${event.id}-related`}
                  className="rounded-xl border border-border/45 bg-black/15 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {Icon ? <Icon className={`h-4 w-4 ${theme.icon}`} /> : null}
                      <p className="font-medium text-foreground">{event.typeLabel}</p>
                      <SeverityIndicator severity={event.severity} />
                    </div>
                    <span className="text-xs text-muted-foreground/70">
                      {formatSpaceWeatherTimestamp(event.startTime)}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-xs text-muted-foreground/60">{event.id}</p>
                </div>
              );
            })}

            <div className="rounded-xl border border-border/30 bg-card/50 p-4 text-sm leading-relaxed text-muted-foreground/70">
              <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
                About the watchlist
              </p>
              <p>
                SWPC alerts don&apos;t carry DONKI activity IDs, so they appear in the alerts column
                but won&apos;t have linked events here. DONKI alerts with resolvable activity IDs will
                show their related events above.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
