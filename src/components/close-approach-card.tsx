"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CloseApproach } from "@/lib/types";
import { getSizeCategory, AU_KM, LD_KM } from "@/lib/cneos-close-approach";
import { THEMES } from "@/lib/theme";
import { AlertTriangle, Gauge, Ruler, Calendar } from "lucide-react";

const theme = THEMES["close-approaches"];

export type CloseApproachCardVariant = "default" | "compact";

interface CloseApproachCardProps {
  approach: CloseApproach;
  showHighlightBadge?: "closest" | "fastest";
  variant?: CloseApproachCardVariant;
}

// Reusable tooltip wrapper for terms that need explanation
function InfoTooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help border-b border-dotted border-destructive/40 hover:border-destructive transition-colors">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs border-destructive/30">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

export function CloseApproachCard({ approach, showHighlightBadge, variant = "default" }: CloseApproachCardProps) {
  const sizeCategory = getSizeCategory(approach.diameterEstimated);

  // Format velocity
  const velocityKmS = approach.relativeVelocityKmS.toFixed(1);

  // Compute distance range in LD (3-sigma uncertainty)
  const distMinLd = (approach.distanceMinAu * AU_KM) / LD_KM;
  const distMaxLd = (approach.distanceMaxAu * AU_KM) / LD_KM;
  const hasDistanceRange = Math.abs(distMaxLd - distMinLd) > 0.01;

  // Format diameter range
  let diameterDisplay = "Unknown";
  if (approach.diameterMeasured) {
    diameterDisplay = `${(approach.diameterMeasured.km * 1000).toFixed(0)}m (measured)`;
  } else if (approach.diameterEstimated) {
    const minM = approach.diameterEstimated.minKm * 1000;
    const maxM = approach.diameterEstimated.maxKm * 1000;
    if (minM < 1000 && maxM < 1000) {
      diameterDisplay = `${minM.toFixed(0)}-${maxM.toFixed(0)} m`;
    } else {
      diameterDisplay = `${(minM / 1000).toFixed(2)}-${(maxM / 1000).toFixed(2)} km`;
    }
  }

  // Compact (list) variant - single row with key info
  if (variant === "compact") {
    return (
      <Card className="bg-card border-border/50 transition-all duration-300 hover:border-destructive/50 hover:glow-red bezel overflow-hidden">
        <CardContent className="p-3">
          <div className="flex items-center gap-4">
            {/* Name and badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-display text-sm ${theme.text} truncate`}>
                  {approach.designation}
                </span>
                {showHighlightBadge === "closest" && (
                  <Badge variant="outline" className={`text-[10px] ${theme.badge}`}>
                    Closest
                  </Badge>
                )}
                {showHighlightBadge === "fastest" && (
                  <Badge variant="outline" className={`text-[10px] ${theme.badge}`}>
                    Fastest
                  </Badge>
                )}
                {approach.isPha && (
                  <Badge variant="destructive" className="text-[10px]">
                    <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                    PHA
                  </Badge>
                )}
              </div>
              {approach.fullName && approach.fullName !== approach.designation && (
                <p className="text-xs text-muted-foreground truncate">
                  {approach.fullName}
                </p>
              )}
            </div>

            {/* Date */}
            <div className="hidden sm:block text-right shrink-0">
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="text-xs font-mono text-foreground">
                {approach.approachTimeRaw.split(" ")[0]}
              </p>
            </div>

            {/* Distance */}
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Distance</p>
              <p className="text-xs font-mono text-foreground">
                {approach.distanceLd.toFixed(2)} LD
              </p>
            </div>

            {/* Velocity */}
            <div className="hidden md:block text-right shrink-0">
              <p className="text-xs text-muted-foreground">Velocity</p>
              <p className="text-xs font-mono text-foreground">{velocityKmS} km/s</p>
            </div>

            {/* Size */}
            <div className="hidden lg:block text-right shrink-0">
              <p className="text-xs text-muted-foreground">Size</p>
              <p className="text-xs font-mono text-foreground">{diameterDisplay}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default (grid) variant
  return (
    <Card className={`h-full bg-card border-border/50 transition-all duration-300 hover:border-destructive/50 hover:glow-red bezel scanlines overflow-hidden`}>
      <CardHeader>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="destructive" className="text-xs cursor-help">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    PHA
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs border-destructive/30">
                  Potentially Hazardous Asteroid: Objects larger than ~140m that can pass within 7.5 million km of Earth. This is a classification, not a warning.
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex flex-col flex-1 min-h-0">
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 pb-4">
          {/* Approach date */}
          <div className="col-span-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>Close Approach</span>
              <InfoTooltip content="TDB (Barycentric Dynamical Time) is the astronomical time standard. It's essentially equivalent to UTC, differing by less than a minute.">
                <span className="text-muted-foreground/60">(TDB)</span>
              </InfoTooltip>
            </div>
            <p className="text-sm font-mono text-foreground mt-0.5">
              {approach.approachTimeRaw}
              {approach.timeUncertainty && (
                <InfoTooltip content="Time uncertainty: This prediction is accurate within this margin. Smaller values indicate better-tracked objects.">
                  <span className="text-xs text-muted-foreground ml-2">
                    ±{approach.timeUncertainty}
                  </span>
                </InfoTooltip>
              )}
            </p>
          </div>

          {/* Miss distance */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Ruler className="w-3.5 h-3.5" />
              <span>Miss Distance</span>
            </div>
            <p className="text-sm font-mono text-foreground mt-0.5">
              {approach.distanceLd.toFixed(2)}{" "}
              <InfoTooltip content="Lunar Distance: The average distance from Earth to the Moon (384,400 km). Used to give intuitive scale for near-Earth flybys.">
                <span className="text-xs text-muted-foreground">LD</span>
              </InfoTooltip>
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {(approach.distanceKm / 1_000_000).toFixed(2)}M km
            </p>
            {hasDistanceRange && (
              <InfoTooltip content="3-sigma range: There's a 99.7% probability the actual flyby distance falls within this interval.">
                <p className="text-xs text-muted-foreground/60 font-mono">
                  range: {distMinLd.toFixed(2)}-{distMaxLd.toFixed(2)} LD
                </p>
              </InfoTooltip>
            )}
          </div>

          {/* Velocity */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Gauge className="w-3.5 h-3.5" />
              <span>Velocity</span>
            </div>
            <p className="text-sm font-mono text-foreground mt-0.5">
              <InfoTooltip content="Relative velocity: Speed of the object relative to Earth at closest approach. For comparison, a bullet travels ~1 km/s.">
                <span>{velocityKmS} km/s</span>
              </InfoTooltip>
            </p>
          </div>
        </div>

        {/* Size estimate */}
        <div className="mt-auto pt-3 border-t border-border/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">
                <InfoTooltip content="Size is estimated from brightness (H) assuming typical asteroid reflectivity (5-25% albedo). Actual size could vary.">
                  Estimated Size
                </InfoTooltip>
              </p>
              <p className="text-sm font-mono text-foreground">
                {diameterDisplay}
              </p>
            </div>
            <Badge variant="outline" className="text-xs border-border/50 text-muted-foreground">
              {sizeCategory}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground/70 mt-1">
            <InfoTooltip content="Absolute magnitude (H): A measure of intrinsic brightness. Lower H = brighter = larger object. H=22 ≈ 100-200m, H=25 ≈ 25-50m, H=28 ≈ 5-15m.">
              H = {approach.absoluteMagnitude.toFixed(1)}
            </InfoTooltip>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function CloseApproachCardSkeleton({ variant = "default" }: { variant?: CloseApproachCardVariant }) {
  if (variant === "compact") {
    return (
      <Card className="bg-card border-border/50 bezel overflow-hidden">
        <CardContent className="p-3">
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="h-4 w-32 data-stream rounded mb-1" />
              <div className="h-3 w-24 data-stream rounded" />
            </div>
            <div className="hidden sm:block text-right">
              <div className="h-3 w-8 data-stream rounded mb-1" />
              <div className="h-3 w-16 data-stream rounded" />
            </div>
            <div className="text-right">
              <div className="h-3 w-12 data-stream rounded mb-1" />
              <div className="h-3 w-14 data-stream rounded" />
            </div>
            <div className="hidden md:block text-right">
              <div className="h-3 w-12 data-stream rounded mb-1" />
              <div className="h-3 w-14 data-stream rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

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
