"use client";

import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AnyCosmicObject, isExoplanet, isSmallBody, isStar } from "@/lib/types";
import {
  ExternalLink,
  Orbit,
  Sparkles,
  AlertTriangle,
  Info,
  Telescope,
  Star,
  Circle,
  GitCompareArrows,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoTooltip, TOOLTIP_CONTENT } from "@/components/info-tooltip";
import { ObjectVisualizerPanel } from "@/components/visualizers/object-visualizer-panel";
import { useCompare } from "@/components/compare/use-compare";
import { SaveButton } from "@/components/save-button";
import { createCompareItem, MAX_COMPARE_ITEMS } from "@/lib/compare-facts";
import {
  DETAIL_ACCORDION_SURFACE_CLASS,
  DETAIL_CARD_SURFACE_CLASS,
  getDetailAccentConfig,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

const NasaImageGallery = dynamic(
  () => import("./nasa-image-gallery").then((m) => m.NasaImageGallery),
  { ssr: false }
);

interface ObjectDetailProps {
  object: AnyCosmicObject;
  hideDataSources?: boolean;
  compact?: boolean;
  showCompare?: boolean;
}

export function ObjectDetail({
  object,
  hideDataSources,
  compact,
  showCompare = true,
}: ObjectDetailProps) {
  const { addObject, isInCompare, isObjectSupported } = useCompare();

  const typeLabel = isExoplanet(object)
    ? "Exoplanet"
    : isStar(object)
    ? "Star"
    : isSmallBody(object)
    ? object.bodyKind === "comet"
      ? "Comet"
      : "Asteroid"
    : "Unknown";
  const compareSupported = isObjectSupported(object);
  const compareId = createCompareItem(object, "detail")?.id;
  const alreadyInCompare = Boolean(compareId && isInCompare(compareId));
  const accent = getDetailAccentConfig(object);
  const compareTooltipText = compareSupported
    ? alreadyInCompare
      ? "Already in compare"
      : `Add to compare (max ${MAX_COMPARE_ITEMS})`
    : "Compare is currently unavailable for this object type.";
  return (
    <div className="space-y-6 min-w-0">
      {/* Hero Section */}
      <div className="relative p-6 md:p-8 bg-card border border-border/50 rounded-lg bezel scanlines overflow-hidden">
        <div className="relative z-10">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant="outline"
                className={cn("font-mono", accent.heroBadge)}
              >
                {typeLabel}
              </Badge>

              {isSmallBody(object) && object.isNeo && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="border-amber-glow/50 text-amber-glow cursor-help"
                    >
                      <Orbit className="w-3 h-3 mr-1" />
                      Near-Earth Object
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs border-secondary/30">
                    {TOOLTIP_CONTENT.NEO}
                  </TooltipContent>
                </Tooltip>
              )}

              {isSmallBody(object) && object.isPha && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="destructive" className="cursor-help">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Potentially Hazardous
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs border-destructive/30">
                    {TOOLTIP_CONTENT.PHA}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="flex items-center gap-2 sm:justify-end">
              {showCompare && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      onClick={() => addObject(object, "object-detail")}
                      className={cn({
                        [accent.compareActive]: compareSupported && alreadyInCompare,
                        [accent.compareOutline]: compareSupported && !alreadyInCompare,
                        "border-border/60 text-muted-foreground hover:text-foreground":
                          !compareSupported,
                      })}
                      aria-label={compareTooltipText}
                    >
                      <GitCompareArrows className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{compareTooltipText}</TooltipContent>
                </Tooltip>
              )}

              <SaveButton object={object} variant="button" />
            </div>
          </div>

          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-foreground mb-2 nixie break-words">
            {object.displayName}
          </h1>

          {isExoplanet(object) && object.hostStar && (
            <p className="text-lg text-muted-foreground flex items-center gap-2">
              <Sparkles className={cn("w-5 h-5", accent.heroIconAccent)} />
              Orbiting {object.hostStar}
            </p>
          )}

          {isSmallBody(object) && (
            <p className="text-lg text-muted-foreground flex items-center gap-2">
              {object.orbitClass}
            </p>
          )}

          {isStar(object) && (
            <p className="text-lg text-muted-foreground flex items-center gap-2">
              <Star className={cn("w-5 h-5", accent.heroIconAccent)} />
              {object.spectralClass && object.spectralClass !== "Unknown"
                ? `${object.spectralClass}-type star`
                : "Host star"}
            </p>
          )}

          {object.aliases.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2 break-words">
              Also known as: {object.aliases.join(", ")}
            </p>
          )}
        </div>

        {/* Decorative glow */}
        <div
          className={cn(
            "absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl",
            accent.heroGlow
          )}
        />
      </div>

      {/* Summary */}
      <Card tone="neutral" className={DETAIL_CARD_SURFACE_CLASS}>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Info className={cn("w-5 h-5", accent.heroIconAccent)} />
            Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground leading-relaxed">{object.summary}</p>
        </CardContent>
      </Card>

      {/* Visualized metrics */}
      <ObjectVisualizerPanel object={object} />

      {/* Key Facts Grid */}
      <Card tone="neutral" className={DETAIL_CARD_SURFACE_CLASS}>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Telescope className={cn("w-5 h-5", accent.heroIconAccent)} />
            Key Measurements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {object.keyFacts.map((fact) => (
              <div
                key={`${fact.label}:${fact.value}:${fact.unit ?? ""}`}
                className="p-3 sm:p-4 bg-muted/30 rounded-lg border border-border/30 min-w-0"
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 truncate">
                  {fact.label}
                </p>
                <p className="text-base sm:text-xl font-mono text-foreground nixie break-all">
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
        defaultValue={[
          "physical",
          "orbital",
          "host-star",
          "discovery",
          "stellar",
          "system",
          "coordinates",
        ]}
        className="space-y-2"
      >
        {isExoplanet(object) && (
          <>
            <AccordionItem
              value="physical"
              className={DETAIL_ACCORDION_SURFACE_CLASS}
            >
              <AccordionTrigger className="font-display hover:no-underline">
                Physical Properties
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Radius (Earth radii)
                    </p>
                    <p className="font-mono text-sm sm:text-lg break-all">
                      {object.radiusEarth?.toFixed(2) ?? "Unknown"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Mass (Earth masses)
                    </p>
                    <p className="font-mono text-sm sm:text-lg break-all">
                      {object.massEarth?.toFixed(2) ?? "Unknown"}
                    </p>
                    {object.massEarth !== undefined && (
                      <p
                        className={`text-xs mt-0.5 ${
                          object.massIsEstimated
                            ? "text-amber-glow/80"
                            : "text-muted-foreground"
                        }`}
                      >
                        {object.massIsEstimated ? "Estimated" : "Measured"}
                      </p>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Equilibrium Temperature
                    </p>
                    <p className="font-mono text-sm sm:text-lg break-all">
                      {object.equilibriumTempK
                        ? `${object.equilibriumTempK.toFixed(0)} K`
                        : "Unknown"}
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="orbital"
              className={DETAIL_ACCORDION_SURFACE_CLASS}
            >
              <AccordionTrigger className="font-display hover:no-underline">
                Orbital Properties
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Orbital Period
                    </p>
                    <p className="font-mono text-sm sm:text-lg break-all">
                      {object.orbitalPeriodDays
                        ? `${object.orbitalPeriodDays.toFixed(2)} days`
                        : "Unknown"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Distance from Earth
                    </p>
                    <p className="font-mono text-sm sm:text-lg break-words">
                      {object.distanceParsecs != null
                        ? `${object.distanceParsecs.toFixed(1)} pc (~${(
                            object.distanceParsecs * 3.26156
                          ).toFixed(0)} ly)`
                        : "Unknown"}
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="host-star"
              className={DETAIL_ACCORDION_SURFACE_CLASS}
            >
              <AccordionTrigger className="font-display hover:no-underline">
                Host Star
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Spectral Type
                    </p>
                    <p className="font-mono text-sm sm:text-lg break-all">
                      {object.spectralType ?? "Unknown"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Temperature</p>
                    <p className="font-mono text-sm sm:text-lg break-all">
                      {object.starTempK != null
                        ? `${object.starTempK.toFixed(0)} K`
                        : "Unknown"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Mass (Solar)
                    </p>
                    <p className="font-mono text-sm sm:text-lg break-all">
                      {object.starMassSolar != null
                        ? `${object.starMassSolar.toFixed(2)} M☉`
                        : "Unknown"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Radius (Solar)
                    </p>
                    <p className="font-mono text-sm sm:text-lg break-all">
                      {object.starRadiusSolar != null
                        ? `${object.starRadiusSolar.toFixed(2)} R☉`
                        : "Unknown"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Luminosity</p>
                    <p className="font-mono text-sm sm:text-lg break-all">
                      {object.starLuminosity != null
                        ? `${object.starLuminosity.toFixed(2)} log L☉`
                        : "Unknown"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Circle className={cn("w-3 h-3 shrink-0", accent.heroIconAccent)} />
                      <span className="truncate">Planets in System</span>
                    </p>
                    <p className="font-mono text-sm sm:text-lg">
                      {object.planetsInSystem ?? "Unknown"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Star className={cn("w-3 h-3 shrink-0", accent.heroIconAccent)} />
                      <span className="truncate">Stars in System</span>
                    </p>
                    <p className="font-mono text-sm sm:text-lg">
                      {object.starsInSystem ?? "Unknown"}
                    </p>
                  </div>
                  <div className="min-w-0 col-span-2 md:col-span-1">
                    <p className="text-xs text-muted-foreground">
                      Coordinates (RA, Dec)
                    </p>
                    <p className="font-mono text-sm sm:text-lg break-all">
                      {object.ra != null && object.dec != null
                        ? `${object.ra.toFixed(4)}°, ${object.dec.toFixed(4)}°`
                        : "Unknown"}
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="discovery"
              className={DETAIL_ACCORDION_SURFACE_CLASS}
            >
              <AccordionTrigger className="font-display hover:no-underline">
                Discovery
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Discovery Method
                    </p>
                    <p className="font-mono text-sm sm:text-lg break-words">
                      {object.discoveryMethod}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Discovery Year
                    </p>
                    <p className="font-mono text-sm sm:text-lg">
                      {object.discoveredYear ?? "Unknown"}
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </>
        )}

        {isSmallBody(object) && (
          <>
            <AccordionItem
              value="physical"
              className={DETAIL_ACCORDION_SURFACE_CLASS}
            >
              <AccordionTrigger className="font-display hover:no-underline">
                Physical Properties
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Diameter</p>
                    <p className="font-mono text-sm sm:text-lg break-all">
                      {object.diameterKm
                        ? `${object.diameterKm.toFixed(2)} km`
                        : "Unknown"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      <InfoTooltip content={TOOLTIP_CONTENT.ABSOLUTE_MAGNITUDE_H} theme="small-bodies">
                        Absolute Magnitude (H)
                      </InfoTooltip>
                    </p>
                    <p className="font-mono text-sm sm:text-lg break-all">
                      {object.absoluteMagnitude?.toFixed(1) ?? "Unknown"}
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="orbital"
              className={DETAIL_ACCORDION_SURFACE_CLASS}
            >
              <AccordionTrigger className="font-display hover:no-underline">
                Orbital Classification
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Orbit Class</p>
                    <p className="font-mono text-sm sm:text-lg break-words">
                      {object.orbitClass}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Body Type</p>
                    <p className="font-mono text-sm sm:text-lg capitalize">
                      {object.bodyKind}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Near-Earth Object
                    </p>
                    <p className="font-mono text-sm sm:text-lg">
                      {object.isNeo ? "Yes" : "No"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Potentially Hazardous
                    </p>
                    <p className="font-mono text-sm sm:text-lg">
                      {object.isPha ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </>
        )}

        {isStar(object) && (
          <>
            <AccordionItem
              value="stellar"
              className={DETAIL_ACCORDION_SURFACE_CLASS}
            >
              <AccordionTrigger className="font-display hover:no-underline">
                Stellar Properties
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Spectral Type
                    </p>
                    <p className="font-mono text-sm sm:text-lg break-all">
                      {object.spectralType ?? "Unknown"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Temperature</p>
                    <p className="font-mono text-sm sm:text-lg break-all">
                      {object.starTempK != null
                        ? `${object.starTempK.toFixed(0)} K`
                        : "Unknown"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Mass (Solar)
                    </p>
                    <p className="font-mono text-sm sm:text-lg break-all">
                      {object.starMassSolar != null
                        ? `${object.starMassSolar.toFixed(2)} M☉`
                        : "Unknown"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      Radius (Solar)
                    </p>
                    <p className="font-mono text-sm sm:text-lg break-all">
                      {object.starRadiusSolar != null
                        ? `${object.starRadiusSolar.toFixed(2)} R☉`
                        : "Unknown"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      <InfoTooltip content={TOOLTIP_CONTENT.LUMINOSITY} theme="stars">
                        Luminosity
                      </InfoTooltip>
                    </p>
                    <p className="font-mono text-sm sm:text-lg break-all">
                      {object.starLuminosity != null
                        ? `${object.starLuminosity.toFixed(2)} log L☉`
                        : "Unknown"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">
                      <InfoTooltip content={TOOLTIP_CONTENT.METALLICITY} theme="stars">
                        Metallicity [Fe/H]
                      </InfoTooltip>
                    </p>
                    <p className="font-mono text-sm sm:text-lg break-all">
                      {object.metallicityFeH != null
                        ? object.metallicityFeH.toFixed(2)
                        : "Unknown"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Age</p>
                    <p className="font-mono text-sm sm:text-lg break-all">
                      {object.ageGyr != null
                        ? `${object.ageGyr.toFixed(1)} Gyr`
                        : "Unknown"}
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="system"
              className={DETAIL_ACCORDION_SURFACE_CLASS}
            >
              <AccordionTrigger className="font-display hover:no-underline">
                System Properties
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Circle className={cn("w-3 h-3 shrink-0", accent.heroIconAccent)} />
                      <span className="truncate">Known Planets</span>
                    </p>
                    <p className="font-mono text-sm sm:text-lg">
                      {object.planetCount}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Star className={cn("w-3 h-3 shrink-0", accent.heroIconAccent)} />
                      <span className="truncate">Stars in System</span>
                    </p>
                    <p className="font-mono text-sm sm:text-lg">
                      {object.starsInSystem ?? "Unknown"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Circle className={cn("w-3 h-3 shrink-0", accent.heroIconAccent)} />
                      <span className="truncate">Planets (NASA)</span>
                    </p>
                    <p className="font-mono text-sm sm:text-lg">
                      {object.planetsInSystem ?? "Unknown"}
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="coordinates"
              className={DETAIL_ACCORDION_SURFACE_CLASS}
            >
              <AccordionTrigger className="font-display hover:no-underline">
                Coordinates & Brightness
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  <div className="min-w-0 col-span-2 sm:col-span-1">
                    <p className="text-xs text-muted-foreground">
                      <InfoTooltip content={TOOLTIP_CONTENT.PARSEC} theme="stars">
                        Distance
                      </InfoTooltip>
                    </p>
                    <p className="font-mono text-sm sm:text-lg break-words">
                      {object.distanceParsecs != null
                        ? `${object.distanceParsecs.toFixed(1)} pc (~${(
                            object.distanceParsecs * 3.26156
                          ).toFixed(0)} ly)`
                        : "Unknown"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      <InfoTooltip content={TOOLTIP_CONTENT.V_MAGNITUDE} theme="stars">
                        V Magnitude
                      </InfoTooltip>
                    </p>
                    <p className="font-mono text-sm sm:text-lg">
                      {object.vMag != null ? object.vMag.toFixed(2) : "Unknown"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">K Magnitude</p>
                    <p className="font-mono text-sm sm:text-lg">
                      {object.kMag != null ? object.kMag.toFixed(2) : "Unknown"}
                    </p>
                  </div>
                  <div className="min-w-0 col-span-2 md:col-span-1">
                    <p className="text-xs text-muted-foreground">
                      Coordinates (RA, Dec)
                    </p>
                    <p className="font-mono text-sm sm:text-lg break-all">
                      {object.ra != null && object.dec != null
                        ? `${object.ra.toFixed(4)}°, ${object.dec.toFixed(4)}°`
                        : "Unknown"}
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </>
        )}
      </Accordion>

      {/* NASA Images */}
      <NasaImageGallery object={object} compact={compact} />

      {/* Source Links */}
      {!hideDataSources && (
        <Card tone="neutral" className={DETAIL_CARD_SURFACE_CLASS}>
          <CardHeader>
            <CardTitle className="font-display text-base">
              Data Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {object.links.map((link) => (
                <a
                  key={`${link.url}:${link.label}`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-muted/50 hover:bg-muted rounded-md text-foreground transition-colors",
                    accent.linkHover
                  )}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {link.label}
                </a>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Source ID:{" "}
              <span className="font-mono text-foreground">
                {object.sourceId}
              </span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Loading skeleton for ObjectDetail
export function ObjectDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-40 data-stream rounded" />

      <div className="p-6 md:p-8 bg-card border border-border/50 rounded-lg">
        <div className="h-6 w-24 data-stream rounded mb-4" />
        <div className="h-12 w-3/4 data-stream rounded mb-2" />
        <div className="h-5 w-1/2 data-stream rounded" />
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader>
          <div className="h-6 w-32 data-stream rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-20 data-stream rounded" />
        </CardContent>
      </Card>

      <Card className="bg-card border-border/50">
        <CardHeader>
          <div className="h-6 w-40 data-stream rounded" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["detail-fact-1", "detail-fact-2", "detail-fact-3", "detail-fact-4"].map((key) => (
              <div key={key} className="p-4 bg-muted/30 rounded-lg">
                <div className="h-3 w-16 data-stream rounded mb-2" />
                <div className="h-8 w-20 data-stream rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
