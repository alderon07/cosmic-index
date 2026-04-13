import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowRight, Compass, Waves } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTooltip, TOOLTIP_CONTENT } from "@/components/info-tooltip";
import { LearnBlock } from "@/components/space-weather/learn-block";
import { SourceAttribution } from "@/components/space-weather/source-attribution";
import { SPACE_WEATHER_EDUCATION } from "@/lib/space-weather-education";
import { SPACE_WEATHER_EVENT_ICONS } from "@/lib/space-weather-icons";
import { getEventTypeLabel } from "@/lib/nasa-donki";
import { buildSpaceWeatherGeomagneticSnapshot } from "@/lib/space-weather/geomagnetic";
import { formatSpaceWeatherTimestamp } from "@/lib/space-weather/format";
import { THEMES } from "@/lib/theme";
import { buildCollectionPageJsonLd, buildHubMetadata } from "@/lib/seo";

const theme = THEMES["space-weather"];
const SPACE_WEATHER_GEOMAGNETIC_DESCRIPTION =
  "Geomagnetic monitoring with GFZ Hp30 nowcast, Kyoto AE auroral electrojet quicklook, and recent DONKI disturbance events.";

export const metadata: Metadata = buildHubMetadata({
  title: "Geomagnetic Monitoring",
  description: SPACE_WEATHER_GEOMAGNETIC_DESCRIPTION,
  path: "/space-weather/geomagnetic",
  variantKeys: [],
  params: {},
  imageAlt: "Cosmic Index - Geomagnetic Monitoring",
});

function Hp30ScaleIndicator({ value }: { value: number | null }) {
  if (value === null) return null;
  const rounded = Math.round(value);
  const colorClass =
    rounded >= 9 ? "text-red-400 border-red-400/30 bg-red-400/10" :
    rounded >= 7 ? "text-orange-400 border-orange-400/30 bg-orange-400/10" :
    rounded >= 5 ? "text-amber-400 border-amber-400/30 bg-amber-400/10" :
    rounded >= 3 ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10" :
    "text-muted-foreground border-border/40 bg-black/10";
  const label =
    rounded >= 9 ? "Extreme" :
    rounded >= 8 ? "Severe" :
    rounded >= 7 ? "Strong" :
    rounded >= 6 ? "Moderate" :
    rounded >= 5 ? "Minor storm" :
    rounded >= 4 ? "Active" :
    "Quiet";

  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

export default async function SpaceWeatherGeomagneticPage() {
  const snapshot = await buildSpaceWeatherGeomagneticSnapshot();
  const collectionPageJsonLd = buildCollectionPageJsonLd({
    name: "Geomagnetic Monitoring",
    description: SPACE_WEATHER_GEOMAGNETIC_DESCRIPTION,
    path: "/space-weather/geomagnetic",
    sourceName: "GFZ Potsdam, Kyoto WDC, and NASA DONKI",
    sourceUrl: "https://kp.gfz.de/en/hp30-hp60/data",
    sourceDescription:
      "Geomagnetic monitoring products combining GFZ Potsdam Hp30 nowcast data, Kyoto WDC auroral electrojet quicklook data, and recent NASA DONKI disturbance events.",
    sourceCreatorName: "GFZ Potsdam, Kyoto WDC, and NASA CCMC",
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
            Geomagnetic Surface
          </Badge>
          <h1 className="font-display text-3xl tracking-wide text-foreground md:text-4xl">
            Geomagnetic Monitoring
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground/80">
            Track geomagnetic storm conditions with near-real-time magnetic field indices, auroral
            electrojet activity, and recent disturbance events from NASA DONKI. This monitoring
            surface focuses on how solar activity translates into geomagnetic response around Earth.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="border-aurora-violet/35 bg-black/15">
            <Link href="/space-weather/events">
              Browse Space Weather Events
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-aurora-violet/35 bg-black/15">
            <Link href="/space-weather/alerts">Open Space Weather Alerts</Link>
          </Button>
        </div>
      </section>

      {/* Educational block */}
      <section className="mb-6">
        <LearnBlock
          title="Understanding geomagnetic activity"
          explanation={SPACE_WEATHER_EDUCATION.GST.explanation}
          impact={SPACE_WEATHER_EDUCATION.GST.impact}
          scale={SPACE_WEATHER_EDUCATION.GST.scale}
          theme="space-weather"
        />
      </section>

      {/* Warnings */}
      {snapshot.warnings && snapshot.warnings.length > 0 ? (
        <section className="mb-6 grid gap-3">
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

      {/* Hp30 + AE */}
      <section className="grid gap-4 xl:grid-cols-2">
        {/* GFZ Hp30 */}
        <Card className={theme.cardSurface}>
          <CardHeader className="gap-3">
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <Compass className={`h-5 w-5 ${theme.icon}`} />
              <InfoTooltip content={TOOLTIP_CONTENT.HP30} theme="space-weather">
                GFZ Hp30
              </InfoTooltip>
            </CardTitle>
            <CardDescription>
              Half-hour geomagnetic nowcast from GFZ Potsdam. Faster than the traditional 3-hour
              Kp index, giving operators a more timely picture of geomagnetic conditions.
            </CardDescription>
            <LearnBlock
              title="What is the Hp30 index?"
              explanation={SPACE_WEATHER_EDUCATION.HP30.explanation}
              impact={SPACE_WEATHER_EDUCATION.HP30.impact}
              theme="space-weather"
            />
          </CardHeader>
          <CardContent>
            {snapshot.hp30 ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/45 bg-black/15 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                      Current Hp30
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <p className="text-3xl font-semibold text-foreground">
                        {snapshot.hp30.currentValue ?? "—"}
                      </p>
                      <Hp30ScaleIndicator value={snapshot.hp30.currentValue} />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/45 bg-black/15 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                      24h maximum
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <p className="text-3xl font-semibold text-foreground">
                        {snapshot.hp30.maxValue24h ?? "—"}
                      </p>
                      <Hp30ScaleIndicator value={snapshot.hp30.maxValue24h} />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                    Recent trend (last 8 readings)
                  </p>
                  <div className="grid gap-1.5">
                    {snapshot.hp30.trend.slice(-8).map((point) => (
                      <div
                        key={point.observedAt}
                        className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border border-border/35 bg-black/10 px-3 py-2 text-sm"
                      >
                        <span className="text-muted-foreground/80">
                          {formatSpaceWeatherTimestamp(point.observedAt)}
                        </span>
                        <span className="font-mono font-medium text-foreground">
                          Hp30 {point.hp30.toFixed(3)}
                        </span>
                        <span className="font-mono text-muted-foreground/70">
                          ap30 {point.ap30}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <SourceAttribution source={snapshot.hp30.source} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/80">
                GFZ Hp30 is temporarily unavailable.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Kyoto AE */}
        <Card className={theme.cardSurface}>
          <CardHeader className="gap-3">
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <Waves className={`h-5 w-5 ${theme.icon}`} />
              <InfoTooltip content={TOOLTIP_CONTENT.AE_INDEX} theme="space-weather">
                Kyoto AE
              </InfoTooltip>
            </CardTitle>
            <CardDescription>
              Auroral electrojet quicklook data from Kyoto WDC. Note: this data is provisional
              and can lag real time by up to three weeks.
            </CardDescription>
            <LearnBlock
              title="What is the AE index?"
              explanation={SPACE_WEATHER_EDUCATION.AE_INDEX.explanation}
              impact={SPACE_WEATHER_EDUCATION.AE_INDEX.impact}
              theme="space-weather"
            />
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
                      {snapshot.ae.currentValue ?? "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/60">nT (nanotesla)</p>
                  </div>
                  <div className="rounded-2xl border border-border/45 bg-black/15 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                      24h peak
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">
                      {snapshot.ae.peakValue24h ?? "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/60">nT (nanotesla)</p>
                  </div>
                </div>

                {snapshot.ae.warnings?.map((warning) => (
                  <div key={warning} className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-3 text-xs text-amber-200">
                    {warning}
                  </div>
                ))}

                <div className="space-y-1">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                    Hourly series (last 8 hours)
                  </p>
                  <div className="grid gap-1.5">
                    {snapshot.ae.hourlySeries.slice(-8).map((hour) => (
                      <div
                        key={hour.hourStart}
                        className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border border-border/35 bg-black/10 px-3 py-2 text-sm"
                      >
                        <span className="text-muted-foreground/80">
                          {formatSpaceWeatherTimestamp(hour.hourStart)}
                        </span>
                        <span className="font-mono font-medium text-foreground">
                          Mean {hour.meanValue.toFixed(1)}
                        </span>
                        <span className="font-mono text-muted-foreground/70">
                          Peak {hour.peakValue}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <SourceAttribution source={snapshot.ae.source} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/80">
                Kyoto AE is temporarily unavailable.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Disturbance Lane */}
      <section className="mt-4">
        <Card className={theme.cardSurface}>
          <CardHeader className="gap-3">
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <Activity className={`h-5 w-5 ${theme.icon}`} />
              Disturbance Lane
            </CardTitle>
            <CardDescription>
              Recent geomagnetic storms (GST), interplanetary shocks (IPS), and high-speed
              streams (HSS) from NASA DONKI that relate to the geomagnetic conditions above.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground/80">
                No recent geomagnetic-adjacent DONKI events were returned.
              </p>
            ) : null}
            {snapshot.recentEvents.map((event) => {
              const Icon = SPACE_WEATHER_EVENT_ICONS[event.eventType];
              return (
                <Link
                  key={event.id}
                  href={`/space-weather/${encodeURIComponent(event.id)}`}
                  className="block rounded-xl border border-border/45 bg-black/15 p-4 transition-colors hover:border-aurora-violet/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {Icon ? <Icon className={`h-4 w-4 ${theme.icon}`} /> : null}
                      <span className="font-medium text-foreground">
                        {getEventTypeLabel(event.eventType)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground/70">
                      {formatSpaceWeatherTimestamp(event.startTime)}
                    </span>
                  </div>
                  <p className="mt-2 font-mono text-xs text-muted-foreground/60">{event.id}</p>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </section>

      {/* About This Data */}
      <section className="mt-4">
        <Card className={theme.cardSurface}>
          <CardHeader className="gap-3">
            <CardTitle className="font-display text-xl">
              About This Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground/80">
            <p>
              <strong className="text-muted-foreground">
                <InfoTooltip content={TOOLTIP_CONTENT.HP30} theme="space-weather">
                  GFZ Hp30
                </InfoTooltip>
              </strong>{" "}
              provides the fastest planetary-activity signal, updated every 30 minutes.
              Values of 5+ correspond to geomagnetic storm conditions (G1+). This is
              near-real-time data &mdash; much faster than the traditional 3-hour Kp index.
            </p>
            <p>
              <strong className="text-muted-foreground">
                <InfoTooltip content={TOOLTIP_CONTENT.AE_INDEX} theme="space-weather">
                  Kyoto AE
                </InfoTooltip>
              </strong>{" "}
              adds auroral zone context but with a clearly marked lag. The AE index measures
              electrical currents at ~65&ndash;70&deg; latitude. Higher values indicate stronger
              substorm activity and more visible aurora.
            </p>
            <p>
              The two indices are shown together by design: Hp30 for fast response, AE for
              auroral context. Together they give a more complete picture of geomagnetic
              conditions than either alone.
            </p>
            <p className="text-xs text-muted-foreground/60">
              Snapshot generated: {formatSpaceWeatherTimestamp(snapshot.generatedAt)}
            </p>
          </CardContent>
        </Card>
      </section>
      </div>
    </>
  );
}
