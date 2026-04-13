import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  RadioTower,
  ShieldAlert,
  Sun,
  Waves,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JsonLd } from "@/components/seo/json-ld";
import { buildCollectionPageJsonLd } from "@/lib/seo";
import { BASE_URL } from "@/lib/config";
import { getEventTypeLabel } from "@/lib/nasa-donki";
import {
  buildSpaceWeatherOverviewSnapshot,
  SPACE_WEATHER_EVENT_WINDOW_DAYS,
  SPACE_WEATHER_NOTIFICATIONS_WINDOW_DAYS,
} from "@/lib/space-weather/overview";
import { THEMES } from "@/lib/theme";

const theme = THEMES["space-weather"];

export const metadata: Metadata = {
  title: "Space Weather Observatory",
  description:
    "Operational space weather dashboard for DONKI events, alert monitoring, solar watch, and geomagnetic tracking.",
  alternates: {
    canonical: `${BASE_URL}/space-weather`,
  },
};

function formatTimestamp(value: string | null): string {
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

function OverviewLinkCard({
  href,
  title,
  description,
  eyebrow,
  accent,
}: {
  href: string;
  title: string;
  description: string;
  eyebrow: string;
  accent: string;
}) {
  return (
    <Card className={`overflow-hidden ${theme.cardSurface}`}>
      <CardHeader className="gap-3">
        <Badge variant="outline" className={theme.badge}>
          {eyebrow}
        </Badge>
        <div className={`h-1 w-16 rounded-full ${accent}`} />
        <CardTitle className="font-display text-xl tracking-wide">{title}</CardTitle>
        <CardDescription className="max-w-md text-sm leading-relaxed text-muted-foreground/80">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" className="border-border/60 bg-black/15">
          <Link href={href}>
            Open surface
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default async function SpaceWeatherPage() {
  const overview = await buildSpaceWeatherOverviewSnapshot();
  const collectionPageJsonLd = buildCollectionPageJsonLd({
    name: "Space Weather Observatory",
    description:
      "Observatory overview for recent DONKI events, alert monitoring, solar watch, and geomagnetic tracking.",
    path: "/space-weather",
    sourceName: "NASA DONKI",
    sourceUrl: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/",
  });

  const latestEventLabel = overview.latestEvent
    ? getEventTypeLabel(overview.latestEvent.eventType)
    : "No recent events";

  return (
    <>
      <JsonLd data={collectionPageJsonLd} />
      <div className="shell-container py-8 md:py-10">
        <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-[#120d1b] px-6 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_50px_rgba(0,0,0,0.35)] md:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(178,102,255,0.2),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(42,238,255,0.12),transparent_30%)]" />
          <div className="absolute right-6 top-6 hidden h-28 w-28 rounded-full border border-aurora-violet/30 md:block" />
          <div className="absolute right-10 top-10 hidden h-20 w-20 rounded-full border border-aurora-violet/15 md:block" />
          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="space-y-5">
              <Badge variant="outline" className={theme.badge}>
                Live Observatory
              </Badge>
              <div className="space-y-3">
                <h1 className="font-display text-3xl tracking-wide text-foreground md:text-5xl">
                  Space Weather Observatory
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground/85 md:text-base">
                  Command view for recent solar and geomagnetic activity, with the DONKI event browser
                  now separated into its own surface and the overview tuned for fast operational scan.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground/80">
                <span className="rounded-full border border-border/50 bg-black/15 px-3 py-1.5">
                  90-day DONKI event window
                </span>
                <span className="rounded-full border border-border/50 bg-black/15 px-3 py-1.5">
                  {SPACE_WEATHER_NOTIFICATIONS_WINDOW_DAYS}-day notifications lane
                </span>
                <span className="rounded-full border border-border/50 bg-black/15 px-3 py-1.5">
                  Generated {formatTimestamp(overview.generatedAt)}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="bg-aurora-violet text-black hover:bg-aurora-violet/85">
                  <Link href="/space-weather/events">
                    Browse DONKI Events
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="border-aurora-violet/35 bg-black/15">
                  <Link href="/space-weather/alerts">Open Alerts Desk</Link>
                </Button>
              </div>
            </div>

            <Card className="border-aurora-violet/25 bg-black/20">
              <CardHeader className="gap-4">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="font-display text-xl tracking-wide">
                    Current live picture
                  </CardTitle>
                  <RadioTower className={`h-5 w-5 ${theme.icon}`} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/40 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
                      Latest event
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{latestEventLabel}</p>
                    <p className="mt-1 text-sm text-muted-foreground/80">
                      {overview.latestEvent
                        ? formatTimestamp(overview.latestEvent.startTime)
                        : "Waiting on upstream data"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/40 bg-black/20 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
                      Alert lane
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {overview.notificationSummary.total} alerts
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground/80">
                      {formatTimestamp(overview.notificationSummary.latestIssuedAt)}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground/65">
                      {(overview.notificationSummary.sourcesIncluded ?? ["donki"]).join(" + ")}
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className={theme.cardSurface}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Activity className={`h-4 w-4 ${theme.icon}`} />
                Event Stream
              </CardTitle>
              <CardDescription>
                {overview.eventSummary.total} recent events across the last {SPACE_WEATHER_EVENT_WINDOW_DAYS} days.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground/85">
              <p>
                Dominant type:{" "}
                {overview.eventSummary.dominantType
                  ? getEventTypeLabel(overview.eventSummary.dominantType)
                  : "Unavailable"}
              </p>
              <p>{overview.eventSummary.warning ?? "Event catalog responding normally."}</p>
            </CardContent>
          </Card>

          <Card className={theme.cardSurface}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <ShieldAlert className={`h-4 w-4 ${theme.icon}`} />
                Alerts Desk
              </CardTitle>
              <CardDescription>
                DONKI notifications now share the desk with NOAA SWPC operational alerts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground/85">
              <p>Last issued: {formatTimestamp(overview.notificationSummary.latestIssuedAt)}</p>
              <p>{overview.notificationSummary.warning ?? "Alert feed responding normally."}</p>
            </CardContent>
          </Card>

          <Card className={theme.cardSurface}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Sun className={`h-4 w-4 ${theme.icon}`} />
                Solar Watch
              </CardTitle>
              <CardDescription>
                GOES SUVI, D-RAP, and flare-forecast cards are now live on the dedicated solar surface.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground/85">
              <p>Primary lane: source-attributed solar imagery and forecast scan cards.</p>
              <p>Live modules: SUVI quicklook, D-RAP guidance, flare probabilities.</p>
            </CardContent>
          </Card>

          <Card className={theme.cardSurface}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Waves className={`h-4 w-4 ${theme.icon}`} />
                Geomagnetic Watch
              </CardTitle>
              <CardDescription>
                Geomagnetic storms, shocks, and high-speed streams now sit alongside GFZ Hp30 and Kyoto AE modules.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground/85">
              <p>Operational lane: disturbance context plus fast nowcast and quicklook trend indicators.</p>
              <p>Live modules: GFZ Hp30 and Kyoto AE.</p>
            </CardContent>
          </Card>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <OverviewLinkCard
            href="/space-weather/events"
            eyebrow="Event Browser"
            title="DONKI Events"
            description="Full event explorer with filtering, pagination, notifications, and event detail drill-down preserved under the new route."
            accent="bg-aurora-violet"
          />
          <OverviewLinkCard
            href="/space-weather/alerts"
            eyebrow="Alerts Desk"
            title="Alert Triage"
            description="Review recent DONKI and SWPC alerts alongside the event lanes most likely to require attention."
            accent="bg-amber-300"
          />
          <OverviewLinkCard
            href="/space-weather/solar"
            eyebrow="Solar Monitoring"
            title="Solar Surface"
            description="Track SUVI quicklook imagery, D-RAP absorption guidance, and the NOAA flare forecast in one place."
            accent="bg-orange-400"
          />
          <OverviewLinkCard
            href="/space-weather/geomagnetic"
            eyebrow="Geomagnetic Monitoring"
            title="Geomagnetic Surface"
            description="Monitor GST, IPS, HSS, GFZ Hp30, and Kyoto AE on the dedicated geomagnetic surface."
            accent="bg-cyan-400"
          />
        </section>

        <section className="mt-8 rounded-2xl border border-border/50 bg-card/70 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-300" />
            <div className="space-y-2 text-sm leading-relaxed text-muted-foreground/80">
              <p>
                The observatory is now split into dedicated surfaces. The root dashboard is server-composed
                so one degraded source only affects a single card instead of blocking the whole page.
              </p>
              <p>
                The new adapter layer lives under <code>src/lib/space-weather/</code>, which is where DONKI,
                SWPC, SUVI, GFZ, and Kyoto integrations can normalize freshness and provenance over time.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
