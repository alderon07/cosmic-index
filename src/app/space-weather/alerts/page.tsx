import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { LearnBlock } from "@/components/space-weather/learn-block";
import { fetchUnifiedSpaceWeatherAlerts } from "@/lib/space-weather/alerts";
import type { PaginatedResult } from "@/lib/api-client";
import type { SpaceWeatherAlert } from "@/lib/types";
import { AlertsDeskClient } from "@/app/space-weather/alerts/alerts-desk-client";
import { THEMES } from "@/lib/theme";
import { buildCollectionPageJsonLd, buildHubMetadata } from "@/lib/seo";

const theme = THEMES["space-weather"];
const SPACE_WEATHER_ALERTS_DESCRIPTION =
  "Unified space weather alert desk merging NASA DONKI and NOAA SWPC notifications with severity levels, related events, and alert history.";

export const metadata: Metadata = buildHubMetadata({
  title: "Space Weather Alerts",
  description: SPACE_WEATHER_ALERTS_DESCRIPTION,
  path: "/space-weather/alerts",
  variantKeys: [],
  params: {},
  imageAlt: "Cosmic Index - Space Weather Alerts",
});

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

  const collectionPageJsonLd = buildCollectionPageJsonLd({
    name: "Space Weather Alerts",
    description: SPACE_WEATHER_ALERTS_DESCRIPTION,
    path: "/space-weather/alerts",
    sourceName: "NASA DONKI and NOAA SWPC",
    sourceUrl: "https://www.swpc.noaa.gov/",
    sourceDescription:
      "Operational space weather alerts merged from NOAA Space Weather Prediction Center bulletins and NASA DONKI event-linked notifications.",
    sourceCreatorName: "NOAA SWPC and NASA CCMC",
    sourceCreatorUrl: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/",
  });

  return (
    <>
      <JsonLd data={collectionPageJsonLd} />
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
            Monitor space weather alerts from NASA DONKI and NOAA SWPC in one timeline.
            This alert desk highlights solar flare alerts, geomagnetic storm watches, radio
            blackout notices, and related event context so you can quickly see what changed,
            how severe it is, and what activity may be driving it.
          </p>
        </div>
        <Button asChild variant="outline" className="border-aurora-violet/35 bg-black/15">
          <Link href="/space-weather/events">
            Browse Space Weather Events
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
          theme="space-weather"
        />
        <LearnBlock
          title="DONKI vs. SWPC — two sources, one desk"
          explanation="DONKI notifications are research-grade and link directly to specific solar events (flares, CMEs, storms). SWPC alerts are operational and follow NOAA's formal watch/warning/alert framework used by emergency managers and critical infrastructure. This desk merges both into one timeline."
          impact="By seeing both sources together, you get the scientific event context from DONKI alongside the operational severity assessments from SWPC — a more complete picture than either source alone."
          theme="space-weather"
        />
      </section>

      {/* Client-rendered alerts with React Query auto-refresh */}
      <AlertsDeskClient
        initialAlerts={initialAlerts}
        generatedAt={generatedAt}
      />
      </div>
    </>
  );
}
