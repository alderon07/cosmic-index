"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CloseApproach } from "@/lib/types";
import { getSizeCategory } from "@/lib/cneos-close-approach";
import { THEMES } from "@/lib/theme";
import { AlertTriangle, Gauge, Ruler, Calendar } from "lucide-react";

const theme = THEMES["close-approaches"];

interface CloseApproachCardProps {
  approach: CloseApproach;
  showHighlightBadge?: "closest" | "fastest";
}

export function CloseApproachCard({ approach, showHighlightBadge }: CloseApproachCardProps) {
  const sizeCategory = getSizeCategory(approach.diameterEstimated);

  // Format velocity
  const velocityKmS = approach.relativeVelocityKmS.toFixed(1);

  // Format diameter range
  let diameterDisplay = "Unknown";
  if (approach.diameterMeasured) {
    diameterDisplay = `${(approach.diameterMeasured.km * 1000).toFixed(0)}m (measured)`;
  } else if (approach.diameterEstimated) {
    const minM = approach.diameterEstimated.minKm * 1000;
    const maxM = approach.diameterEstimated.maxKm * 1000;
    if (minM < 1000 && maxM < 1000) {
      diameterDisplay = `${minM.toFixed(0)}-${maxM.toFixed(0)}m (est.)`;
    } else {
      diameterDisplay = `${(minM / 1000).toFixed(2)}-${(maxM / 1000).toFixed(2)}km (est.)`;
    }
  }

  return (
    <Card className={`h-full bg-card border-border/50 transition-all duration-300 hover:border-destructive/50 hover:glow-red bezel scanlines overflow-hidden`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className={`font-display text-lg ${theme.text} transition-colors line-clamp-2`}>
              {approach.designation}
            </CardTitle>
            {approach.fullName && approach.fullName !== approach.designation && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {approach.fullName}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {showHighlightBadge === "closest" && (
              <Badge variant="outline" className={theme.badge}>
                Closest
              </Badge>
            )}
            {showHighlightBadge === "fastest" && (
              <Badge variant="outline" className={theme.badge}>
                Fastest
              </Badge>
            )}
            {approach.isPha && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                PHA
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex flex-col flex-1 min-h-0">
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pb-4">
          {/* Approach date */}
          <div className="col-span-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>Close Approach (TDB)</span>
            </div>
            <p className="text-sm font-mono text-foreground mt-0.5">
              {approach.approachTimeRaw}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              TDB ≈ UTC (within ~1 min)
            </p>
          </div>

          {/* Miss distance */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Ruler className="w-3.5 h-3.5" />
              <span>Miss Distance</span>
            </div>
            <p className="text-sm font-mono text-foreground mt-0.5">
              {approach.distanceLd.toFixed(2)} <span className="text-xs text-muted-foreground">LD</span>
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {(approach.distanceKm / 1_000_000).toFixed(2)}M km
            </p>
          </div>

          {/* Velocity */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Gauge className="w-3.5 h-3.5" />
              <span>Velocity</span>
            </div>
            <p className="text-sm font-mono text-foreground mt-0.5">
              {velocityKmS} <span className="text-xs text-muted-foreground">km/s</span>
            </p>
          </div>
        </div>

        {/* Size estimate */}
        <div className="mt-auto pt-3 border-t border-border/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Est. Size</p>
              <p className="text-sm font-mono text-foreground">
                {diameterDisplay}
              </p>
            </div>
            <Badge variant="outline" className="text-xs border-border/50 text-muted-foreground">
              {sizeCategory}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-1">
            H = {approach.absoluteMagnitude.toFixed(1)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function CloseApproachCardSkeleton() {
  return (
    <Card className="h-full bg-card border-border/50 bezel overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="h-6 w-3/4 data-stream rounded" />
          <div className="h-5 w-12 data-stream rounded" />
        </div>
        <div className="h-4 w-1/2 data-stream rounded mt-2" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div className="col-span-2">
            <div className="h-3 w-20 data-stream rounded mb-1" />
            <div className="h-5 w-36 data-stream rounded" />
          </div>
          <div>
            <div className="h-3 w-16 data-stream rounded mb-1" />
            <div className="h-5 w-20 data-stream rounded" />
          </div>
          <div>
            <div className="h-3 w-12 data-stream rounded mb-1" />
            <div className="h-5 w-16 data-stream rounded" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-border/30">
          <div className="h-3 w-16 data-stream rounded mb-1" />
          <div className="h-4 w-24 data-stream rounded" />
        </div>
      </CardContent>
    </Card>
  );
}
