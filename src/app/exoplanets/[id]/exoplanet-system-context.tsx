import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DETAIL_CARD_SURFACE_CLASS, THEMES } from "@/lib/theme";
import type { ExoplanetData, StarData } from "@/lib/types";
import {
  buildExoplanetDetailNarrative,
  getRelatedExoplanets,
} from "@/lib/exoplanet-detail";
import { Circle, Orbit, Star } from "lucide-react";

interface ExoplanetSystemContextProps {
  exoplanet: ExoplanetData;
  hostStar: StarData | null;
  systemPlanets: ExoplanetData[];
}

export function ExoplanetSystemContext({
  exoplanet,
  hostStar,
  systemPlanets,
}: ExoplanetSystemContextProps) {
  const narrative = buildExoplanetDetailNarrative(exoplanet);
  const relatedPlanets = getRelatedExoplanets(systemPlanets, exoplanet.id);

  if (narrative.length === 0 && !hostStar && relatedPlanets.length === 0) {
    return null;
  }

  return (
    <Card tone="neutral" className={DETAIL_CARD_SURFACE_CLASS}>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Orbit className="h-5 w-5 text-primary" />
          System Context
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {narrative.length > 0 ? (
          <div className="space-y-3 text-sm leading-7 text-foreground">
            {narrative.map((sentence) => (
              <p key={sentence}>{sentence}</p>
            ))}
          </div>
        ) : null}

        {hostStar ? (
          <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Star className="h-4 w-4 text-uranium-green" />
              Host star
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Explore the stellar record for this system to compare temperature,
              spectral type, and known planets.
            </p>
            <Link
              href={`/stars/${hostStar.id}`}
              className={`mt-3 inline-flex text-sm ${THEMES.stars.hoverText}`}
            >
              Open {hostStar.displayName}
            </Link>
          </div>
        ) : null}

        {relatedPlanets.length > 0 ? (
          <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Circle className="h-4 w-4 text-primary" />
              More planets in this system
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {relatedPlanets.map((planet) => (
                <Link
                  key={planet.id}
                  href={`/exoplanets/${planet.id}`}
                  className="rounded-md border border-primary/25 bg-primary/5 px-3 py-1.5 text-sm text-primary transition-colors hover:bg-primary/10"
                >
                  {planet.displayName}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
