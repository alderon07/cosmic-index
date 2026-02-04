"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AnySpaceWeatherEvent,
  SolarFlareEvent,
  CMEEvent,
  GSTEvent,
  SpaceWeatherSeverity,
} from "@/lib/types";
import {
  getFlareClassSeverity,
  getCMESeverity,
  getKpSeverity,
  getEventTypeLabel,
  formatFlareClass,
  formatCMESpeed,
  formatKpIndex,
} from "@/lib/nasa-donki";
import { THEMES } from "@/lib/theme";
import {
  Sun,
  Cloud,
  Magnet,
  Calendar,
  Clock,
  MapPin,
  Gauge,
  Link2,
} from "lucide-react";

const theme = THEMES["space-weather"];

// Severity color mapping
const SEVERITY_COLORS: Record<SpaceWeatherSeverity, string> = {
  minor: "border-muted-foreground/50 text-muted-foreground bg-muted/10",
  moderate: "border-yellow-500/50 text-yellow-500 bg-yellow-500/10",
  strong: "border-amber-500/50 text-amber-500 bg-amber-500/10",
  severe: "border-orange-500/50 text-orange-500 bg-orange-500/10",
  extreme: "border-red-500/50 text-red-500 bg-red-500/10",
};

function getEventIcon(type: AnySpaceWeatherEvent["eventType"]) {
  switch (type) {
    case "FLR":
      return <Sun className="w-4 h-4" />;
    case "CME":
      return <Cloud className="w-4 h-4" />;
    case "GST":
      return <Magnet className="w-4 h-4" />;
  }
}

function formatDateTime(isoString: string): { date: string; time: string } {
  try {
    const d = new Date(isoString);
    return {
      date: d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    };
  } catch {
    return { date: isoString, time: "" };
  }
}

export type SpaceWeatherCardVariant = "default" | "compact";

interface SpaceWeatherCardProps {
  event: AnySpaceWeatherEvent;
  variant?: SpaceWeatherCardVariant;
}

export function SpaceWeatherCard({ event, variant = "default" }: SpaceWeatherCardProps) {
  const { date, time } = formatDateTime(event.startTime);

  // Get severity based on event type
  let severity: SpaceWeatherSeverity;
  let primaryMetric: string;
  let secondaryMetric: string | undefined;

  switch (event.eventType) {
    case "FLR": {
      const flr = event as SolarFlareEvent;
      severity = getFlareClassSeverity(flr.classType);
      primaryMetric = formatFlareClass(flr.classType);
      secondaryMetric = flr.sourceLocation;
      break;
    }
    case "CME": {
      const cme = event as CMEEvent;
      severity = getCMESeverity(cme.speed);
      primaryMetric = formatCMESpeed(cme.speed);
      secondaryMetric = cme.sourceLocation;
      break;
    }
    case "GST": {
      const gst = event as GSTEvent;
      severity = getKpSeverity(gst.kpIndex);
      primaryMetric = formatKpIndex(gst.kpIndex);
      secondaryMetric =
        gst.allKpReadings.length > 1
          ? `${gst.allKpReadings.length} readings`
          : undefined;
      break;
    }
  }

  const linkedCount = event.linkedEvents?.length || 0;

  // Compact (list) variant - single row with key info
  if (variant === "compact") {
    return (
      <Card className="bg-card border-border/50 transition-all duration-300 hover:border-aurora-violet/50 hover:glow-violet bezel overflow-hidden">
        <CardContent className="p-3">
          <div className="flex items-center gap-4">
            {/* Event type and icon */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`${theme.text}`}>
                  {getEventIcon(event.eventType)}
                </span>
                <span className={`font-display text-sm ${theme.text}`}>
                  {getEventTypeLabel(event.eventType)}
                </span>
                <Badge variant="outline" className={`text-[10px] ${SEVERITY_COLORS[severity]}`}>
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </Badge>
              </div>
              {linkedCount > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Link2 className="w-3 h-3" />
                  {linkedCount} linked
                </p>
              )}
            </div>

            {/* Date */}
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="text-xs font-mono text-foreground">{date}</p>
            </div>

            {/* Time */}
            <div className="hidden sm:block text-right shrink-0">
              <p className="text-xs text-muted-foreground">Time</p>
              <p className="text-xs font-mono text-foreground">{time || "—"}</p>
            </div>

            {/* Primary Metric */}
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">
                {event.eventType === "FLR" ? "Class" : event.eventType === "CME" ? "Speed" : "Kp"}
              </p>
              <p className={`text-xs font-mono ${theme.text}`}>{primaryMetric}</p>
            </div>

            {/* Source (hidden on small screens) */}
            {secondaryMetric && (
              <div className="hidden md:block text-right shrink-0">
                <p className="text-xs text-muted-foreground">
                  {event.eventType === "GST" ? "Readings" : "Source"}
                </p>
                <p className="text-xs font-mono text-foreground">{secondaryMetric}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default (grid) variant
  return (
    <Card
      className={`h-full bg-card border-border/50 transition-all duration-300 hover:border-aurora-violet/50 hover:glow-violet bezel scanlines overflow-hidden`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle
              className={`font-display text-lg ${theme.text} transition-colors flex items-center gap-2`}
            >
              {getEventIcon(event.eventType)}
              {getEventTypeLabel(event.eventType)}
            </CardTitle>
          </div>
          <Badge variant="outline" className={`text-xs ${SEVERITY_COLORS[severity]}`}>
            {severity.charAt(0).toUpperCase() + severity.slice(1)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex flex-col flex-1 min-h-0">
        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 pb-4">
          {/* Date */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>Date</span>
            </div>
            <p className="text-sm font-mono text-foreground mt-0.5">{date}</p>
          </div>

          {/* Time */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>Time (UTC)</span>
            </div>
            <p className="text-sm font-mono text-foreground mt-0.5">
              {time || "—"}
            </p>
          </div>

          {/* Primary Metric */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Gauge className="w-3.5 h-3.5" />
              <span>
                {event.eventType === "FLR"
                  ? "Class"
                  : event.eventType === "CME"
                  ? "Speed"
                  : "Kp Index"}
              </span>
            </div>
            <p className={`text-sm font-mono mt-0.5 ${theme.text}`}>
              {primaryMetric}
            </p>
          </div>

          {/* Source Location / Secondary Metric */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {event.eventType === "GST" ? (
                <Gauge className="w-3.5 h-3.5" />
              ) : (
                <MapPin className="w-3.5 h-3.5" />
              )}
              <span>
                {event.eventType === "GST" ? "Readings" : "Source"}
              </span>
            </div>
            <p className="text-sm font-mono text-foreground mt-0.5">
              {secondaryMetric || "—"}
            </p>
          </div>
        </div>

        {/* Footer with linked events indicator */}
        <div className="mt-auto pt-3 border-t border-border/30">
          <div className="flex items-center justify-between">
            {linkedCount > 0 ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Link2 className="w-3.5 h-3.5" />
                <span>
                  {linkedCount} linked event{linkedCount !== 1 ? "s" : ""}
                </span>
              </div>
            ) : (
              <div />
            )}
            <Badge variant="outline" className={`text-xs ${theme.badge}`}>
              {event.eventType}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SpaceWeatherCardSkeleton({ variant = "default" }: { variant?: SpaceWeatherCardVariant }) {
  if (variant === "compact") {
    return (
      <Card className="bg-card border-border/50 bezel overflow-hidden">
        <CardContent className="p-3">
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="h-4 w-28 data-stream rounded mb-1" />
              <div className="h-3 w-16 data-stream rounded" />
            </div>
            <div className="text-right">
              <div className="h-3 w-8 data-stream rounded mb-1" />
              <div className="h-3 w-16 data-stream rounded" />
            </div>
            <div className="hidden sm:block text-right">
              <div className="h-3 w-8 data-stream rounded mb-1" />
              <div className="h-3 w-12 data-stream rounded" />
            </div>
            <div className="text-right">
              <div className="h-3 w-10 data-stream rounded mb-1" />
              <div className="h-3 w-12 data-stream rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full bg-card border-border/50 bezel overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="h-6 w-1/2 data-stream rounded" />
          <div className="h-5 w-20 data-stream rounded" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <div className="h-3 w-12 data-stream rounded mb-1" />
            <div className="h-5 w-20 data-stream rounded" />
          </div>
          <div>
            <div className="h-3 w-14 data-stream rounded mb-1" />
            <div className="h-5 w-16 data-stream rounded" />
          </div>
          <div>
            <div className="h-3 w-12 data-stream rounded mb-1" />
            <div className="h-5 w-24 data-stream rounded" />
          </div>
          <div>
            <div className="h-3 w-14 data-stream rounded mb-1" />
            <div className="h-5 w-16 data-stream rounded" />
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-border/30 flex justify-between">
          <div className="h-4 w-24 data-stream rounded" />
          <div className="h-5 w-12 data-stream rounded" />
        </div>
      </CardContent>
    </Card>
  );
}
