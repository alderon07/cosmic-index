import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ObjectCard } from "@/components/object-card";
import { ExoplanetData } from "@/lib/types";
import { Circle } from "lucide-react";

interface StarPlanetsProps {
  hostname: string;
  planetCount: number;
  planets: ExoplanetData[];
  error?: string | null;
}

export function StarPlanets({ hostname, planetCount, planets, error }: StarPlanetsProps) {
  return (
    <Card className="bg-card border-border/50 bezel">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Circle className="w-5 h-5 text-primary" />
          Planets in this System
          <span className="text-muted-foreground font-normal text-base">
            ({planetCount} known)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Error State */}
        {error && (
          <div className="p-6 bg-destructive/10 border border-destructive/50 rounded-lg text-center">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* Planets Grid */}
        {!error && planets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {planets.map((planet) => (
              <ObjectCard key={planet.id} object={planet} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!error && planets.length === 0 && (
          <div className="p-8 text-center">
            <Circle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              No planets catalogued yet for {hostname}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
