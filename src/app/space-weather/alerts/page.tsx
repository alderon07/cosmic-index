import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LearnBlock } from "@/components/space-weather/learn-block";
import { SPACE_WEATHER_EDUCATION } from "@/lib/space-weather-education";
import { fetchUnifiedSpaceWeatherAlerts } from "@/lib/space-weather/alerts";
import type { PaginatedResult } from "@/lib/api-client";
import type { SpaceWeatherAlert } from "@/lib/types";
import { AlertsDeskClient } from "@/app/space-weather/alerts/alerts-desk-client";
import { THEMES } from "@/lib/theme";

const theme = THEMES["space-weather"];

export const metadata: Metadata = {
  title: "Space Weather Alerts",
  description:
    "Unified alert triage for DONKI and SWPC space weather notifications with severity levels, related events, and alert history.",
  alternates: {
    canonical: "https://cosmicindex.dev/space-weather/alerts",
  },
};

export default async function SpaceWeatherAlertsPage() {
  const generatedAt = new Date().toISOString();

  const alertsResult = await fetchUnifiedSpaceWeatherAlerts({
    type: "all",
    limit: 10,
    page: 1,
  }).catch(() => ({
    alerts: [] as SpaceWeatherAlert[],
    count: 0,
    totalAvailable: 0,
    limitApplied: 10,
    page: 1,
    meta: {
      dateRange: {
        requestedStart: "",
        requestedEnd: "",
        effectiveStart: "",
        effectiveEnd: "",
      },
      typeIncluded: "all" as const,
      sourcesIncluded: ["donki"] as const,
      relatedEventsResolved: 0,
      warnings: ["Unified alerts are temporarily unavailable."],
      totalCapApplied: false,
      totalCap: 300,
    },
  }));

  const initialAlerts: PaginatedResult<SpaceWeatherAlert> = {
    objects: alertsResult.alerts,
    total: alertsResult.totalAvailable,
    page: alertsResult.page,
    limit: alertsResult.limitApplied,
    hasMore:
      typeof alertsResult.page === "number"
        ? alertsResult.page * alertsResult.limitApplied < alertsResult.totalAvailable
        : false,
    mode: typeof alertsResult.page === "number" ? "offset" : "none",
    meta: {
      ...alertsResult.meta,
    },
  };

  return (
    <div className="shell-container py-8">
      {/* Header */}
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Badge variant="outline" className={theme.badge}>
            Alerts Desk
          </Badge>
          <h1 className="font-display text-3xl tracking-wide text-foreground md:text-4xl">
            Space Weather Alerts
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground/80">
            A unified view of alerts from NASA DONKI and NOAA SWPC. Alerts are sorted
            by time and enriched with severity levels and linked event data where available.
            New alerts appear automatically as they are issued.
          </p>
        </div>
        <Button asChild variant="outline" className="border-aurora-violet/35 bg-black/15">
          <Link href="/space-weather/events">
            Full event browser
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>

      {/* Educational context */}
      <section className="mb-6 grid gap-4 lg:grid-cols-2">
        <LearnBlock
          title="What are space weather alerts?"
          explanation="Space weather alerts are issued when solar or geomagnetic conditions exceed thresholds that could affect technology on Earth or in orbit. NASA's DONKI publishes event-linked notifications when new activity is cataloged, while NOAA SWPC issues operational watches, warnings, and alerts for the U.S. government and critical infrastructure operators."
          impact="Alerts help satellite operators protect spacecraft, airlines reroute polar flights, power grid controllers prepare for geomagnetically induced currents, and amateur radio operators anticipate propagation changes."
        />
        <LearnBlock
          title="DONKI vs. SWPC — two sources, one desk"
          explanation="DONKI notifications are research-grade and link directly to specific solar events (flares, CMEs, storms). SWPC alerts are operational and follow NOAA's formal watch/warning/alert framework used by emergency managers and critical infrastructure. This desk merges both into one timeline."
          impact="By seeing both sources together, you get the scientific event context from DONKI alongside the operational severity assessments from SWPC — a more complete picture than either source alone."
        />
      </section>

      {/* Client-rendered alerts with React Query auto-refresh */}
      <AlertsDeskClient
        initialAlerts={initialAlerts}
        generatedAt={generatedAt}
      />
    </div>
  );
}
