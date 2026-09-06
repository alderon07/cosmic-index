import { GuideLink } from "@/components/guide-link";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { buildCollectionPageJsonLd, buildHubMetadata } from "@/lib/seo";
import { LearnBlock } from "@/components/space-weather/learn-block";
import { SPACE_WEATHER_EDUCATION } from "@/lib/space-weather-education";
import { buildSpaceWeatherOverviewSnapshot } from "@/lib/space-weather/overview";
import { ObservatoryDashboardClient } from "@/app/space-weather/observatory-dashboard-client";
import { THEMES } from "@/lib/theme";

const theme = THEMES["space-weather"];
const SPACE_WEATHER_OVERVIEW_DESCRIPTION =
  "Live space weather dashboard tracking solar flares, coronal mass ejections, geomagnetic storms, and operational alerts from NASA DONKI and NOAA SWPC.";

export const metadata: Metadata = buildHubMetadata({
  title: "Space Weather Observatory",
  description: SPACE_WEATHER_OVERVIEW_DESCRIPTION,
  path: "/space-weather",
  variantKeys: [],
  params: {},
  imageAlt: "Cosmic Index - Space Weather Observatory",
});

export default async function SpaceWeatherPage() {
  const overview = await buildSpaceWeatherOverviewSnapshot();
  const collectionPageJsonLd = buildCollectionPageJsonLd({
    name: "Space Weather Observatory",
    description: SPACE_WEATHER_OVERVIEW_DESCRIPTION,
    path: "/space-weather",
    sourceName: "NASA DONKI",
    sourceUrl: "https://kauai.ccmc.gsfc.nasa.gov/DONKI/",
    sourceDescription:
      "Space weather observatory overview combining NASA DONKI events with NOAA SWPC monitoring products for solar and geomagnetic conditions.",
    items: [
      { name: "Space Weather Events", path: "/space-weather/events" },
      { name: "Space Weather Alerts", path: "/space-weather/alerts" },
      { name: "Solar Monitoring", path: "/space-weather/solar" },
      { name: "Solar Wind & IMF", path: "/space-weather/solar-wind" },
      { name: "Geomagnetic Monitoring", path: "/space-weather/geomagnetic" },
    ],
  });

  return (
    <>
      <JsonLd data={collectionPageJsonLd} />
      <div className="shell-container py-8 md:py-10">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-border/50 bg-[#120d1b] px-6 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_50px_rgba(0,0,0,0.35)] md:px-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(178,102,255,0.2),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(42,238,255,0.12),transparent_30%)]" />
          <div className="absolute right-6 top-6 hidden h-28 w-28 rounded-full border border-aurora-violet/30 md:block" />
          <div className="absolute right-10 top-10 hidden h-20 w-20 rounded-full border border-aurora-violet/15 md:block" />
          <div className="relative space-y-5">
            <Badge variant="outline" className={theme.badge}>
              <Radio className="mr-1.5 h-3 w-3" />
              Live Observatory
            </Badge>
            <div className="space-y-3">
              <h1 className="font-display text-3xl tracking-wide text-foreground md:text-5xl">
                Space Weather Observatory
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-muted-foreground/85">
                Track space weather in near real time with a live dashboard for solar flares,
                coronal mass ejections, geomagnetic storms, radio blackouts, and operational
                alerts. This observatory brings together NASA DONKI events and NOAA SWPC
                monitoring so you can follow what the Sun is doing and how Earth responds.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-aurora-violet text-black hover:bg-aurora-violet/85">
                <Link href="/space-weather/events">
                  Browse Space Weather Events
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-aurora-violet/35 bg-black/15">
                <Link href="/space-weather/alerts">Open Space Weather Alerts</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Educational block */}
        <section className="mt-6">
          <LearnBlock
            title="What is space weather?"
            explanation={SPACE_WEATHER_EDUCATION.SPACE_WEATHER.explanation}
            impact={SPACE_WEATHER_EDUCATION.SPACE_WEATHER.impact}
            theme="space-weather"
            defaultOpen
          />
          <GuideLink slug="reading-space-weather" />
        </section>

        {/* Client-rendered dashboard with React Query auto-refresh */}
        <ObservatoryDashboardClient initialData={overview} />

        {/* Data source attribution */}
        <section className="mt-8 rounded-2xl border border-border/50 bg-card/70 p-5">
          <div className="space-y-2 text-sm leading-relaxed text-muted-foreground/80">
            <p className="font-medium text-muted-foreground">
              About this data
            </p>
            <p>
              Event data comes from NASA&apos;s{" "}
              <a
                href="https://kauai.ccmc.gsfc.nasa.gov/DONKI/"
                target="_blank"
                rel="noreferrer"
                className="text-aurora-violet underline-offset-4 hover:underline"
              >
                DONKI
              </a>{" "}
              (Database Of Notifications, Knowledge, Information) maintained by the CCMC.
              Operational alerts are supplemented by{" "}
              <a
                href="https://www.swpc.noaa.gov/"
                target="_blank"
                rel="noreferrer"
                className="text-aurora-violet underline-offset-4 hover:underline"
              >
                NOAA SWPC
              </a>
              . Data refreshes automatically while this page is open.
            </p>
            <p>
              Need a plain-language primer on terms like CME, geomagnetic storm, or southward Bz?{" "}
              <Link href="/faq" className="text-aurora-violet underline-offset-4 hover:underline">
                Read the FAQ
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
