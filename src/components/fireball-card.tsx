"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FireballEvent } from "@/lib/types";
import {
  getEnergySizeCategory,
  formatEnergy,
  formatCoordinates,
  getGoogleMapsUrl,
} from "@/lib/cneos-fireball";
import { THEMES } from "@/lib/theme";
import {
  Calendar,
  Zap,
  MapPin,
  ArrowUpRight,
  Gauge,
  Mountain,
  AlertCircle,
} from "lucide-react";

const theme = THEMES["fireballs"];

type FireballCardVariant = "default" | "compact";

interface FireballCardProps {
  fireball: FireballEvent;
  variant?: FireballCardVariant;
}

export function FireballCard({
  fireball,
  variant = "default",
}: FireballCardProps) {
  const sizeCategory = getEnergySizeCategory(
    fireball.impactEnergyKt,
    fireball.radiatedEnergyJ
  );
  const energyDisplay = formatEnergy(
    fireball.radiatedEnergyJ,
    fireball.impactEnergyKt
  );

  // Format date for display
  const dateDisplay = fireball.date;

  const cardClassName = `h-full bg-card border-border/50 transition-all duration-300 hover:border-radium-teal/50 hover:${theme.glow} bezel scanlines overflow-hidden`;

  if (variant === "compact") {
    const locationShort = fireball.hasLocation
      ? formatCoordinates(fireball.latitude!, fireball.longitude!)
      : "—";
    const altShort = fireball.hasAltitude
      ? `${fireball.altitudeKm!.toFixed(1)} km`
      : "—";
    const velShort = fireball.hasVelocity
      ? `${fireball.velocityKmS!.toFixed(1)} km/s`
      : "—";

    return (
      <Card className="py-0 bg-card border-border/50 transition-all duration-300 hover:border-radium-teal/50 hover:glow-teal bezel overflow-hidden min-h-[44px]">
        <CardContent className="py-3 px-4 min-h-[44px] flex flex-col md:grid md:grid-cols-[1fr_auto_1fr] md:items-center gap-y-2.5 md:gap-y-0 md:gap-x-6">
          {/* Block 1: Date (left on md+) */}
          <div className="min-w-0 overflow-hidden flex items-center gap-2 shrink-0">
            <Calendar className={`w-4 h-4 shrink-0 ${theme.icon}`} />
            <span className={`font-display text-sm font-medium ${theme.text} truncate`}>
              {dateDisplay}
            </span>
          </div>

          {/* Block 2: Data columns (center on md+, 4-col grid for consistent spacing) */}
          <div className="w-full md:w-auto min-w-0">
            <div className="grid grid-cols-4 gap-x-4 sm:gap-x-6 min-w-0 w-full md:w-auto">
              <div className="min-w-0 flex flex-col items-center gap-0.5 justify-start">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground cursor-help" aria-hidden="true">
                      <Zap className="w-3.5 h-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Energy</TooltipContent>
                </Tooltip>
                <p className="text-xs font-mono text-foreground truncate w-full text-center">{energyDisplay}</p>
              </div>
              <div className="min-w-0 flex flex-col items-center gap-0.5 justify-start">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground cursor-help" aria-hidden="true">
                      <MapPin className="w-3.5 h-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Location</TooltipContent>
                </Tooltip>
                <p className="text-xs font-mono text-foreground truncate w-full text-center" title={locationShort}>
                  {locationShort}
                </p>
              </div>
              <div className="min-w-0 flex flex-col items-center gap-0.5 justify-start">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground cursor-help" aria-hidden="true">
                      <Mountain className="w-3.5 h-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Altitude (km)</TooltipContent>
                </Tooltip>
                <p className="text-xs font-mono text-foreground truncate w-full text-center">{altShort}</p>
              </div>
              <div className="min-w-0 flex flex-col items-center gap-0.5 justify-start">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground cursor-help" aria-hidden="true">
                      <Gauge className="w-3.5 h-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Velocity (km/s)</TooltipContent>
                </Tooltip>
                <p className="text-xs font-mono text-foreground truncate w-full text-center">{velShort}</p>
              </div>
            </div>
          </div>

          {/* Block 3: Badges (right on md+) */}
          <div className="flex items-center gap-1.5 shrink-0 justify-end min-w-0">
            {!fireball.isComplete && (
              <Badge
                variant="outline"
                className="text-[10px] border-muted-foreground/30 text-muted-foreground py-0 px-1.5"
              >
                <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                Incomplete
              </Badge>
            )}
            <Badge variant="outline" className={`text-[10px] ${theme.badge}`}>
              {sizeCategory}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClassName}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle
              className={`font-display text-lg ${theme.text} transition-colors flex items-center gap-2`}
            >
              <Calendar className="w-4 h-4 shrink-0" />
              {dateDisplay}
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex flex-col flex-1 min-h-0">
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pb-4">
          {/* Energy */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="w-3.5 h-3.5" />
              <span>Energy</span>
            </div>
            <p className="text-sm font-mono text-foreground mt-0.5">
              {energyDisplay}
            </p>
            {fireball.impactEnergyKt && (
              <p className="text-xs text-muted-foreground font-mono">
                {fireball.radiatedEnergyJ.toFixed(1)}×10¹⁰ J radiated
              </p>
            )}
          </div>

          {/* Location */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span>Location</span>
            </div>
            {fireball.hasLocation ? (
              <>
                <p className="text-sm font-mono text-foreground mt-0.5">
                  {formatCoordinates(fireball.latitude!, fireball.longitude!)}
                </p>
                <a
                  href={getGoogleMapsUrl(
                    fireball.latitude!,
                    fireball.longitude!
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-xs ${theme.text} hover:underline inline-flex items-center gap-1 mt-0.5`}
                >
                  View on Map
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </>
            ) : (
              <p className="text-sm text-muted-foreground/60 mt-0.5 italic">
                Not reported
              </p>
            )}
          </div>

          {/* Altitude */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mountain className="w-3.5 h-3.5" />
              <span>Altitude</span>
            </div>
            {fireball.hasAltitude ? (
              <p className="text-sm font-mono text-foreground mt-0.5">
                {fireball.altitudeKm!.toFixed(1)} km
              </p>
            ) : (
              <p className="text-sm text-muted-foreground/60 mt-0.5">—</p>
            )}
          </div>

          {/* Velocity */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Gauge className="w-3.5 h-3.5" />
              <span>Velocity</span>
            </div>
            {fireball.hasVelocity ? (
              <p className="text-sm font-mono text-foreground mt-0.5">
                {fireball.velocityKmS!.toFixed(1)} km/s
              </p>
            ) : (
              <p className="text-sm text-muted-foreground/60 mt-0.5">—</p>
            )}
          </div>
        </div>

        {/* Size category */}
        <div className="mt-auto pt-3 border-t border-border/30">
          <div className="flex items-center justify-end gap-1.5">
          {!fireball.isComplete && (
              <Badge
                variant="outline"
                className="text-xs border-muted-foreground/30 text-muted-foreground"
              >
                <AlertCircle className="w-3 h-3 mr-1" />
                Data Incomplete
              </Badge>
            )}
            <Badge variant="outline" className={`text-xs ${theme.badge}`}>
              {sizeCategory}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function FireballCardSkeleton({
  variant = "default",
}: {
  variant?: "default" | "compact";
}) {
  if (variant === "compact") {
    return (
      <Card className="py-0 bg-card border-border/50 bezel overflow-hidden min-h-[44px]">
        <CardContent className="py-3 px-4 min-h-[44px] flex flex-col md:grid md:grid-cols-[1fr_auto_1fr] md:items-center gap-y-2.5 md:gap-y-0 md:gap-x-6">
          <div className="min-w-0 flex items-center gap-2">
            <div className="h-4 w-4 data-stream rounded shrink-0" />
            <div className="h-4 w-28 data-stream rounded" />
          </div>
          <div className="w-full md:w-auto min-w-0">
            <div className="grid grid-cols-4 gap-x-4 sm:gap-x-6 min-w-0 w-full md:w-auto">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="min-w-0 flex flex-col items-center gap-0.5">
                  <div className="h-3 w-8 data-stream rounded" />
                  <div className="h-3 data-stream rounded w-full max-w-14" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end min-w-0">
            <div className="h-5 w-14 data-stream rounded shrink-0" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-card border-border/50 bezel overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="h-6 w-3/4 data-stream rounded" />
          <div className="h-5 w-24 data-stream rounded" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <div className="h-3 w-12 data-stream rounded mb-1" />
            <div className="h-5 w-16 data-stream rounded" />
          </div>
          <div>
            <div className="h-3 w-14 data-stream rounded mb-1" />
            <div className="h-5 w-24 data-stream rounded" />
          </div>
          <div>
            <div className="h-3 w-14 data-stream rounded mb-1" />
            <div className="h-5 w-16 data-stream rounded" />
          </div>
          <div>
            <div className="h-3 w-14 data-stream rounded mb-1" />
            <div className="h-5 w-16 data-stream rounded" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-border/30 flex justify-end">
          <div className="h-5 w-20 data-stream rounded" />
        </div>
      </CardContent>
    </Card>
  );
}
