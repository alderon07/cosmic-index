import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { APODCard, APODCardSkeleton } from "@/components/apod-card";
import {
  ArrowRight,
  Circle,
  CircleDot,
  Compass,
  Crosshair,
  Orbit,
  Rocket,
  Star,
  Sun,
  Telescope,
  Zap,
} from "lucide-react";

const STAR_POSITIONS = Array.from({ length: 60 }, (_, index) => ({
  left: (index * 37 + 11) % 100,
  top: (index * 53 + 5) % 100,
  delay: ((index * 17) % 24) / 10,
  duration: 2.2 + ((index * 19) % 16) / 10,
}));

export default function HomePage() {
  return (
    <div className="relative overflow-x-hidden overflow-y-auto">
      <section className="relative isolate overflow-hidden border-b border-border/60 bg-[#0f0b08]">
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,200,135,0.28)_1px,transparent_0)] [background-size:28px_28px]" />
          <div className="absolute -left-24 top-8 h-80 w-80 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-amber-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-orange-300/18 to-transparent animate-data-sweep motion-reduce:hidden" />
          <div className="pointer-events-none absolute right-0 top-1/4 h-32 w-32 rounded-full border border-orange-300/25 animate-float-drift motion-reduce:animate-none" />
          {STAR_POSITIONS.map((star, index) => (
            <span
              key={index}
              className="absolute h-1 w-1 rounded-full bg-orange-100/60 animate-pulse"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                animationDelay: `${star.delay}s`,
                animationDuration: `${star.duration}s`,
              }}
            />
          ))}
        </div>

        <div className="relative container mx-auto max-w-7xl px-4 py-10 sm:py-16 md:py-24">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end min-w-0">
            <div className="animate-reveal-up min-w-0">
              <span className="inline-flex flex-wrap items-center gap-2 rounded-full border border-orange-300/40 bg-orange-500/10 px-3 py-1.5 text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] text-orange-200 animate-card-breathe motion-reduce:animate-none">
                <Rocket className="h-3.5 w-3.5 shrink-0" />
                <span className="break-words">Cosmic Index Command Interface</span>
              </span>

              <h1 className="mt-4 sm:mt-5 font-display text-3xl leading-tight text-orange-50 sm:text-4xl md:text-6xl lg:text-7xl break-words">
                Discover Worlds
                <span className="block text-orange-300">From Mission Control</span>
              </h1>

              <p className="mt-4 sm:mt-5 max-w-2xl text-sm sm:text-base text-orange-100/80 md:text-lg">
                An observatory for exoplanets, stars, small bodies,
                and live space data from NASA and JPL.
              </p>

              <div className="mt-6 sm:mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button asChild size="lg" className="bg-orange-500 text-black hover:bg-orange-400 glow-orange">
                  <Link href="/exoplanets">
                    <Circle className="h-5 w-5" />
                    Start with Exoplanets
                  </Link>
                </Button>
                <Button
                  asChild
                    size="lg"
                    variant="outline"
                    className="border-amber-300/55 bg-black/20 text-amber-100 hover:bg-amber-300/10"
                  >
                  <Link href="/stars">
                    <Star className="h-5 w-5" />
                    Browse Stars
                  </Link>
                </Button>
                <Button
                  asChild
                    size="lg"
                    variant="outline"
                    className="border-orange-300/45 bg-black/20 text-orange-100 hover:bg-orange-300/10"
                  >
                  <Link href="/small-bodies">
                    <CircleDot className="h-5 w-5" />
                    Track Small Bodies
                  </Link>
                </Button>
              </div>
            </div>

            <Card className="relative overflow-hidden border-orange-200/30 bg-[#1d140f]/90 p-4 sm:p-5 text-orange-100 shadow-[inset_0_0_0_1px_rgba(255,180,120,0.15)] animate-reveal-up-delay min-w-0">
              <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full border border-orange-300/25 animate-orbit-spin motion-reduce:animate-none" />
              <div className="pointer-events-none absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-orange-200/20 to-transparent animate-data-sweep motion-reduce:hidden" />
              <p className="text-xs uppercase tracking-[0.2em] text-orange-200/70">
                Payload Summary
              </p>
              <div className="mt-3 sm:mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-sm">
                <PayloadChip icon={<Circle className="h-3.5 w-3.5" />} label="Exoplanets" value="5,900+" />
                <PayloadChip icon={<Star className="h-3.5 w-3.5" />} label="Host Stars" value="4,700+" />
                <PayloadChip icon={<CircleDot className="h-3.5 w-3.5" />} label="Objects" value="1.1M" className="col-span-2 sm:col-span-1" />
              </div>
              <div className="mt-3 sm:mt-4 flex flex-col gap-2 rounded-lg border border-orange-200/20 bg-black/25 p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-xs sm:text-sm text-orange-100/80 min-w-0">
                  <Crosshair className="h-4 w-4 shrink-0 text-orange-300" />
                  <span className="truncate">Trajectory confidence</span>
                </p>
                <p className="font-mono text-lg sm:text-xl text-orange-300 shrink-0">98.2%</p>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <TelemetryPill icon={<Orbit className="h-3.5 w-3.5" />} label="Orbital map ready" />
                <TelemetryPill icon={<Compass className="h-3.5 w-3.5" />} label="Navigation lock" />
                <TelemetryPill icon={<Zap className="h-3.5 w-3.5" />} label="Power stable" />
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-7xl px-4 py-8 md:py-12 animate-reveal-up-late overflow-hidden min-w-0">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between min-w-0">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.22em] text-primary">
              Daily Telescope Feed
            </p>
            <h2 className="font-display text-xl sm:text-2xl text-foreground break-words">Astronomy Picture of the Day</h2>
          </div>
          <p className="hidden text-xs text-muted-foreground md:block shrink-0">
            APOD feed in Cosmic Index style
          </p>
        </div>
        <div className="min-w-0">
          <Suspense fallback={<APODCardSkeleton />}>
            <APODCard />
          </Suspense>
        </div>
      </section>

      <section className="container mx-auto max-w-7xl px-4 pb-10 pt-4 md:pb-20 overflow-hidden min-w-0">
        <div className="grid gap-4 sm:gap-6 md:grid-cols-3 min-w-0">
          <div className="h-full min-w-0 animate-reveal-up">
            <ReactorCard
              title="Exoplanets"
              description="Scan confirmed planets, filter by discovery method, and compare orbital properties."
              href="/exoplanets"
              icon={<Circle className="h-5 w-5" />}
              cta="Open Exoplanets"
            />
          </div>
          <div className="h-full min-w-0 animate-reveal-up-delay">
            <ReactorCard
              title="Stars"
              description="Inspect host stars, stellar classes, and linked planetary systems."
              href="/stars"
              icon={<Sun className="h-5 w-5" />}
              cta="Open Stars"
            />
          </div>
          <div className="h-full min-w-0 animate-reveal-up-late">
            <ReactorCard
              title="Small Bodies"
              description="Track asteroids and comets with close-approach context and orbit classes."
              href="/small-bodies"
              icon={<Telescope className="h-5 w-5" />}
              cta="Open Small Bodies"
            />
          </div>
        </div>

        <div className="animate-reveal-up-late relative mt-6 sm:mt-8 min-w-0 overflow-hidden rounded-2xl border border-orange-300/30 bg-[#1a120d]/80 p-4 sm:p-6 text-center">
          <div className="pointer-events-none absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-orange-300/20 to-transparent animate-data-sweep motion-reduce:hidden" />
          <h2 className="font-display text-xl sm:text-2xl text-orange-100 md:text-3xl break-words">
            Ready to Explore?
          </h2>
          <p className="mx-auto mt-2 sm:mt-3 max-w-2xl text-sm text-orange-100/70 md:text-base px-1">
            Begin exploration across Cosmic Index.
          </p>
          <div className="mt-4 sm:mt-6 flex flex-col items-stretch sm:items-center justify-center gap-3 sm:flex-row">
            <Button asChild className="w-full sm:w-auto bg-orange-500 text-black hover:bg-orange-400 text-sm sm:text-base">
              <Link href="/close-approaches">
                Explore Close Approaches
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
            <Button
              asChild
                variant="outline"
                className="w-full sm:w-auto border-amber-300/50 bg-black/15 text-amber-100 hover:bg-amber-300/10 text-sm sm:text-base"
              >
              <Link href="/space-weather">
                View Space Weather
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function PayloadChip({
  icon,
  label,
  value,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-orange-200/20 bg-black/25 p-2.5 sm:p-3 ${className ?? ""}`}>
      <p className="flex items-center gap-1.5 text-orange-200/70">
        <span className="text-orange-300">{icon}</span>
        {label}
      </p>
      <p className="mt-1 font-mono text-xl text-orange-50">{value}</p>
    </div>
  );
}

function TelemetryPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <p className="flex items-center gap-2 rounded-md border border-orange-200/15 bg-black/20 px-2.5 py-2 text-xs text-orange-100/80">
      <span className="text-orange-300">{icon}</span>
      {label}
    </p>
  );
}

function ReactorCard({
  title,
  description,
  href,
  icon,
  cta,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  cta: string;
}) {
  return (
    <Card className="group relative h-full overflow-hidden border-orange-200/20 bg-[#19120d]/80 text-orange-100 transition duration-300 hover:-translate-y-0.5 hover:border-orange-300/45">
      <div className="pointer-events-none absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-orange-300/15 to-transparent animate-data-sweep opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:hidden" />
      <CardHeader>
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg border border-orange-300/30 bg-orange-500/15 text-orange-300">
          {icon}
        </div>
        <CardTitle className="text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col">
        <p className="text-sm text-orange-100/75">{description}</p>
        <Button
          asChild
            variant="ghost"
            className="gap-2 px-0 text-orange-300 hover:bg-transparent hover:text-orange-200"
          >
          <Link href={href} className="mt-auto inline-block pt-4">
            {cta}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
