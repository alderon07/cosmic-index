"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  getEventSeverity,
  getEventTypeLabel,
  parseEventType,
} from "@/lib/nasa-donki";
import { THEMES } from "@/lib/theme";
import {
  Sun,
  Cloud,
  Magnet,
  Calendar,
  Gauge,
  ExternalLink,
  Link2,
  Activity,
  Zap,
  Info,
  Timer,
  Thermometer,
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

const SEVERITY_TEXT_COLORS: Record<SpaceWeatherSeverity, string> = {
  minor: "text-muted-foreground",
  moderate: "text-yellow-500",
  strong: "text-amber-500",
  severe: "text-orange-500",
  extreme: "text-red-500",
};

function getEventIcon(type: AnySpaceWeatherEvent["eventType"], className = "w-6 h-6") {
  switch (type) {
    case "FLR":
      return <Sun className={className} />;
    case "CME":
      return <Cloud className={className} />;
    case "GST":
      return <Magnet className={className} />;
  }
}

function formatDateTime(isoString: string): { date: string; time: string } {
  try {
    const d = new Date(isoString);
    return {
      date: d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      time: d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZoneName: "short",
      }),
    };
  } catch {
    return { date: isoString, time: "" };
  }
}

function getEventDescription(event: AnySpaceWeatherEvent): string {
  const { date } = formatDateTime(event.startTime);

  if (event.eventType === "FLR") {
    const flr = event as SolarFlareEvent;
    const classLetter = flr.classType.charAt(0);
    const classDescription = classLetter === "X"
      ? "the most powerful class of solar flare, capable of causing radio blackouts and radiation storms"
      : classLetter === "M"
      ? "a moderate solar flare that can cause brief radio blackouts at polar regions"
      : classLetter === "C"
      ? "a small solar flare with minor effects on Earth"
      : "a solar flare";
    return `A ${flr.classType}-class solar flare was detected on ${date}. This is ${classDescription}.`;
  }

  if (event.eventType === "CME") {
    const cme = event as CMEEvent;
    const speedDescription = cme.speed && cme.speed > 1000
      ? "a fast-moving"
      : cme.speed && cme.speed > 500
      ? "a moderate-speed"
      : "a";
    return `${speedDescription.charAt(0).toUpperCase() + speedDescription.slice(1)} coronal mass ejection (CME) was observed on ${date}${cme.speed ? ` traveling at approximately ${cme.speed} km/s` : ""}.`;
  }

  if (event.eventType === "GST") {
    const gst = event as GSTEvent;
    const gScale = gst.kpIndex >= 9 ? "G5 (Extreme)" :
      gst.kpIndex >= 8 ? "G4 (Severe)" :
      gst.kpIndex >= 7 ? "G3 (Strong)" :
      gst.kpIndex >= 6 ? "G2 (Moderate)" :
      gst.kpIndex >= 5 ? "G1 (Minor)" : "Below storm threshold";
    return `A geomagnetic storm reaching Kp ${gst.kpIndex} (${gScale}) was recorded on ${date}.`;
  }

  return `Space weather event detected on ${date}.`;
}

function getKeyFacts(event: AnySpaceWeatherEvent, severity: SpaceWeatherSeverity) {
  const { date, time } = formatDateTime(event.startTime);
  const facts: Array<{ label: string; value: string; unit?: string }> = [];

  facts.push({ label: "Date", value: date });
  facts.push({ label: "Time (UTC)", value: time });

  if (event.eventType === "FLR") {
    const flr = event as SolarFlareEvent;
    facts.push({ label: "Flare Class", value: flr.classType });
    if (flr.sourceLocation) {
      facts.push({ label: "Source Location", value: flr.sourceLocation });
    }
  } else if (event.eventType === "CME") {
    const cme = event as CMEEvent;
    facts.push({ label: "Speed", value: cme.speed ? `${cme.speed}` : "Unknown", unit: cme.speed ? "km/s" : undefined });
    if (cme.halfAngle) {
      facts.push({ label: "Half Angle", value: `${cme.halfAngle}°` });
    }
  } else if (event.eventType === "GST") {
    const gst = event as GSTEvent;
    facts.push({ label: "Max Kp Index", value: `Kp ${gst.kpIndex}` });
  }

  facts.push({
    label: "Severity",
    value: severity.charAt(0).toUpperCase() + severity.slice(1)
  });

  return facts;
}

function getKpSeverityLocal(kp: number): SpaceWeatherSeverity {
  if (kp >= 9) return "extreme";
  if (kp >= 8) return "severe";
  if (kp >= 7) return "strong";
  if (kp >= 6) return "moderate";
  return "minor";
}

interface SpaceWeatherDetailProps {
  event: AnySpaceWeatherEvent;
  compact?: boolean;
}

export function SpaceWeatherDetail({ event, compact }: SpaceWeatherDetailProps) {
  const typeLabel = getEventTypeLabel(event.eventType);
  const severity = getEventSeverity(event);
  const { date } = formatDateTime(event.startTime);
  const keyFacts = getKeyFacts(event, severity);
  const description = getEventDescription(event);

  const donkiSearchUrl = "https://kauai.ccmc.gsfc.nasa.gov/DONKI/search/";

  return (
    <div className="space-y-6 min-w-0">
      {/* Hero Section */}
      <div className="relative p-6 md:p-8 bg-card border border-border/50 rounded-lg bezel scanlines overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-wrap items-start gap-3 mb-4">
            <Badge variant="outline" className={`font-mono ${theme.badge}`}>
              {event.eventType}
            </Badge>
            <Badge variant="outline" className={SEVERITY_COLORS[severity]}>
              {severity.charAt(0).toUpperCase() + severity.slice(1)}
            </Badge>
            {event.linkedEvents && event.linkedEvents.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="border-muted-foreground/50 text-muted-foreground cursor-help"
                  >
                    <Link2 className="w-3 h-3 mr-1" />
                    {event.linkedEvents.length} Linked
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>Events in the causality chain</TooltipContent>
              </Tooltip>
            )}
          </div>

          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl text-foreground mb-2 nixie break-words flex items-center gap-3">
            <span className={theme.text}>{getEventIcon(event.eventType, "w-8 h-8")}</span>
            {typeLabel}
          </h1>

          <p className="text-lg text-muted-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {date}
          </p>
        </div>

        {/* Decorative glow */}
        <div className={`absolute top-0 right-0 w-64 h-64 ${
          event.eventType === "FLR" ? "bg-orange-500/10" :
          event.eventType === "CME" ? "bg-blue-500/10" :
          "bg-purple-500/10"
        } rounded-full blur-3xl`} />
      </div>

      {/* Overview */}
      <Card className="bg-card border-border/50 bezel">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground leading-relaxed">{description}</p>
        </CardContent>
      </Card>

      {/* Key Measurements */}
      <Card className="bg-card border-border/50 bezel">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Gauge className="w-5 h-5 text-secondary" />
            Key Measurements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`grid gap-3 sm:gap-4 ${compact ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"}`}>
            {keyFacts.map((fact, index) => (
              <div
                key={index}
                className="p-3 sm:p-4 bg-muted/30 rounded-lg border border-border/30 min-w-0"
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 truncate">
                  {fact.label}
                </p>
                <p className={`text-base sm:text-xl font-mono nixie break-all ${
                  fact.label === "Severity" ? SEVERITY_TEXT_COLORS[severity] :
                  fact.label === "Flare Class" || fact.label === "Speed" || fact.label === "Max Kp Index"
                    ? theme.text : "text-foreground"
                }`}>
                  {fact.value}
                </p>
                {fact.unit && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {fact.unit}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Sections */}
      <Accordion
        type="multiple"
        defaultValue={["timing", "measurements", "linked-events"]}
        className="space-y-2"
      >
        {/* Timing Details */}
        <AccordionItem
          value="timing"
          className="bg-card border border-border/50 rounded-lg px-4 bezel"
        >
          <AccordionTrigger className="font-display hover:no-underline">
            <span className="flex items-center gap-2">
              <Timer className="w-4 h-4" />
              Timing Details
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Start Time</p>
                <p className="font-mono text-sm sm:text-lg break-all">
                  {formatDateTime(event.startTime).time}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDateTime(event.startTime).date}
                </p>
              </div>
              {event.eventType === "FLR" && (event as SolarFlareEvent).peakTime && (
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Peak Time</p>
                  <p className="font-mono text-sm sm:text-lg break-all">
                    {formatDateTime((event as SolarFlareEvent).peakTime!).time}
                  </p>
                </div>
              )}
              {event.eventType === "FLR" && (event as SolarFlareEvent).endTime && (
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">End Time</p>
                  <p className="font-mono text-sm sm:text-lg break-all">
                    {formatDateTime((event as SolarFlareEvent).endTime!).time}
                  </p>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Type-specific measurements */}
        {event.eventType === "FLR" && (
          <AccordionItem
            value="measurements"
            className="bg-card border border-border/50 rounded-lg px-4 bezel"
          >
            <AccordionTrigger className="font-display hover:no-underline">
              <span className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Flare Properties
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Flare Class</p>
                  <p className={`font-mono text-sm sm:text-lg ${theme.text}`}>
                    {(event as SolarFlareEvent).classType}
                  </p>
                </div>
                {(event as SolarFlareEvent).sourceLocation && (
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Source Location</p>
                    <p className="font-mono text-sm sm:text-lg">
                      {(event as SolarFlareEvent).sourceLocation}
                    </p>
                  </div>
                )}
                {(event as SolarFlareEvent).activeRegionNum && (
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Active Region</p>
                    <p className="font-mono text-sm sm:text-lg">
                      AR {(event as SolarFlareEvent).activeRegionNum}
                    </p>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {event.eventType === "CME" && (
          <AccordionItem
            value="measurements"
            className="bg-card border border-border/50 rounded-lg px-4 bezel"
          >
            <AccordionTrigger className="font-display hover:no-underline">
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                CME Properties
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Speed</p>
                  <p className={`font-mono text-sm sm:text-lg ${theme.text}`}>
                    {(event as CMEEvent).speed ? `${(event as CMEEvent).speed} km/s` : "Unknown"}
                  </p>
                </div>
                {(event as CMEEvent).halfAngle && (
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Half Angle</p>
                    <p className="font-mono text-sm sm:text-lg">
                      {(event as CMEEvent).halfAngle}°
                    </p>
                  </div>
                )}
                {(event as CMEEvent).cmeType && (
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">CME Type</p>
                    <p className="font-mono text-sm sm:text-lg">
                      {(event as CMEEvent).cmeType}
                    </p>
                  </div>
                )}
                {(event as CMEEvent).sourceLocation && (
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Source Location</p>
                    <p className="font-mono text-sm sm:text-lg">
                      {(event as CMEEvent).sourceLocation}
                    </p>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {event.eventType === "GST" && (
          <AccordionItem
            value="measurements"
            className="bg-card border border-border/50 rounded-lg px-4 bezel"
          >
            <AccordionTrigger className="font-display hover:no-underline">
              <span className="flex items-center gap-2">
                <Thermometer className="w-4 h-4" />
                Geomagnetic Activity
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Maximum Kp Index</p>
                    <p className={`font-mono text-sm sm:text-lg ${theme.text}`}>
                      Kp {(event as GSTEvent).kpIndex}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">G-Scale</p>
                    <p className="font-mono text-sm sm:text-lg">
                      {(event as GSTEvent).kpIndex >= 9 ? "G5 (Extreme)" :
                       (event as GSTEvent).kpIndex >= 8 ? "G4 (Severe)" :
                       (event as GSTEvent).kpIndex >= 7 ? "G3 (Strong)" :
                       (event as GSTEvent).kpIndex >= 6 ? "G2 (Moderate)" :
                       (event as GSTEvent).kpIndex >= 5 ? "G1 (Minor)" : "Below G1"}
                    </p>
                  </div>
                </div>

                {/* Kp Readings Table */}
                {(event as GSTEvent).allKpReadings && (event as GSTEvent).allKpReadings.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-3">All Kp Readings</p>
                    <div className="border border-border/50 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/30">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium">Time</th>
                            <th className="px-4 py-2 text-left font-medium">Kp</th>
                            <th className="px-4 py-2 text-left font-medium">Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(event as GSTEvent).allKpReadings.map((reading, i) => (
                            <tr key={i} className="border-t border-border/30">
                              <td className="px-4 py-2 font-mono text-xs">
                                {formatDateTime(reading.observedTime).time}
                              </td>
                              <td className={`px-4 py-2 font-mono font-bold ${SEVERITY_TEXT_COLORS[getKpSeverityLocal(reading.kpIndex)]}`}>
                                {reading.kpIndex}
                              </td>
                              <td className="px-4 py-2 text-muted-foreground">{reading.source}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Linked Events */}
        {event.linkedEvents && event.linkedEvents.length > 0 && (
          <AccordionItem
            value="linked-events"
            className="bg-card border border-border/50 rounded-lg px-4 bezel"
          >
            <AccordionTrigger className="font-display hover:no-underline">
              <span className="flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Linked Events ({event.linkedEvents.length})
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p className="text-sm text-muted-foreground mb-4">
                This event is connected to other space weather activity:
              </p>
              <div className="space-y-2">
                {event.linkedEvents.map((linked, i) => {
                  const linkedType = parseEventType(linked.activityID);
                  const linkedTypeLabel = linkedType ? getEventTypeLabel(linkedType) : "Event";

                  return (
                    <Link
                      key={i}
                      href={`/space-weather/${encodeURIComponent(linked.activityID)}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-aurora-violet/50 hover:bg-aurora-violet/5 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        {linkedType && (
                          <span className={theme.text}>
                            {getEventIcon(linkedType, "w-4 h-4")}
                          </span>
                        )}
                        <div>
                          <p className="font-medium group-hover:text-aurora-violet transition-colors">
                            {linkedTypeLabel}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {linked.activityID}
                          </p>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-aurora-violet transition-colors" />
                    </Link>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {/* Data Sources */}
      {!compact && (
        <Card className="bg-card border-border/50 bezel">
          <CardHeader>
            <CardTitle className="font-display text-base">
              Data Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <a
                href={donkiSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-muted/50 hover:bg-muted rounded-md text-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                NASA DONKI Search
              </a>
              <a
                href="https://www.swpc.noaa.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-muted/50 hover:bg-muted rounded-md text-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                NOAA SWPC
              </a>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Event ID:{" "}
              <span className="font-mono text-foreground break-all">
                {event.id}
              </span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
