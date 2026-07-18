import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Gauge, Magnet, Orbit, Wind } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTooltip, TOOLTIP_CONTENT } from "@/components/info-tooltip";
import { LearnBlock } from "@/components/space-weather/learn-block";
import { SourceAttribution } from "@/components/space-weather/source-attribution";
import { formatSpaceWeatherTimestamp } from "@/lib/space-weather/format";
import { SPACE_WEATHER_EDUCATION } from "@/lib/space-weather-education";
import { buildSpaceWeatherSolarWindSnapshot } from "@/lib/space-weather/solar-wind";
import { THEMES } from "@/lib/theme";
import { buildCollectionPageJsonLd, buildHubMetadata } from "@/lib/seo";

const theme = THEMES["space-weather"];
const SPACE_WEATHER_SOLAR_WIND_DESCRIPTION =
  "Live solar wind and IMF monitoring with NOAA SWPC plasma speed, density, southward Bz, and propagated geospace context for geomagnetic storm awareness.";

export const metadata: Metadata = buildHubMetadata({
  title: "Solar Wind & IMF",
  description: SPACE_WEATHER_SOLAR_WIND_DESCRIPTION,
  path: "/space-weather/solar-wind",
  variantKeys: [],
  params: {},
  imageAlt: "Cosmic Index - Solar Wind and IMF Monitoring",
});

function formatMetric(value: number | null, digits = 1) {
  if (value === null) return "—";
  return value.toFixed(digits);
}

function CouplingBadge({ risk }: { risk: string }) {
  const className =
    risk === "storm-favorable" ? "border-red-400/30 bg-red-400/10 text-red-300" :
    risk === "elevated" ? "border-amber-300/30 bg-amber-300/10 text-amber-200" :
    risk === "watch" ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200" :
    risk === "quiet" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" :
    "border-border/40 bg-black/10 text-muted-foreground";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] ${className}`}>
      {risk}
    </span>
  );
}

export default async function SpaceWeatherSolarWindPage() {
  const pageSnapshot = await buildSpaceWeatherSolarWindSnapshot();
  const snapshot = pageSnapshot.snapshot;
  const collectionPageJsonLd = buildCollectionPageJsonLd({
    name: "Solar Wind & IMF",
    description: SPACE_WEATHER_SOLAR_WIND_DESCRIPTION,
    path: "/space-weather/solar-wind",
    sourceName: "NOAA SWPC Real-Time Solar Wind Products",
    sourceUrl: "https://www.swpc.noaa.gov/products/real-time-solar-wind",
    sourceDescription:
      "NOAA SWPC live solar wind plasma, interplanetary magnetic field, and propagated geospace products used to monitor speed, density, Bz orientation, and geomagnetic storm potential near Earth.",
    sourceCreatorName: "NOAA Space Weather Prediction Center",
    sourceCreatorUrl: "https://www.swpc.noaa.gov/",
    items: [
      { name: "Solar Monitoring", path: "/space-weather/solar" },
      { name: "Geomagnetic Monitoring", path: "/space-weather/geomagnetic" },
      { name: "Space Weather Alerts", path: "/space-weather/alerts" },
      { name: "Space Weather Events", path: "/space-weather/events" },
    ],
  });

  return (
    <>
      <JsonLd data={collectionPageJsonLd} />
      <div className="shell-container py-8">
        <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className={theme.badge}>
              Solar Wind Stream
            </Badge>
            <h1 className="font-display text-3xl tracking-wide text-foreground md:text-4xl">
              Solar Wind &amp; IMF
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground/80">
              Monitor live solar wind speed, density, and interplanetary magnetic field conditions
              before their effects show up in geomagnetic indices. This solar wind and IMF page
              focuses on plasma flow, southward Bz, and propagated near-Earth context that often
              sets the stage for geomagnetic storms and stronger aurora conditions.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="border-aurora-violet/35 bg-black/15">
              <Link href="/space-weather/geomagnetic">
                Open Geomagnetic Monitoring
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-aurora-violet/35 bg-black/15">
              <Link href="/space-weather/alerts">Open Space Weather Alerts</Link>
            </Button>
          </div>
        </section>

        <section className="mb-6 grid gap-4 xl:grid-cols-2">
          <LearnBlock
            title="What is the solar wind?"
            explanation={SPACE_WEATHER_EDUCATION.SOLAR_WIND.explanation}
            impact={SPACE_WEATHER_EDUCATION.SOLAR_WIND.impact}
            theme="space-weather"
          />
          <LearnBlock
            title="Why does southward Bz matter?"
            explanation={SPACE_WEATHER_EDUCATION.IMF_BZ.explanation}
            impact={SPACE_WEATHER_EDUCATION.IMF_BZ.impact}
            theme="space-weather"
          />
        </section>

        {pageSnapshot.warnings && pageSnapshot.warnings.length > 0 ? (
          <section className="mb-6 grid gap-3">
            {pageSnapshot.warnings.map((warning) => (
              <div
                key={warning}
                className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-muted-foreground/80"
              >
                {warning}
              </div>
            ))}
          </section>
        ) : null}

        <section className="mb-4">
          <Card className={theme.cardSurface}>
            <CardHeader className="gap-3">
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <Gauge className={`h-5 w-5 ${theme.icon}`} />
                Current Conditions
              </CardTitle>
              <CardDescription>
                Snapshot values derived from NOAA SWPC live solar wind plasma and IMF feeds.
              </CardDescription>
              {snapshot ? (
                <div className="pt-1">
                  <CouplingBadge risk={snapshot.interpretation.couplingRisk} />
                </div>
              ) : null}
            </CardHeader>
            <CardContent>
              {snapshot ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-border/45 bg-black/15 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                      Solar Wind Speed
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">
                      {formatMetric(snapshot.current.speedKms)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/65">km/s</p>
                  </div>
                  <div className="rounded-2xl border border-border/45 bg-black/15 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                      Density
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">
                      {formatMetric(snapshot.current.densityPerCc, 2)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/65">particles/cm3</p>
                  </div>
                  <div className="rounded-2xl border border-border/45 bg-black/15 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                      IMF Bz
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">
                      {formatMetric(snapshot.current.bzNt)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/65">nT</p>
                  </div>
                  <div className="rounded-2xl border border-border/45 bg-black/15 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                      Total Field Bt
                    </p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">
                      {formatMetric(snapshot.current.btNt)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/65">nT</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/80">
                  Solar wind telemetry is temporarily unavailable.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 xl:grid-cols-2 xl:items-stretch">
          <Card className={`${theme.cardSurface} flex h-full flex-col`}>
            <CardHeader className="gap-3 xl:min-h-[12.5rem]">
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <Magnet className={`h-5 w-5 ${theme.icon}`} />
                <InfoTooltip content={TOOLTIP_CONTENT.IMF_BZ} theme="space-weather">
                  IMF Orientation
                </InfoTooltip>
              </CardTitle>
              <CardDescription>
                The interplanetary magnetic field is the most important upstream control on whether
                solar wind can couple efficiently into Earth&apos;s magnetosphere.
              </CardDescription>
              {snapshot ? (
                <p className="text-sm leading-relaxed text-muted-foreground/80">
                  {snapshot.interpretation.summary}
                </p>
              ) : null}
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              {snapshot?.imf ? (
                <div className="flex h-full flex-col space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/45 bg-black/15 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                        Latest Bz
                      </p>
                      <p className="mt-2 text-3xl font-semibold text-foreground">
                        {formatMetric(snapshot.imf.currentValue?.bzNt ?? null)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/65">nT</p>
                    </div>
                    <div className="rounded-2xl border border-border/45 bg-black/15 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                        Latest Bt
                      </p>
                      <p className="mt-2 text-3xl font-semibold text-foreground">
                        {formatMetric(snapshot.imf.currentValue?.btNt ?? null)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/65">nT</p>
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                      Recent IMF samples
                    </p>
                    <div className="grid gap-1.5">
                      {snapshot.imf.trend.slice(-8).map((point) => (
                        <div
                          key={point.observedAt}
                          className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border border-border/35 bg-black/10 px-3 py-2 text-sm"
                        >
                          <span className="text-muted-foreground/80">
                            {formatSpaceWeatherTimestamp(point.observedAt)}
                          </span>
                          <span className="font-mono font-medium text-foreground">
                            Bz {formatMetric(point.bzNt)}
                          </span>
                          <span className="font-mono text-muted-foreground/70">
                            Bt {formatMetric(point.btNt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <SourceAttribution source={snapshot.imf.source} className="mt-auto" />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/80">
                  IMF data is temporarily unavailable.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className={`${theme.cardSurface} flex h-full flex-col`}>
            <CardHeader className="gap-3 xl:min-h-[12.5rem]">
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <Wind className={`h-5 w-5 ${theme.icon}`} />
                <InfoTooltip content={TOOLTIP_CONTENT.SOLAR_WIND} theme="space-weather">
                  Solar Wind Plasma
                </InfoTooltip>
              </CardTitle>
              <CardDescription>
                Speed, density, and temperature show how energetic the upstream solar wind flow is
                before it interacts with Earth.
              </CardDescription>
              {snapshot?.plasma ? (
                <p className="text-sm leading-relaxed text-muted-foreground/80">
                  Current plasma flow helps show whether the upstream stream is quiet, compressed,
                  or moving fast enough to amplify geomagnetic coupling if the IMF turns southward.
                </p>
              ) : null}
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              {snapshot?.plasma ? (
                <div className="flex h-full flex-col space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border/45 bg-black/15 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                        Speed
                      </p>
                      <p className="mt-2 text-3xl font-semibold text-foreground">
                        {formatMetric(snapshot.plasma.currentValue?.speedKms ?? null)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/65">km/s</p>
                    </div>
                    <div className="rounded-2xl border border-border/45 bg-black/15 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                        Density
                      </p>
                      <p className="mt-2 text-3xl font-semibold text-foreground">
                        {formatMetric(snapshot.plasma.currentValue?.densityPerCc ?? null, 2)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/65">particles/cm3</p>
                    </div>
                    <div className="rounded-2xl border border-border/45 bg-black/15 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                        Temperature
                      </p>
                      <p className="mt-2 text-3xl font-semibold text-foreground">
                        {snapshot.plasma.currentValue?.temperatureK?.toLocaleString() ?? "—"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/65">K</p>
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                      Recent plasma samples
                    </p>
                    <div className="grid gap-1.5">
                      {snapshot.plasma.trend.slice(-8).map((point) => (
                        <div
                          key={point.observedAt}
                          className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl border border-border/35 bg-black/10 px-3 py-2 text-sm"
                        >
                          <span className="text-muted-foreground/80">
                            {formatSpaceWeatherTimestamp(point.observedAt)}
                          </span>
                          <span className="font-mono font-medium text-foreground">
                            {formatMetric(point.speedKms)} km/s
                          </span>
                          <span className="font-mono text-muted-foreground/70">
                            {formatMetric(point.densityPerCc, 2)} /cc
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <SourceAttribution source={snapshot.plasma.source} className="mt-auto" />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/80">
                  Solar wind plasma data is temporarily unavailable.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="mt-4">
          <Card className={theme.cardSurface}>
            <CardHeader className="gap-3">
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <Orbit className={`h-5 w-5 ${theme.icon}`} />
                <InfoTooltip content={TOOLTIP_CONTENT.PROPAGATED_SOLAR_WIND} theme="space-weather">
                  Propagated Geospace Context
                </InfoTooltip>
              </CardTitle>
              <CardDescription>
                NOAA&apos;s propagated product helps bridge upstream measurements toward near-Earth
                conditions as the solar wind approaches geospace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {snapshot?.propagated ? (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-border/45 bg-black/15 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                        Propagated speed
                      </p>
                      <p className="mt-2 text-3xl font-semibold text-foreground">
                        {formatMetric(snapshot.propagated.currentValue?.speedKms ?? null)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/65">km/s</p>
                    </div>
                    <div className="rounded-2xl border border-border/45 bg-black/15 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                        Propagated Bz
                      </p>
                      <p className="mt-2 text-3xl font-semibold text-foreground">
                        {formatMetric(snapshot.propagated.currentValue?.bzNt ?? null)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/65">nT</p>
                    </div>
                    <div className="rounded-2xl border border-border/45 bg-black/15 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                        Propagated Bt
                      </p>
                      <p className="mt-2 text-3xl font-semibold text-foreground">
                        {formatMetric(snapshot.propagated.currentValue?.btNt ?? null)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground/65">nT</p>
                    </div>
                    <div className="rounded-2xl border border-border/45 bg-black/15 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                        Earth-arrival estimate
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {formatSpaceWeatherTimestamp(snapshot.propagated.currentValue?.propagatedAt ?? null)}
                      </p>
                    </div>
                  </div>
                  <SourceAttribution source={snapshot.propagated.source} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground/80">
                  Propagated solar wind guidance is temporarily unavailable.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="mt-4">
          <Card className={theme.cardSurface}>
            <CardHeader className="gap-3">
              <CardTitle className="font-display text-xl">About This Data</CardTitle>
              <CardDescription>
                NOAA SWPC live solar wind and magnetic-field products are sampled upstream of Earth,
                then propagated forward to provide a simple geospace context layer. This page is
                designed for solar wind monitoring and geomagnetic storm awareness rather than as a
                formal forecast product.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-3">
              {snapshot?.plasma ? <SourceAttribution source={snapshot.plasma.source} /> : null}
              {snapshot?.imf ? <SourceAttribution source={snapshot.imf.source} /> : null}
              {snapshot?.propagated ? <SourceAttribution source={snapshot.propagated.source} /> : null}
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
}
