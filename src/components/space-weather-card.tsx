"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

function getPrimaryMetricLabel(eventType: AnySpaceWeatherEvent["eventType"]): string {
  switch (eventType) {
    case "FLR": return "Class";
    case "CME": return "Speed";
    case "GST": return "Kp Index";
  }
}

function getSecondaryMetricLabel(eventType: AnySpaceWeatherEvent["eventType"]): string {
  return eventType === "GST" ? "Readings" : "Source";
}

function formatSeverity(severity: SpaceWeatherSeverity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

// Short labels for linked event summary
const LINKED_EVENT_LABELS: Record<string, string> = {
  FLR: "Flare",
  CME: "CME",
  GST: "Storm",
};

/**
 * Parse linkedEvents array and return a summary string like "1 Flare, 2 CMEs"
 * Activity IDs follow patterns like "2024-01-15T06:30:00-FLR-001"
 */
function formatLinkedEvents(
  linkedEvents: Array<{ activityID: string }> | undefined
): string | null {
  if (!linkedEvents?.length) return null;

  // Count occurrences of each event type
  const counts: Record<string, number> = {};
  for (const event of linkedEvents) {
    // Extract event type from activityID (e.g., "2024-01-15T06:30:00-FLR-001" → "FLR")
    const match = event.activityID.match(/-(FLR|CME|GST)-/);
    if (match) {
      const type = match[1];
      counts[type] = (counts[type] || 0) + 1;
    }
  }

  // Build summary string
  const parts: string[] = [];
  for (const [type, count] of Object.entries(counts)) {
    const label = LINKED_EVENT_LABELS[type] || type;
    // Pluralize CME → CMEs, but Flare → Flares, Storm → Storms
    const plural = count > 1 ? (label === "CME" ? "s" : "s") : "";
    parts.push(`${count} ${label}${plural}`);
  }

  return parts.length > 0 ? parts.join(", ") : null;
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
  const linkedSummary = formatLinkedEvents(event.linkedEvents);

  // Compact (list) variant - mobile: two lines (title, then data+badge); desktop: single line
  if (variant === "compact") {
    return (
      <Card className="py-0 bg-card border-border/50 transition-all duration-300 hover:border-aurora-violet/50 hover:glow-violet bezel overflow-hidden min-h-[44px]">
        <CardContent className="p-3 min-h-[44px] flex flex-col md:grid md:grid-cols-[1fr_auto_1fr] md:items-center gap-y-3 md:gap-y-0 md:gap-x-6">
          {/* Block 1: Event type and linked count (left column on md+; 1fr so title length doesn't affect data) */}
          <div className="min-w-0 overflow-hidden flex items-center gap-2 shrink-0">
            <span className={`shrink-0 ${theme.text}`}>
              {getEventIcon(event.eventType)}
            </span>
            <span className={`font-display text-sm font-medium truncate ${theme.text}`}>
              {getEventTypeLabel(event.eventType)}
            </span>
            {linkedCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 cursor-help">
                    <Link2 className="w-3 h-3" />
                    {linkedSummary || `${linkedCount} linked`}
                  </span>
                </TooltipTrigger>
                <TooltipContent>Linked events in causality chain</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Block 2: Data columns (center column = auto on md+; grid for consistent spacing) */}
          <div className="w-full md:w-auto min-w-0">
            <div className="grid grid-cols-4 gap-x-4 sm:gap-x-6 min-w-0 w-full md:w-auto">
              <div className="min-w-0 flex flex-col items-center gap-0.5 justify-start">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground cursor-help" aria-hidden="true">
                      <Calendar className="w-3.5 h-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Date</TooltipContent>
                </Tooltip>
                <p className="text-xs font-mono text-foreground truncate w-full text-center">{date}</p>
              </div>
              <div className="min-w-0 flex flex-col items-center gap-0.5 justify-start">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground cursor-help" aria-hidden="true">
                      <Clock className="w-3.5 h-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Time (UTC)</TooltipContent>
                </Tooltip>
                <p className="text-xs font-mono text-foreground truncate w-full text-center">{time || "—"}</p>
              </div>
              <div className="min-w-0 flex flex-col items-center gap-0.5 justify-start">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground cursor-help" aria-hidden="true">
                      <Gauge className="w-3.5 h-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{getPrimaryMetricLabel(event.eventType)}</TooltipContent>
                </Tooltip>
                <p className={`text-xs font-mono truncate w-full text-center ${theme.text}`}>{primaryMetric}</p>
              </div>
              <div className="min-w-0 flex flex-col items-center gap-0.5 justify-start">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground cursor-help" aria-hidden="true">
                      <MapPin className="w-3.5 h-3.5" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{getSecondaryMetricLabel(event.eventType)}</TooltipContent>
                </Tooltip>
                <p className="text-xs font-mono text-foreground truncate w-full text-center">{secondaryMetric || "—"}</p>
              </div>
            </div>
          </div>
          {/* Badge (right column on md+; 1fr so badge length doesn't affect data) */}
          <div className="flex shrink-0 justify-end min-w-0">
            <Badge variant="outline" className={`text-[10px] shrink-0 py-0 px-1.5 ${SEVERITY_COLORS[severity]}`}>
              {formatSeverity(severity)}
            </Badge>
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
            {formatSeverity(severity)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 flex flex-col flex-1 min-h-0">
        {/* Key metrics */}
        <div className="flex flex-col justify-between md:grid md:grid-cols-2 gap-x-4 gap-y-3 pb-4">
          {/* Date */}
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>Date</span>
            </div>
            <p className="text-sm font-mono text-foreground mt-1">{date}</p>
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
              <span>{getPrimaryMetricLabel(event.eventType)}</span>
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
              <span>{getSecondaryMetricLabel(event.eventType)}</span>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-help">
                    <Link2 className="w-3.5 h-3.5" />
                    <span>{linkedSummary || `${linkedCount} linked`}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Linked events in causality chain</TooltipContent>
              </Tooltip>
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
      <Card className="py-0 bg-card border-border/50 bezel overflow-hidden min-h-[44px]">
        <CardContent className="p-3 min-h-[44px] flex flex-col md:grid md:grid-cols-[1fr_auto_1fr] md:items-center gap-y-2.5 md:gap-y-0 md:gap-x-6">
          <div className="min-w-0">
            <div className="h-4 w-28 data-stream rounded" />
          </div>
          <div className="w-full md:w-auto min-w-0">
            <div className="grid grid-cols-4 gap-x-4 sm:gap-x-6 min-w-0 w-full md:w-auto">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="min-w-0 flex flex-col items-center gap-0.5">
                  <div className="h-3 w-8 data-stream rounded" />
                  <div className="h-3 data-stream rounded w-full max-w-16" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end min-w-0">
            <div className="h-5 w-16 data-stream rounded shrink-0" />
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
