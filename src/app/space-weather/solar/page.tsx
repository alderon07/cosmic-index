import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Flame, Radar, SunMedium } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoTooltip, TOOLTIP_CONTENT } from "@/components/info-tooltip";
import { LearnBlock } from "@/components/space-weather/learn-block";
import { SourceAttribution } from "@/components/space-weather/source-attribution";
import { SPACE_WEATHER_EDUCATION } from "@/lib/space-weather-education";
import { buildSpaceWeatherSolarSnapshot } from "@/lib/space-weather/solar";
import { formatSpaceWeatherTimestamp } from "@/lib/space-weather/format";
import { THEMES } from "@/lib/theme";

const theme = THEMES["space-weather"];

export const metadata: Metadata = {
  title: "Solar Monitoring",
  description:
    "Live solar monitoring with GOES SUVI ultraviolet imagery, D-RAP radio absorption maps, and NOAA 3-day flare forecast probabilities.",
  alternates: {
    canonical: "https://cosmicindex.dev/space-weather/solar",
  },
};

function ProbabilityBar({ value, label, colorClass }: { value: number; label: string; colorClass: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground/85">{label}</span>
        <span className="font-mono font-medium text-foreground">{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-black/20">
        <div
          className={`h-full rounded-full transition-all ${colorClass}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default async function SpaceWeatherSolarPage() {
  const snapshot = await buildSpaceWeatherSolarSnapshot();

  return (
    <div className="shell-container py-8">
      {/* Header */}
      <section className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Badge variant="outline" className={theme.badge}>
            Solar Surface
          </Badge>
          <h1 className="font-display text-3xl tracking-wide text-foreground md:text-4xl">
            Solar Monitoring
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground/80">
            Watch the Sun in near-real-time through ultraviolet imagery, track radio absorption conditions,
            and review the latest flare forecast probabilities. All data sourced from NOAA SWPC.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="border-aurora-violet/35 bg-black/15">
            <Link href="/space-weather/events">
              Event browser
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-aurora-violet/35 bg-black/15">
            <Link href="/space-weather/alerts">Alerts desk</Link>
          </Button>
        </div>
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

      {/* GOES SUVI */}
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className={theme.cardSurface}>
          <CardHeader className="gap-3">
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <SunMedium className={`h-5 w-5 ${theme.icon}`} />
              <InfoTooltip content={TOOLTIP_CONTENT.SUVI} theme="space-weather">
                GOES SUVI
              </InfoTooltip>
            </CardTitle>
            <CardDescription>
              Real-time solar images from the Solar Ultraviolet Imager aboard NOAA&apos;s GOES satellites.
              Each wavelength reveals different layers and temperatures of the Sun&apos;s atmosphere.
            </CardDescription>
            <LearnBlock
              title="What am I looking at?"
              explanation={SPACE_WEATHER_EDUCATION.SUVI.explanation}
              impact={SPACE_WEATHER_EDUCATION.SUVI.impact}
            />
          </CardHeader>
          <CardContent>
            {snapshot.suvi ? (
              <div className="grid gap-4 md:grid-cols-3">
                {snapshot.suvi.panels.map((panel) => (
                  <article
                    key={panel.id}
                    className="overflow-hidden rounded-2xl border border-border/45 bg-black/15"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden border-b border-border/35 bg-black/30">
                      <Image
                        src={panel.imageUrl}
                        alt={panel.altText}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="font-medium text-foreground">{panel.title}</h2>
                        <span className="rounded-full border border-border/40 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
                          {panel.variant}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground/80">
                        {panel.description}
                      </p>
                      <SourceAttribution source={panel.source} className="mt-3" />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/80">
                SUVI imagery is temporarily unavailable.
              </p>
            )}
          </CardContent>
        </Card>

        {/* D-RAP */}
        <Card className={theme.cardSurface}>
          <CardHeader className="gap-3">
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <Radar className={`h-5 w-5 ${theme.icon}`} />
              <InfoTooltip content={TOOLTIP_CONTENT.DRAP} theme="space-weather">
                D-RAP
              </InfoTooltip>
            </CardTitle>
            <CardDescription>
              D-Region Absorption Prediction &mdash; shows where high-frequency radio signals
              are being absorbed in the ionosphere right now.
            </CardDescription>
            <LearnBlock
              title="How does D-RAP affect communications?"
              explanation={SPACE_WEATHER_EDUCATION.DRAP.explanation}
              impact={SPACE_WEATHER_EDUCATION.DRAP.impact}
            />
          </CardHeader>
          <CardContent>
            {snapshot.drap ? (
              <div className="space-y-4">
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border/45 bg-black/30">
                  <Image
                    src={snapshot.drap.imageUrl}
                    alt="Latest NOAA SWPC D-RAP global absorption image."
                    fill
                    sizes="(max-width: 1280px) 100vw, 40vw"
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <div className="space-y-2 text-sm text-muted-foreground/80">
                  <p>{snapshot.drap.summary}</p>
                  <p>
                    Estimated recovery: {snapshot.drap.estimatedRecoveryTime ?? "Unavailable"}
                  </p>
                  {snapshot.drap.xrayMessage ? <p>X-ray: {snapshot.drap.xrayMessage}</p> : null}
                  {snapshot.drap.protonMessage ? <p>Proton: {snapshot.drap.protonMessage}</p> : null}
                  {snapshot.drap.warnings?.map((warning) => (
                    <p key={warning} className="text-amber-200">
                      {warning}
                    </p>
                  ))}
                </div>
                <SourceAttribution source={snapshot.drap.source} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/80">
                D-RAP guidance is temporarily unavailable.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Flare Forecast + About This Data */}
      <section className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className={theme.cardSurface}>
          <CardHeader className="gap-3">
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <Flame className={`h-5 w-5 ${theme.icon}`} />
              <InfoTooltip content={TOOLTIP_CONTENT.SOLAR_FLARE} theme="space-weather">
                Flare Forecast
              </InfoTooltip>
            </CardTitle>
            <CardDescription>
              NOAA SWPC&apos;s 3-day solar flare and proton event probabilities.
            </CardDescription>
            <LearnBlock
              title="Understanding flare classes"
              explanation={SPACE_WEATHER_EDUCATION.SOLAR_FLARE.explanation}
              impact={SPACE_WEATHER_EDUCATION.SOLAR_FLARE.impact}
              scale={SPACE_WEATHER_EDUCATION.SOLAR_FLARE.scale}
            />
          </CardHeader>
          <CardContent>
            {snapshot.flareForecast ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground/80">
                  {snapshot.flareForecast.summary}
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  {snapshot.flareForecast.days.map((day) => (
                    <div
                      key={day.date}
                      className="space-y-3 rounded-2xl border border-border/45 bg-black/15 p-4"
                    >
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
                        {day.date}
                      </p>
                      <div className="space-y-2.5">
                        <ProbabilityBar
                          label="C-class"
                          value={day.cClassProbability}
                          colorClass="bg-emerald-500/80"
                        />
                        <ProbabilityBar
                          label="M-class"
                          value={day.mClassProbability}
                          colorClass="bg-amber-400/80"
                        />
                        <ProbabilityBar
                          label="X-class"
                          value={day.xClassProbability}
                          colorClass="bg-red-500/80"
                        />
                        <ProbabilityBar
                          label="10 MeV protons"
                          value={day.protonProbability}
                          colorClass="bg-aurora-violet/80"
                        />
                      </div>
                      <div className="text-xs text-muted-foreground/70">
                        <InfoTooltip content={TOOLTIP_CONTENT.POLAR_CAP_ABSORPTION} theme="space-weather">
                          Polar cap absorption
                        </InfoTooltip>
                        :{" "}
                        <span className="capitalize">{day.polarCapAbsorption}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <SourceAttribution source={snapshot.flareForecast.source} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/80">
                Flare forecast guidance is temporarily unavailable.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className={theme.cardSurface}>
          <CardHeader className="gap-3">
            <CardTitle className="font-display text-xl">
              About This Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground/80">
            <p>
              <strong className="text-muted-foreground">GOES SUVI</strong> images are &ldquo;quicklook&rdquo;
              products &mdash; the latest available frame from the satellite, not a processed archive.
              Each wavelength channel shows different temperatures: 131&#8491; highlights hot flare plasma
              (~10 million K), while 195&#8491; reveals coronal loops and structures (~1.5 million K).
            </p>
            <p>
              <strong className="text-muted-foreground">D-RAP</strong> is an operational product showing
              current radio absorption conditions. During a solar flare, increased X-ray flux ionizes
              the D-layer of the ionosphere, absorbing HF (3–30 MHz) radio waves passing through it.
            </p>
            <p>
              <strong className="text-muted-foreground">Flare forecast</strong> probabilities are from
              the latest SWPC issuance, projected across three days. C-class flares are common and minor;
              M-class can cause brief radio blackouts; X-class are rare and can cause planet-wide disruptions.
            </p>
            <p className="text-xs text-muted-foreground/60">
              Snapshot generated: {formatSpaceWeatherTimestamp(snapshot.generatedAt)}
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
