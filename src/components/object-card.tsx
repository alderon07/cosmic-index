"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AnyCosmicObject,
  isExoplanet,
  isSmallBody,
  isStar,
} from "@/lib/types";
import { Orbit, Sparkles, AlertTriangle } from "lucide-react";

// SessionStorage keys for storing list page URLs
const EXOPLANETS_LIST_URL_KEY = "exoplanetsListUrl";
const SMALL_BODIES_LIST_URL_KEY = "smallBodiesListUrl";
const STARS_LIST_URL_KEY = "starsListUrl";

interface ObjectCardProps {
  object: AnyCosmicObject;
}

export function ObjectCard({ object }: ObjectCardProps) {
  const href = isExoplanet(object)
    ? `/exoplanets/${object.id}`
    : isStar(object)
    ? `/stars/${object.id}`
    : `/small-bodies/${object.id}`;

  const typeLabel = isExoplanet(object)
    ? "Exoplanet"
    : isStar(object)
    ? "Star"
    : isSmallBody(object)
    ? object.bodyKind === "comet"
      ? "Comet"
      : "Asteroid"
    : "Unknown";

  const typeVariant = isExoplanet(object)
    ? "default"
    : isStar(object)
    ? "outline"
    : isSmallBody(object) && object.bodyKind === "comet"
    ? "outline"
    : "secondary";

  const typeClassName = isStar(object)
    ? "border-uranium-green/50 text-uranium-green bg-uranium-green/10"
    : isSmallBody(object) && object.bodyKind === "comet"
    ? "border-radium-teal/50 text-radium-teal bg-radium-teal/10"
    : "";

  // Name color based on object type
  const nameColorClass = isExoplanet(object)
    ? "text-primary"
    : isStar(object)
    ? "text-uranium-green"
    : isSmallBody(object) && object.bodyKind === "comet"
    ? "text-radium-teal"
    : "text-secondary";

  // Get first 3-4 key facts
  const displayFacts = object.keyFacts.slice(0, 4);

  // Store current list page URL when clicking to navigate to detail page
  const handleClick = () => {
    if (typeof window !== "undefined") {
      const currentUrl = window.location.pathname + window.location.search;
      const storageKey = isExoplanet(object)
        ? EXOPLANETS_LIST_URL_KEY
        : isStar(object)
        ? STARS_LIST_URL_KEY
        : SMALL_BODIES_LIST_URL_KEY;
      sessionStorage.setItem(storageKey, currentUrl);
    }
  };

  return (
    <Link href={href} onClick={handleClick} className="block group">
      <Card className="h-full bg-card border-border/50 transition-all duration-300 hover:border-primary/50 hover:glow-orange bezel scanlines overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className={`font-display text-lg ${nameColorClass} transition-colors line-clamp-2`}>
                {object.displayName}
              </CardTitle>
              {isSmallBody(object) && object.aliases.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {object.aliases[0]}
                </p>
              )}
            </div>
            <Badge variant={typeVariant} className={`shrink-0 font-mono text-xs ${typeClassName}`}>
              {typeLabel}
            </Badge>
          </div>

          {/* Additional badges for small bodies */}
          {isSmallBody(object) && (object.isNeo || object.isPha) && (
            <div className="flex gap-1.5 mt-2">
              {object.isNeo && (
                <Badge variant="outline" className="text-xs border-amber-glow/50 text-amber-glow">
                  <Orbit className="w-3 h-3 mr-1" />
                  NEO
                </Badge>
              )}
              {object.isPha && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  PHA
                </Badge>
              )}
            </div>
          )}

          {/* Host star for exoplanets */}
          {isExoplanet(object) && object.hostStar && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-secondary" />
              {object.hostStar}
            </p>
          )}

        </CardHeader>

        <CardContent className="pt-0 flex flex-col flex-1 min-h-0">
          {/* Key Facts Grid */}
          <div className="flex-1">
            <div className="pb-4 grid grid-cols-2 gap-x-4 gap-y-2">
              {displayFacts.map((fact, index) => (
                <div key={index} className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    {fact.label}
                  </p>
                  <p className="text-sm font-mono text-foreground truncate">
                    {fact.value}
                    {fact.unit && (
                      <span className="text-muted-foreground ml-1 text-xs">
                        {fact.unit}
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Discovery year badge */}
          {object.discoveredYear && (
            <div className="mt-auto pt-2 pb-1 border-t border-border/30">
              <p className="text-xs text-muted-foreground">
                Discovered{" "}
                <span className="font-mono text-foreground">
                  {object.discoveredYear}
                </span>
              </p>
            </div>
          )}

          {/* <div className="mt-3 pt-2 border-t border-border/30 flex items-center justify-end">
            <span className="text-xs text-primary/70 group-hover:text-primary transition-colors">
              <SquareArrowOutUpRight className="w-3 h-3 mr-1"/>
            </span>
          </div> */}
        </CardContent>
      </Card>
    </Link>
  );
}

// Loading skeleton for ObjectCard
export function ObjectCardSkeleton() {
  return (
    <Card className="h-full bg-card border-border/50 bezel overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="h-6 w-3/4 data-stream rounded" />
          <div className="h-5 w-16 data-stream rounded" />
        </div>
        <div className="h-4 w-1/2 data-stream rounded mt-2" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-3 w-12 data-stream rounded mb-1" />
              <div className="h-4 w-16 data-stream rounded" />
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-border/30">
          <div className="h-3 w-24 data-stream rounded" />
        </div>
      </CardContent>
    </Card>
  );
}
