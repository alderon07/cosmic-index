import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Flame, Radar, SunMedium } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SpaceWeatherSourceMeta } from "@/lib/types";
import { buildSpaceWeatherSolarSnapshot } from "@/lib/space-weather/solar";
import { THEMES } from "@/lib/theme";

const theme = THEMES["space-weather"];

export const metadata: Metadata = {
  title: "Solar Monitoring",
  description:
    "Solar monitoring surface for GOES SUVI imagery, D-RAP absorption guidance, and NOAA flare forecast probabilities.",
  alternates: {
    canonical: "https://cosmicindex.dev/space-weather/solar",
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

export default async function SpaceWeatherSolarPage() {
  const snapshot = await buildSpaceWeatherSolarSnapshot();

  return (
    <div className="shell-container py-8">
      <section className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Badge variant="outline" className={theme.badge}>
            Solar Surface
          </Badge>
          <h1 className="font-display text-3xl tracking-wide text-foreground md:text-4xl">
            Solar Monitoring
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground/80">
            Media-first solar watch tuned for fast scan: GOES SUVI quicklook imagery, D-RAP
            absorption guidance, and NOAA flare probabilities with provenance and freshness on every
            module.
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

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className={theme.cardSurface}>
          <CardHeader className="gap-3">
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <SunMedium className={`h-5 w-5 ${theme.icon}`} />
              GOES SUVI
            </CardTitle>
            <CardDescription>
              Quicklook solar imagery cards pulled from the current SWPC GOES SUVI lanes.
            </CardDescription>
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
                      <SourceMetaBlock source={panel.source} />
                      <a
                        href={panel.productUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex text-sm text-aurora-violet underline-offset-4 hover:underline"
                      >
                        View upstream product
                      </a>
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

        <Card className={theme.cardSurface}>
          <CardHeader className="gap-3">
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <Radar className={`h-5 w-5 ${theme.icon}`} />
              D-RAP
            </CardTitle>
            <CardDescription>
              D-region absorption guidance for current radio-blackout context.
            </CardDescription>
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
                <SourceMetaBlock source={snapshot.drap.source} />
                <a
                  href={snapshot.drap.productUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex text-sm text-aurora-violet underline-offset-4 hover:underline"
                >
                  View upstream product
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/80">
                D-RAP guidance is temporarily unavailable.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className={theme.cardSurface}>
          <CardHeader className="gap-3">
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <Flame className={`h-5 w-5 ${theme.icon}`} />
              Flare Forecast
            </CardTitle>
            <CardDescription>
              NOAA SWPC flare and proton probabilities projected across the next three days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {snapshot.flareForecast ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground/80">
                  {snapshot.flareForecast.summary}
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  {snapshot.flareForecast.days.map((day) => (
                    <div
                      key={day.date}
                      className="rounded-2xl border border-border/45 bg-black/15 p-4"
                    >
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                        {day.date}
                      </p>
                      <div className="mt-3 space-y-1 text-sm text-muted-foreground/85">
                        <p>C-class: {day.cClassProbability}%</p>
                        <p>M-class: {day.mClassProbability}%</p>
                        <p>X-class: {day.xClassProbability}%</p>
                        <p>10 MeV protons: {day.protonProbability}%</p>
                        <p className="capitalize">
                          Polar cap absorption: {day.polarCapAbsorption}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <SourceMetaBlock source={snapshot.flareForecast.source} />
                <a
                  href={snapshot.flareForecast.source.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex text-sm text-aurora-violet underline-offset-4 hover:underline"
                >
                  View upstream product
                </a>
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
            <CardTitle className="flex items-center gap-2 font-display text-xl">
              <AlertTriangle className={`h-5 w-5 ${theme.icon}`} />
              Operator Notes
            </CardTitle>
            <CardDescription>
              A compact operations view for current imagery, absorption context, and near-term
              flare guidance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground/80">
            <p>
              SUVI stays focused on fast-scan quicklooks: the latest imagery, clear provenance, and
              a direct upstream link instead of custom playback chrome.
            </p>
            <p>
              D-RAP is surfaced as an operations card first, with the current image and status text
              carried together so degraded radio conditions are readable without leaving the product.
            </p>
            <p>
              The flare module uses the latest SWPC issuance and expands its 1-day, 2-day, and
              3-day probabilities into a compact scan card for faster comparison.
            </p>
            <p>Snapshot generated: {formatTimestamp(snapshot.generatedAt)}</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
