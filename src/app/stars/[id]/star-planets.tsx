"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ObjectCard } from "@/components/object-card";
import { ExoplanetData } from "@/lib/types";
import { apiFetch } from "@/lib/api-client";
import { Circle, Loader2 } from "lucide-react";

interface StarPlanetsProps {
  starId: string;
  hostname: string;
  planetCount: number;
}

export function StarPlanets({ starId, hostname, planetCount }: StarPlanetsProps) {
  const [planets, setPlanets] = useState<ExoplanetData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlanets() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await apiFetch<{ planets: ExoplanetData[] }>(`/stars/${starId}/planets`);
        setPlanets(data.planets || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPlanets();
  }, [starId]);

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
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading planets...</span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="p-6 bg-destructive/10 border border-destructive/50 rounded-lg text-center">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* Planets Grid */}
        {!isLoading && !error && planets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {planets.map((planet) => (
              <ObjectCard key={planet.id} object={planet} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && planets.length === 0 && (
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
