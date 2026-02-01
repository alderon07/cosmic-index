import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Circle,
  CircleDot,
  Telescope,
  ArrowRight,
  Orbit,
  Rocket,
  Star,
  Sun,
} from "lucide-react";

// Pre-computed star positions for deterministic rendering
const STAR_POSITIONS = Array.from({ length: 50 }, (_, i) => ({
  left: (i * 37 + 13) % 100,
  top: (i * 53 + 7) % 100,
  animationDelay: ((i * 17) % 30) / 10,
  animationDuration: 2 + ((i * 23) % 20) / 10,
}));

export default function HomePage() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative hero-gradient overflow-hidden">
        {/* Animated Starfield Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="stars-container">
            {STAR_POSITIONS.map((star, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-foreground/30 rounded-full animate-pulse"
                style={{
                  left: `${star.left}%`,
                  top: `${star.top}%`,
                  animationDelay: `${star.animationDelay}s`,
                  animationDuration: `${star.animationDuration}s`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-card/50 border border-border/50 rounded-full mb-8">
              <Rocket className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground font-mono">
                Explore the Cosmos
              </span>
            </div>

            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl text-foreground mb-6 leading-tight">
              Discover Worlds
              <span className="block text-primary nixie">Beyond Our Own</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              An encyclopedia of cosmic objects. Explore thousands of
              exoplanets, host stars, asteroids, and comets with data from NASA
              and JPL.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/exoplanets">
                <Button size="lg" className="glow-orange font-display gap-2">
                  <Circle className="w-5 h-5" />
                  Explore Exoplanets
                </Button>
              </Link>
              <Link href="/stars">
                <Button
                  size="lg"
                  variant="outline"
                  className="font-display gap-2 border-uranium-green/50 text-uranium-green hover:bg-uranium-green/10 hover:border-uranium-green"
                >
                  <Star className="w-5 h-5" />
                  Browse Stars
                </Button>
              </Link>
              <Link href="/small-bodies">
                <Button
                  size="lg"
                  variant="outline"
                  className="font-display gap-2 border-secondary/50 text-secondary hover:bg-secondary/10 hover:border-secondary"
                >
                  <CircleDot className="w-5 h-5" />
                  Browse Small Bodies
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative gradient orbs */}
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />
      </section>

      {/* Feature Sections */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          {/* Exoplanets Section — primary (reactor orange) theme */}
          <Card className="bg-card border-border/50 bezel scanlines overflow-hidden group hover:border-primary/50 transition-colors">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4 group-hover:glow-orange transition-all">
                <Circle className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="font-display text-2xl">
                Exoplanets
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Explore confirmed exoplanets from NASA&apos;s Exoplanet Archive.
                Filter by discovery method, size, mass, and more.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Circle className="w-4 h-4 text-primary shrink-0" />
                  5,000+ confirmed planets
                </li>
                <li className="flex items-center gap-2">
                  <Telescope className="w-4 h-4 text-primary shrink-0" />
                  Multiple discovery methods
                </li>
                <li className="flex items-center gap-2">
                  <Circle className="w-4 h-4 text-primary shrink-0" />
                  Physical & orbital data
                </li>
              </ul>
              <Link href="/exoplanets" className="inline-block">
                <Button variant="ghost" className="gap-2 group/btn text-primary hover:text-primary hover:bg-primary/10">
                  Browse Exoplanets
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Stars Section — uranium-green theme */}
          <Card className="bg-card border-border/50 bezel scanlines overflow-hidden group hover:border-uranium-green/50 transition-colors">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-uranium-green/20 flex items-center justify-center mb-4 group-hover:glow-uranium transition-all">
                <Star className="w-6 h-6 text-uranium-green" />
              </div>
              <CardTitle className="font-display text-2xl">Stars</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Discover host stars from NASA&apos;s Exoplanet Archive. Explore
                stellar properties and their planetary systems.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-uranium-green shrink-0" />
                  4,500+ host stars
                </li>
                <li className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-uranium-green shrink-0" />
                  Spectral classifications
                </li>
                <li className="flex items-center gap-2">
                  <Orbit className="w-4 h-4 text-uranium-green shrink-0" />
                  Linked planetary systems
                </li>
              </ul>
              <Link href="/stars" className="inline-block">
                <Button variant="ghost" className="gap-2 group/btn text-uranium-green hover:text-uranium-green hover:bg-uranium-green/10">
                  Browse Stars
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Small Bodies Section — secondary (amber) theme */}
          <Card className="bg-card border-border/50 bezel scanlines overflow-hidden group hover:border-secondary/50 transition-colors">
            <CardHeader className="pb-4">
              <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center mb-4 group-hover:glow-amber transition-all">
                <CircleDot className="w-6 h-6 text-secondary" />
              </div>
              <CardTitle className="font-display text-2xl">
                Small Bodies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Discover asteroids and comets from JPL&apos;s Small-Body
                Database. Track near-Earth objects and potentially hazardous
                asteroids.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CircleDot className="w-4 h-4 text-secondary shrink-0" />
                  1,000,000+ asteroids & comets
                </li>
                <li className="flex items-center gap-2">
                  <Orbit className="w-4 h-4 text-secondary shrink-0" />
                  Near-Earth Objects (NEOs)
                </li>
                <li className="flex items-center gap-2">
                  <Orbit className="w-4 h-4 text-secondary shrink-0" />
                  Orbit classifications
                </li>
              </ul>
              <Link href="/small-bodies" className="inline-block">
                <Button variant="ghost" className="gap-2 group/btn text-secondary hover:text-secondary hover:bg-secondary/10">
                  Browse Small Bodies
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Stats Section */}
      {/* <section className="border-y border-border/50 bg-card/30">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <p className="font-display text-3xl md:text-4xl text-primary nixie mb-2">
                5,000+
              </p>
              <p className="text-sm text-muted-foreground">
                Confirmed Exoplanets
              </p>
            </div>
            <div className="text-center">
              <p className="font-display text-3xl md:text-4xl text-secondary nixie mb-2">
                1M+
              </p>
              <p className="text-sm text-muted-foreground">Asteroids & Comets</p>
            </div>
            <div className="text-center">
              <p className="font-display text-3xl md:text-4xl text-accent nixie mb-2">
                30,000+
              </p>
              <p className="text-sm text-muted-foreground">Near-Earth Objects</p>
            </div>
            <div className="text-center">
              <p className="font-display text-3xl md:text-4xl text-radium-teal nixie mb-2">
                2
              </p>
              <p className="text-sm text-muted-foreground">Data Sources</p>
            </div>
          </div>
        </div>
      </section> */}

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-2xl md:text-3xl text-foreground mb-4">
            Ready to Explore?
          </h2>
          <p className="text-muted-foreground mb-8">
            Start your journey through the cosmos. Search for specific objects
            or browse by category.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/exoplanets">
              <Button className="glow-orange font-display">
                Start with Exoplanets
              </Button>
            </Link>
            <Link href="/stars">
              <Button
                variant="outline"
                className="font-display border-uranium-green/50 text-uranium-green hover:bg-uranium-green/10 hover:border-uranium-green"
              >
                Explore Stars
              </Button>
            </Link>
            <Link href="/small-bodies">
              <Button
                variant="outline"
                className="font-display border-secondary/50 text-secondary hover:bg-secondary/10 hover:border-secondary"
              >
                Explore Small Bodies
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
