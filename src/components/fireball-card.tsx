"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      <Card className="bg-card border-border/50 transition-all duration-300 hover:border-radium-teal/50 hover:glow-teal bezel overflow-hidden">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-4">
            {/* Date (primary identifier) */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Calendar className={`w-4 h-4 shrink-0 ${theme.icon}`} />
                <span className={`font-display text-sm ${theme.text} truncate`}>
                  {dateDisplay}
                </span>
                {!fireball.isComplete && (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-muted-foreground/30 text-muted-foreground shrink-0 py-0 px-1.5"
                  >
                    <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                    Incomplete
                  </Badge>
                )}
              </div>
            </div>

            {/* Energy */}
            <div className="text-right shrink-0 w-20">
              <p className="text-xs text-muted-foreground">Energy</p>
              <p className="text-xs font-mono text-foreground">{energyDisplay}</p>
            </div>

            {/* Location */}
            <div className="hidden sm:block text-right shrink-0 w-24">
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="text-xs font-mono text-foreground truncate" title={locationShort}>
                {locationShort}
              </p>
            </div>

            {/* Altitude */}
            <div className="hidden md:block text-right shrink-0 w-16">
              <p className="text-xs text-muted-foreground">Altitude</p>
              <p className="text-xs font-mono text-foreground">{altShort}</p>
            </div>

            {/* Velocity */}
            <div className="hidden lg:block text-right shrink-0 w-16">
              <p className="text-xs text-muted-foreground">Velocity</p>
              <p className="text-xs font-mono text-foreground">{velShort}</p>
            </div>

            {/* Size category badge */}
            <Badge
              variant="outline"
              className={`text-[10px] shrink-0 ${theme.badge}`}
            >
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
          <div className="flex flex-col items-end gap-1.5">
            {!fireball.isComplete && (
              <Badge
                variant="outline"
                className="text-xs border-muted-foreground/30 text-muted-foreground"
              >
                <AlertCircle className="w-3 h-3 mr-1" />
                Data incomplete
              </Badge>
            )}
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
          <div className="flex items-center justify-end">
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
      <Card className="bg-card border-border/50 bezel overflow-hidden">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-4">
            {/* Date area */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 data-stream rounded shrink-0" />
                <div className="h-4 w-28 data-stream rounded" />
              </div>
            </div>
            {/* Data columns */}
            <div className="text-right shrink-0 w-20">
              <div className="h-3 w-10 data-stream rounded mb-1 ml-auto" />
              <div className="h-3 w-16 data-stream rounded ml-auto" />
            </div>
            <div className="hidden sm:block text-right shrink-0 w-24">
              <div className="h-3 w-12 data-stream rounded mb-1 ml-auto" />
              <div className="h-3 w-20 data-stream rounded ml-auto" />
            </div>
            <div className="hidden md:block text-right shrink-0 w-16">
              <div className="h-3 w-10 data-stream rounded mb-1 ml-auto" />
              <div className="h-3 w-14 data-stream rounded ml-auto" />
            </div>
            <div className="hidden lg:block text-right shrink-0 w-16">
              <div className="h-3 w-10 data-stream rounded mb-1 ml-auto" />
              <div className="h-3 w-14 data-stream rounded ml-auto" />
            </div>
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
