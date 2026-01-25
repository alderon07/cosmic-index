"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ExoplanetData, SmallBodyData, AnyCosmicObject } from "@/lib/types";
import {
  ArrowLeft,
  ExternalLink,
  Orbit,
  Sparkles,
  AlertTriangle,
  Info,
  Globe,
  Telescope,
} from "lucide-react";
import Link from "next/link";

interface ObjectDetailProps {
  object: AnyCosmicObject;
}

function isExoplanet(obj: AnyCosmicObject): obj is ExoplanetData {
  return obj.type === "EXOPLANET";
}

function isSmallBody(obj: AnyCosmicObject): obj is SmallBodyData {
  return obj.type === "SMALL_BODY";
}

export function ObjectDetail({ object }: ObjectDetailProps) {
  const backHref = isExoplanet(object) ? "/exoplanets" : "/small-bodies";
  const backLabel = isExoplanet(object) ? "Exoplanets" : "Small Bodies";

  const typeLabel = isExoplanet(object)
    ? "Exoplanet"
    : isSmallBody(object)
    ? object.bodyKind === "comet"
      ? "Comet"
      : "Asteroid"
    : "Unknown";

  return (
    <div className="space-y-6">
      {/* Back Navigation */}
      <Link href={backHref}>
        <Button
          variant="ghost"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {backLabel}
        </Button>
      </Link>

      {/* Hero Section */}
      <div className="relative p-6 md:p-8 bg-card border border-border/50 rounded-lg bezel scanlines overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-wrap items-start gap-3 mb-4">
            <Badge
              variant={isExoplanet(object) ? "default" : "secondary"}
              className="font-mono"
            >
              {typeLabel}
            </Badge>

            {isSmallBody(object) && object.isNeo && (
              <Badge
                variant="outline"
                className="border-amber-glow/50 text-amber-glow"
              >
                <Orbit className="w-3 h-3 mr-1" />
                Near-Earth Object
              </Badge>
            )}

            {isSmallBody(object) && object.isPha && (
              <Badge variant="destructive">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Potentially Hazardous
              </Badge>
            )}
          </div>

          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl text-foreground mb-2 nixie">
            {object.displayName}
          </h1>

          {isExoplanet(object) && object.hostStar && (
            <p className="text-lg text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-secondary" />
              Orbiting {object.hostStar}
            </p>
          )}

          {isSmallBody(object) && (
            <p className="text-lg text-muted-foreground flex items-center gap-2">
              <Globe className="w-5 h-5 text-radium-teal" />
              {object.orbitClass}
            </p>
          )}

          {object.aliases.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Also known as: {object.aliases.join(", ")}
            </p>
          )}
        </div>

        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {/* Summary */}
      <Card className="bg-card border-border/50 bezel">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground leading-relaxed">{object.summary}</p>
        </CardContent>
      </Card>

      {/* Key Facts Grid */}
      <Card className="bg-card border-border/50 bezel">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Telescope className="w-5 h-5 text-secondary" />
            Key Measurements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {object.keyFacts.map((fact, index) => (
              <div
                key={index}
                className="p-4 bg-muted/30 rounded-lg border border-border/30"
              >
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  {fact.label}
                </p>
                <p className="text-xl font-mono text-foreground nixie">
                  {fact.value}
                </p>
                {fact.unit && (
                  <p className="text-xs text-muted-foreground mt-0.5">
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
        defaultValue={["physical", "orbital", "discovery"]}
        className="space-y-2"
      >
        {isExoplanet(object) && (
          <>
            <AccordionItem
              value="physical"
              className="bg-card border border-border/50 rounded-lg px-4 bezel"
            >
              <AccordionTrigger className="font-display hover:no-underline">
                Physical Properties
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Radius (Earth radii)
                    </p>
                    <p className="font-mono text-lg">
                      {object.radiusEarth?.toFixed(2) ?? "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Mass (Earth masses)
                    </p>
                    <p className="font-mono text-lg">
                      {object.massEarth?.toFixed(2) ?? "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Equilibrium Temperature
                    </p>
                    <p className="font-mono text-lg">
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
              className="bg-card border border-border/50 rounded-lg px-4 bezel"
            >
              <AccordionTrigger className="font-display hover:no-underline">
                Orbital Properties
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Orbital Period
                    </p>
                    <p className="font-mono text-lg">
                      {object.orbitalPeriodDays
                        ? `${object.orbitalPeriodDays.toFixed(2)} days`
                        : "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Distance from Earth
                    </p>
                    <p className="font-mono text-lg">
                      {object.distanceParsecs
                        ? `${object.distanceParsecs.toFixed(1)} parsecs`
                        : "Unknown"}
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="discovery"
              className="bg-card border border-border/50 rounded-lg px-4 bezel"
            >
              <AccordionTrigger className="font-display hover:no-underline">
                Discovery
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Discovery Method
                    </p>
                    <p className="font-mono text-lg">{object.discoveryMethod}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Discovery Year
                    </p>
                    <p className="font-mono text-lg">
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
              className="bg-card border border-border/50 rounded-lg px-4 bezel"
            >
              <AccordionTrigger className="font-display hover:no-underline">
                Physical Properties
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Diameter</p>
                    <p className="font-mono text-lg">
                      {object.diameterKm
                        ? `${object.diameterKm.toFixed(2)} km`
                        : "Unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Absolute Magnitude (H)
                    </p>
                    <p className="font-mono text-lg">
                      {object.absoluteMagnitude?.toFixed(1) ?? "Unknown"}
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="orbital"
              className="bg-card border border-border/50 rounded-lg px-4 bezel"
            >
              <AccordionTrigger className="font-display hover:no-underline">
                Orbital Classification
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Orbit Class</p>
                    <p className="font-mono text-lg">{object.orbitClass}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Body Type</p>
                    <p className="font-mono text-lg capitalize">
                      {object.bodyKind}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Near-Earth Object
                    </p>
                    <p className="font-mono text-lg">
                      {object.isNeo ? "Yes" : "No"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Potentially Hazardous
                    </p>
                    <p className="font-mono text-lg">
                      {object.isPha ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </>
        )}
      </Accordion>

      {/* Source Links */}
      <Card className="bg-card border-border/50 bezel">
        <CardHeader>
          <CardTitle className="font-display text-base">Data Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {object.links.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-muted/50 hover:bg-muted rounded-md text-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {link.label}
              </a>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Source ID:{" "}
            <span className="font-mono text-foreground">{object.sourceId}</span>
          </p>
        </CardContent>
      </Card>
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
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 bg-muted/30 rounded-lg">
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
