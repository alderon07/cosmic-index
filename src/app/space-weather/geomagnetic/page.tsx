import type { Metadata } from "next";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, Compass, Waves } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getEventTypeLabel } from "@/lib/nasa-donki";
import { buildSpaceWeatherGeomagneticSnapshot } from "@/lib/space-weather/geomagnetic";
import type { SpaceWeatherSourceMeta } from "@/lib/types";
import { THEMES } from "@/lib/theme";

const theme = THEMES["space-weather"];

export const metadata: Metadata = {
  title: "Geomagnetic Monitoring",
  description:
    "Geomagnetic monitoring surface for GFZ Hp30, Kyoto AE, and DONKI disturbance context.",
  alternates: {
    canonical: "https://cosmicindex.dev/space-weather/geomagnetic",
  },
};

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return "Unavailable";
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

function SourceMetaBlock({ source }: { source: SpaceWeatherSourceMeta }) {
  return (
    <div className="mt-3 space-y-1 text-xs text-muted-foreground/75">
      <p>Source: {source.label}</p>
      <p>Observed: {formatTimestamp(source.observedAt)}</p>
      <p>Fetched: {formatTimestamp(source.fetchedAt)}</p>
      <p className="capitalize">Quality: {source.quality}</p>
    </div>
  );
}

export default async function SpaceWeatherGeomagneticPage() {
  const snapshot = await buildSpaceWeatherGeomagneticSnapshot();

  return (
    <div className="shell-container py-8">
      <section className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Badge variant="outline" className={theme.badge}>
            Geomagnetic Surface
          </Badge>
          <h1 className="font-display text-3xl tracking-wide text-foreground md:text-4xl">
            Geomagnetic Monitoring
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground/80">
            Disturbance watch tuned for fast scan: GFZ Hp30 nowcast, Kyoto AE quicklook context, and
            the DONKI storm/shock lane that links geomagnetic response back to recent space-weather events.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="border-aurora-violet/35 bg-black/15">
            <Link href="/space-weather/events">
              Open event browser
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-aurora-violet/35 bg-black/15">
            <Link href="/space-weather/alerts">Open alerts desk</Link>
          </Button>
        </div>
      </section>

      {snapshot.warnings && snapshot.warnings.length > 0 ? (
        <section className="mb-8 grid gap-3">
          {snapshot.warnings.map((warning) => (
            <div
              key={warning}
              className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-muted-foreground/80"
            >
              {warning}
            </div>
          ))}
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className={theme.cardSurface}>
          <CardHeader className="gap-3">
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <Compass className={`h-5 w-5 ${theme.icon}`} />
              GFZ Hp30
            </CardTitle>
            <CardDescription>
              Half-hour geomagnetic nowcast from GFZ, surfaced as a compact operational trend card.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.hp30 ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/45 bg-black/15 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                      Current Hp30
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">
                      {snapshot.hp30.currentValue ?? "Unavailable"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/45 bg-black/15 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                      24h max
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">
                      {snapshot.hp30.maxValue24h ?? "Unavailable"}
                    </p>
                  </div>
                </div>
                <div className="grid gap-2">
                  {snapshot.hp30.trend.slice(-8).map((point) => (
                    <div
                      key={point.observedAt}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border border-border/35 bg-black/10 px-3 py-2 text-sm"
                    >
                      <span className="text-muted-foreground/80">{formatTimestamp(point.observedAt)}</span>
                      <span className="font-medium text-foreground">Hp30 {point.hp30.toFixed(3)}</span>
                      <span className="text-muted-foreground/70">ap30 {point.ap30}</span>
                    </div>
                  ))}
                </div>
                <SourceMetaBlock source={snapshot.hp30.source} />
                <a
                  href={snapshot.hp30.source.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex text-sm text-aurora-violet underline-offset-4 hover:underline"
                >
                  View upstream product
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/80">
                GFZ Hp30 is temporarily unavailable.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={theme.cardSurface}>
          <CardHeader className="gap-3">
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <Waves className={`h-5 w-5 ${theme.icon}`} />
              Kyoto AE
            </CardTitle>
            <CardDescription>
              Quicklook auroral electrojet context from Kyoto WDC, clearly labeled as a lagging provisional feed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.ae ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/45 bg-black/15 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                      Latest minute
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">
                      {snapshot.ae.currentValue ?? "Unavailable"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/45 bg-black/15 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                      24h peak
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">
                      {snapshot.ae.peakValue24h ?? "Unavailable"}
                    </p>
                  </div>
                </div>
                <div className="grid gap-2">
                  {snapshot.ae.hourlySeries.slice(-8).map((hour) => (
                    <div
                      key={hour.hourStart}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border border-border/35 bg-black/10 px-3 py-2 text-sm"
                    >
                      <span className="text-muted-foreground/80">{formatTimestamp(hour.hourStart)}</span>
                      <span className="font-medium text-foreground">Mean {hour.meanValue.toFixed(1)}</span>
                      <span className="text-muted-foreground/70">Peak {hour.peakValue}</span>
                    </div>
                  ))}
                </div>
                {snapshot.ae.warnings?.map((warning) => (
                  <p key={warning} className="text-sm text-amber-200">
                    {warning}
                  </p>
                ))}
                <SourceMetaBlock source={snapshot.ae.source} />
                <a
                  href={snapshot.ae.source.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex text-sm text-aurora-violet underline-offset-4 hover:underline"
                >
                  View upstream product
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/80">
                Kyoto AE is temporarily unavailable.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className={theme.cardSurface}>
          <CardHeader className="gap-3">
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <Activity className={`h-5 w-5 ${theme.icon}`} />
              Disturbance Lane
            </CardTitle>
            <CardDescription>
              Recent DONKI geomagnetic storms, interplanetary shocks, and high-speed streams for event follow-up.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground/80">
                No recent geomagnetic-adjacent DONKI events were returned.
              </p>
            ) : null}
            {snapshot.recentEvents.map((event) => (
              <div key={event.id} className="rounded-xl border border-border/45 bg-black/15 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Activity className={`h-4 w-4 ${theme.icon}`} />
                    <span className="font-medium text-foreground">{getEventTypeLabel(event.eventType)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground/70">{formatTimestamp(event.startTime)}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground/80">{event.id}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className={theme.cardSurface}>
          <CardHeader className="gap-3">
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <AlertTriangle className={`h-5 w-5 ${theme.icon}`} />
              Operator Notes
            </CardTitle>
            <CardDescription>
              This geomagnetic surface pairs one near-real-time indicator with one lagged quicklook indicator on purpose.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground/80">
            <p>
              GFZ Hp30 gives the faster planetary-activity signal, while Kyoto AE adds auroral electrojet context with a clearly marked lag.
            </p>
            <p>
              This page favors readable trend slices over dashboard density, which keeps the nowcast/quicklook distinction obvious on both desktop and mobile.
            </p>
            <p>Snapshot generated: {formatTimestamp(snapshot.generatedAt)}</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
