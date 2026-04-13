import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BellRing, Siren } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchUnifiedSpaceWeatherAlerts } from "@/lib/space-weather/alerts";
import { THEMES } from "@/lib/theme";

const theme = THEMES["space-weather"];

export const metadata: Metadata = {
  title: "Space Weather Alerts",
  description:
    "Review the current DONKI + SWPC alert lane and alert-adjacent event activity from the observatory surface.",
  alternates: {
    canonical: "https://cosmicindex.dev/space-weather/alerts",
  },
};

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

export default async function SpaceWeatherAlertsPage() {
  const alertsResult = await fetchUnifiedSpaceWeatherAlerts({ type: "all", limit: 10, page: 1 }).catch(
    () => ({
      alerts: [],
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
    }),
  );

  return (
    <div className="shell-container py-8">
      <section className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Badge variant="outline" className={theme.badge}>
            Alerts Desk
          </Badge>
          <h1 className="font-display text-3xl tracking-wide text-foreground md:text-4xl">
            Space Weather Alerts
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground/80">
            Operational triage view for recent DONKI and SWPC alerts plus the event lanes most likely to
            demand follow-up. These sources stay visibly grouped by provenance while sharing one
            normalized alert contract.
          </p>
        </div>
        <Button asChild variant="outline" className="border-aurora-violet/35 bg-black/15">
          <Link href="/space-weather/events">
            Open full event browser
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className={theme.cardSurface}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <BellRing className={`h-4 w-4 ${theme.icon}`} />
              Unified Alerts
            </CardTitle>
            <CardDescription>
              Normalized alert cards from the observatory alert lane, sourced from DONKI and SWPC with related-event enrichment where DONKI activity IDs can be resolved.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertsResult.meta.warnings?.map((warning) => (
              <div key={warning} className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-muted-foreground/80">
                {warning}
              </div>
            ))}
            {alertsResult.alerts.length === 0 && (
              <p className="text-sm text-muted-foreground/80">No current alerts were returned.</p>
            )}
            {alertsResult.alerts.map((alert) => (
              <div key={alert.id} className="rounded-xl border border-border/45 bg-black/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={theme.badge}>
                      {alert.category.toUpperCase()}
                    </Badge>
                    <span className="rounded-full border border-border/40 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
                      {alert.source}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground/70">
                    {formatTimestamp(alert.issuedAt)}
                  </span>
                </div>
                <p className="mt-3 font-medium text-foreground">{alert.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/85 line-clamp-4">
                  {alert.summary}
                </p>
                <p className="mt-2 text-xs text-muted-foreground/70">
                  {alert.activityCount} activity ID{alert.activityCount === 1 ? "" : "s"} linked
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className={theme.cardSurface}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <Siren className={`h-4 w-4 ${theme.icon}`} />
              Event Watchlist
            </CardTitle>
            <CardDescription>
              Recent event activity that can support alert triage and follow-up.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertsResult.alerts.length === 0 && (
              <p className="text-sm text-muted-foreground/80">No event watchlist items were returned.</p>
            )}
            {alertsResult.alerts.flatMap((alert) => alert.relatedEvents).map((event) => (
              <div key={`${event.id}-related`} className="rounded-xl border border-border/45 bg-black/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Siren className={`h-4 w-4 ${theme.icon}`} />
                    <p className="font-medium text-foreground">{event.typeLabel}</p>
                  </div>
                  <span className="text-xs text-muted-foreground/70">
                    {formatTimestamp(event.startTime)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground/80">{event.id}</p>
              </div>
            ))}
            <div className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-muted-foreground/80">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
                <p>
                  SWPC alerts do not carry DONKI-style activity IDs, so the cross-source desk stays source-grouped instead of forcing brittle deduplication.
                  DONKI-linked events still appear in the watchlist where they can support follow-up.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
