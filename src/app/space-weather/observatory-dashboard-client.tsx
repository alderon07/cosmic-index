"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ShieldAlert,
  Sun,
  Waves,
  Wind,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataFreshnessBadge } from "@/components/space-weather/data-freshness-badge";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { getEventTypeLabel } from "@/lib/nasa-donki";
import { formatSpaceWeatherTimestamp } from "@/lib/space-weather/format";
import {
  SpaceWeatherOverviewSnapshotSchema,
  type SpaceWeatherOverviewSnapshotParsed,
} from "@/lib/space-weather/schemas";
import { THEMES } from "@/lib/theme";
import type { SpaceWeatherOverviewSnapshot } from "@/lib/space-weather/models";

const theme = THEMES["space-weather"];

interface ObservatoryDashboardClientProps {
  initialData: SpaceWeatherOverviewSnapshot;
}

async function fetchOverview(): Promise<SpaceWeatherOverviewSnapshotParsed> {
  const raw = await apiFetch<unknown>("/space-weather/overview");
  return SpaceWeatherOverviewSnapshotSchema.parse(raw);
}

function OverviewLinkCard({
  href,
  title,
  description,
  eyebrow,
  icon: Icon,
  accent,
}: {
  href: string;
  title: string;
  description: string;
  eyebrow: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <Card className={`group overflow-hidden transition-colors ${theme.cardSurface}`}>
      <CardHeader className="gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent} bg-opacity-15`}>
            <Icon className="h-4 w-4 text-current" />
          </div>
          <Badge variant="outline" className={theme.badge}>
            {eyebrow}
          </Badge>
        </div>
        <CardTitle className="font-display text-xl tracking-wide">{title}</CardTitle>
        <CardDescription className="max-w-md text-sm leading-relaxed text-muted-foreground/80">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" className="border-border/60 bg-black/15 transition-colors group-hover:border-aurora-violet/40">
          <Link href={href}>
            Explore
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function ObservatoryDashboardClient({
  initialData,
}: ObservatoryDashboardClientProps) {
  const parsedInitialData = SpaceWeatherOverviewSnapshotSchema.parse(initialData);

  const { data: overview, isFetching } = useQuery<SpaceWeatherOverviewSnapshotParsed>({
    queryKey: queryKeys.spaceWeatherOverview("dashboard"),
    queryFn: fetchOverview,
    initialData: parsedInitialData,
    staleTime: 60_000,
    refetchInterval: 90_000,
    retry: 1,
  });

  const latestEventLabel = overview.latestEvent
    ? getEventTypeLabel(overview.latestEvent.eventType)
    : "No recent events";

  return (
    <>
      {/* Live status strip */}
      <section className="mt-6 flex flex-wrap items-center gap-3">
        <DataFreshnessBadge
          generatedAt={overview.generatedAt}
          isFetching={isFetching}
        />
        <span className="rounded-full border border-border/40 bg-black/15 px-3 py-1.5 text-xs text-muted-foreground/80">
          {overview.eventSummary.total} events in the last {overview.eventSummary.windowDays} days
        </span>
        {overview.notificationSummary.total > 0 ? (
          <span className="rounded-full border border-border/40 bg-black/15 px-3 py-1.5 text-xs text-muted-foreground/80">
            {overview.notificationSummary.total} active alerts
          </span>
        ) : null}
      </section>

      {/* Current snapshot cards */}
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <Card className="border-aurora-violet/25 bg-black/20">
          <CardHeader className="gap-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="font-display text-lg tracking-wide">
                Latest Activity
              </CardTitle>
              <Activity className={`h-5 w-5 ${theme.icon}`} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/40 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
                  Most recent event
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">{latestEventLabel}</p>
                <p className="mt-1 text-sm text-muted-foreground/80">
                  {overview.latestEvent
                    ? formatSpaceWeatherTimestamp(overview.latestEvent.startTime)
                    : "Waiting on upstream data"}
                </p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
                  Dominant type
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {overview.eventSummary.dominantType
                    ? getEventTypeLabel(overview.eventSummary.dominantType)
                    : "Unavailable"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground/80">
                  {overview.eventSummary.warning ?? "Event catalog responding normally."}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-aurora-violet/25 bg-black/20">
          <CardHeader className="gap-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="font-display text-lg tracking-wide">
                Alert Status
              </CardTitle>
              <ShieldAlert className={`h-5 w-5 ${theme.icon}`} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/40 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
                  Active alerts
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {overview.notificationSummary.total}
                </p>
                <p className="mt-1 text-sm text-muted-foreground/80">
                  {formatSpaceWeatherTimestamp(overview.notificationSummary.latestIssuedAt)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
                  Sources
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {(overview.notificationSummary.sourcesIncluded ?? ["donki"]).join(" + ").toUpperCase()}
                </p>
                <p className="mt-1 text-sm text-muted-foreground/80">
                  {overview.notificationSummary.warning ?? "Alert feed responding normally."}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </section>

      {/* Navigation cards */}
      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <OverviewLinkCard
          href="/space-weather/events"
          eyebrow="Event Browser"
          title="DONKI Events"
          icon={Activity}
          description={`${overview.eventSummary.total} events across all categories in the last ${overview.eventSummary.windowDays} days. Browse the full NASA DONKI event catalog with filtering by type, date range, and pagination.`}
          accent="text-aurora-violet"
        />
        <OverviewLinkCard
          href="/space-weather/alerts"
          eyebrow="Alerts Desk"
          title="Alert Triage"
          icon={ShieldAlert}
          description="Alerts from NASA DONKI and NOAA SWPC are merged into a unified triage view. Review severity levels, related events, and alert history at a glance."
          accent="text-amber-300"
        />
        <OverviewLinkCard
          href="/space-weather/solar"
          eyebrow="Solar Monitoring"
          title="Solar Surface"
          icon={Sun}
          description="Live GOES SUVI imagery, D-RAP absorption guidance, and NOAA flare probabilities. Track the Sun in real time with imagery, radio absorption maps, and the 3-day flare forecast."
          accent="text-orange-400"
        />
        <OverviewLinkCard
          href="/space-weather/solar-wind"
          eyebrow="Solar Wind Stream"
          title="Solar Wind & IMF"
          icon={Wind}
          description="Track upstream plasma speed, density, and IMF orientation before conditions couple into Earth's magnetosphere. Follow the solar-wind bridge between solar activity and geomagnetic response."
          accent="text-violet-300"
        />
        <OverviewLinkCard
          href="/space-weather/geomagnetic"
          eyebrow="Geomagnetic Monitoring"
          title="Geomagnetic Surface"
          icon={Waves}
          description="Hp30 nowcast, Kyoto AE quicklook, and recent geomagnetic disturbance events. Monitor Earth's magnetic field response with GFZ and auroral electrojet data."
          accent="text-cyan-400"
        />
      </section>
    </>
  );
}
