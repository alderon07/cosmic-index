"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AnyCosmicObject,
  ExoplanetData,
  StarData,
  SmallBodyData,
  isExoplanet,
  isSmallBody,
  isStar,
} from "@/lib/types";
import { Orbit, Sparkles, AlertTriangle, SquareArrowOutUpRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TOOLTIP_CONTENT } from "@/components/info-tooltip";

// SessionStorage keys for storing list page URLs
const EXOPLANETS_LIST_URL_KEY = "exoplanetsListUrl";
const SMALL_BODIES_LIST_URL_KEY = "smallBodiesListUrl";
const STARS_LIST_URL_KEY = "starsListUrl";

export type ObjectCardVariant = "default" | "compact";

interface ObjectCardProps {
  object: AnyCosmicObject;
  onModalOpen?: (object: AnyCosmicObject) => void;
  variant?: ObjectCardVariant;
}

export function ObjectCard({ object, onModalOpen, variant = "default" }: ObjectCardProps) {
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

  // Hover border and glow based on object type
  const hoverStyles = isExoplanet(object)
    ? "hover:border-primary/50 hover:glow-orange"
    : isStar(object)
    ? "hover:border-uranium-green/50 hover:glow-uranium"
    : isSmallBody(object) && object.bodyKind === "comet"
    ? "hover:border-radium-teal/50 hover:glow-teal"
    : "hover:border-secondary/50 hover:glow-amber";

  // View page icon hover: match theme of the card
  const iconLinkHover = isExoplanet(object)
    ? "hover:bg-primary/20"
    : isStar(object)
    ? "hover:bg-uranium-green/20"
    : isSmallBody(object) && object.bodyKind === "comet"
    ? "hover:bg-radium-teal/20"
    : "hover:bg-secondary/20";
  const iconHoverText = isExoplanet(object)
    ? "hover:text-primary"
    : isStar(object)
    ? "hover:text-uranium-green"
    : isSmallBody(object) && object.bodyKind === "comet"
    ? "hover:text-radium-teal"
    : "hover:text-secondary";

  // Get first 3-4 key facts
  const displayFacts = object.keyFacts.slice(0, 4);

  // Store current list page URL when clicking to navigate to detail page
  const storeListUrl = () => {
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

  // Compact variant for list view - with type-specific column layouts
  if (variant === "compact") {
    // Type-specific data extraction for optimal list display
    const renderExoplanetColumns = () => {
      const exo = object as ExoplanetData;
      return (
        <>
          {/* Host Star */}
          <div className="hidden sm:block text-right shrink-0 w-24">
            <p className="text-xs text-muted-foreground">Host</p>
            <p className="text-xs font-mono text-foreground truncate">{exo.hostStar || "—"}</p>
          </div>
          {/* Radius */}
          <div className="text-right shrink-0 w-16">
            <p className="text-xs text-muted-foreground">Radius</p>
            <p className="text-xs font-mono text-foreground">
              {exo.radiusEarth ? `${exo.radiusEarth.toFixed(1)} R⊕` : "—"}
            </p>
          </div>
          {/* Period */}
          <div className="hidden md:block text-right shrink-0 w-20">
            <p className="text-xs text-muted-foreground">Period</p>
            <p className="text-xs font-mono text-foreground">
              {exo.orbitalPeriodDays ? `${exo.orbitalPeriodDays.toFixed(1)} d` : "—"}
            </p>
          </div>
          {/* Distance */}
          <div className="hidden lg:block text-right shrink-0 w-20">
            <p className="text-xs text-muted-foreground">Distance</p>
            <p className="text-xs font-mono text-foreground">
              {exo.distanceParsecs ? `${exo.distanceParsecs.toFixed(0)} pc` : "—"}
            </p>
          </div>
          {/* Discovery Year */}
          <div className="hidden xl:block text-right shrink-0 w-14">
            <p className="text-xs text-muted-foreground">Year</p>
            <p className="text-xs font-mono text-foreground">{exo.discoveredYear || "—"}</p>
          </div>
        </>
      );
    };

    const renderStarColumns = () => {
      const star = object as StarData;
      return (
        <>
          {/* Spectral Class */}
          <div className="text-right shrink-0 w-14">
            <p className="text-xs text-muted-foreground">Class</p>
            <p className="text-xs font-mono text-foreground">{star.spectralClass || "—"}</p>
          </div>
          {/* Temperature */}
          <div className="hidden sm:block text-right shrink-0 w-16">
            <p className="text-xs text-muted-foreground">Temp</p>
            <p className="text-xs font-mono text-foreground">
              {star.starTempK ? `${star.starTempK.toFixed(0)} K` : "—"}
            </p>
          </div>
          {/* Mass */}
          <div className="hidden md:block text-right shrink-0 w-16">
            <p className="text-xs text-muted-foreground">Mass</p>
            <p className="text-xs font-mono text-foreground">
              {star.starMassSolar ? `${star.starMassSolar.toFixed(2)} M☉` : "—"}
            </p>
          </div>
          {/* Planet Count */}
          <div className="text-right shrink-0 w-16">
            <p className="text-xs text-muted-foreground">Planets</p>
            <p className="text-xs font-mono text-foreground">{star.planetCount}</p>
          </div>
          {/* Distance */}
          <div className="hidden lg:block text-right shrink-0 w-20">
            <p className="text-xs text-muted-foreground">Distance</p>
            <p className="text-xs font-mono text-foreground">
              {star.distanceParsecs ? `${star.distanceParsecs.toFixed(1)} pc` : "—"}
            </p>
          </div>
        </>
      );
    };

    const renderSmallBodyColumns = () => {
      const sb = object as SmallBodyData;
      return (
        <>
          {/* Orbit Class */}
          <div className="hidden sm:block text-right shrink-0 w-20">
            <p className="text-xs text-muted-foreground">Orbit</p>
            <p className="text-xs font-mono text-foreground truncate">{sb.orbitClass || "—"}</p>
          </div>
          {/* Diameter */}
          <div className="text-right shrink-0 w-20">
            <p className="text-xs text-muted-foreground">Diameter</p>
            <p className="text-xs font-mono text-foreground">
              {sb.diameterKm ? `${sb.diameterKm.toFixed(1)} km` : "—"}
            </p>
          </div>
          {/* Absolute Magnitude */}
          <div className="hidden md:block text-right shrink-0 w-14">
            <p className="text-xs text-muted-foreground">H mag</p>
            <p className="text-xs font-mono text-foreground">
              {sb.absoluteMagnitude ? sb.absoluteMagnitude.toFixed(1) : "—"}
            </p>
          </div>
          {/* Discovery Year */}
          <div className="hidden lg:block text-right shrink-0 w-14">
            <p className="text-xs text-muted-foreground">Year</p>
            <p className="text-xs font-mono text-foreground">{sb.discoveredYear || "—"}</p>
          </div>
        </>
      );
    };

    const compactContent = (
      <Card className={`bg-card border-border/50 transition-all duration-300 ${hoverStyles} bezel overflow-hidden`}>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-4">
            {/* Left: Name and badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-display text-sm ${nameColorClass} truncate`}>
                  {object.displayName}
                </span>
                {isSmallBody(object) && object.isNeo && (
                  <Badge variant="outline" className="text-[10px] border-amber-glow/50 text-amber-glow shrink-0 py-0 px-1.5">
                    NEO
                  </Badge>
                )}
                {isSmallBody(object) && object.isPha && (
                  <Badge variant="destructive" className="text-[10px] shrink-0 py-0 px-1.5">
                    PHA
                  </Badge>
                )}
              </div>
              {/* Secondary info line */}
              {isExoplanet(object) && object.discoveryMethod && (
                <p className="text-xs text-muted-foreground truncate">
                  {object.discoveryMethod}
                </p>
              )}
              {isSmallBody(object) && object.aliases.length > 0 && (
                <p className="text-xs text-muted-foreground truncate">
                  {object.aliases[0]}
                </p>
              )}
            </div>

            {/* Type-specific data columns */}
            {isExoplanet(object) && renderExoplanetColumns()}
            {isStar(object) && renderStarColumns()}
            {isSmallBody(object) && renderSmallBodyColumns()}

            {/* Type badge */}
            <Badge variant={typeVariant} className={`shrink-0 font-mono text-[10px] ${typeClassName}`}>
              {typeLabel}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );

    // Handle click behavior for compact variant
    if (onModalOpen) {
      return (
        <div
          role="button"
          tabIndex={0}
          onClick={() => onModalOpen(object)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onModalOpen(object);
            }
          }}
          className="block group cursor-pointer"
        >
          {compactContent}
        </div>
      );
    }

    return (
      <Link href={href} onClick={storeListUrl} className="block group">
        {compactContent}
      </Link>
    );
  }

  // Handle card click - opens modal if onModalOpen provided
  const handleCardClick = () => {
    if (onModalOpen) {
      onModalOpen(object);
    }
  };

  // Handle keyboard interaction for modal mode
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onModalOpen && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onModalOpen(object);
    }
  };

  // Handle navigation icon click (navigates to detail page)
  const handleNavigateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    storeListUrl();
  };

  const cardContent = (
    <>
      {/* Navigation icon (only in modal mode) */}
      {onModalOpen && (
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleNavigateClick}
          className={`absolute bottom-3 right-3 z-10 p-1.5 rounded-md bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity ${iconLinkHover}`}
          aria-label={`Go to ${object.displayName} detail page (opens in new tab)`}
        >
          <SquareArrowOutUpRight className={`w-4 h-4 text-muted-foreground transition-colors ${iconHoverText}`} />
        </Link>
      )}

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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs border-amber-glow/50 text-amber-glow cursor-help">
                    <Orbit className="w-3 h-3 mr-1" />
                    NEO
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs border-secondary/30">
                  {TOOLTIP_CONTENT.NEO}
                </TooltipContent>
              </Tooltip>
            )}
            {object.isPha && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="destructive" className="text-xs cursor-help">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    PHA
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs border-destructive/30">
                  {TOOLTIP_CONTENT.PHA}
                </TooltipContent>
              </Tooltip>
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
      </CardContent>
    </>
  );

  // Modal mode: card click opens modal, icon navigates
  if (onModalOpen) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        className="block group cursor-pointer"
      >
        <Card className={`h-full bg-card border-border/50 transition-all duration-300 ${hoverStyles} bezel scanlines overflow-hidden relative`}>
          {cardContent}
        </Card>
      </div>
    );
  }

  // Default mode: entire card is a link
  return (
    <Link href={href} onClick={storeListUrl} className="block group">
      <Card className={`h-full bg-card border-border/50 transition-all duration-300 ${hoverStyles} bezel scanlines overflow-hidden relative`}>
        {cardContent}
      </Card>
    </Link>
  );
}

// Loading skeleton for ObjectCard
interface ObjectCardSkeletonProps {
  variant?: ObjectCardVariant;
}

export function ObjectCardSkeleton({ variant = "default" }: ObjectCardSkeletonProps) {
  if (variant === "compact") {
    return (
      <Card className="bg-card border-border/50 bezel overflow-hidden">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-4">
            {/* Name area */}
            <div className="flex-1 min-w-0">
              <div className="h-4 w-32 data-stream rounded mb-1" />
              <div className="h-3 w-20 data-stream rounded" />
            </div>
            {/* Data columns */}
            <div className="hidden sm:block text-right shrink-0 w-20">
              <div className="h-3 w-10 data-stream rounded mb-1 ml-auto" />
              <div className="h-3 w-16 data-stream rounded ml-auto" />
            </div>
            <div className="text-right shrink-0 w-16">
              <div className="h-3 w-10 data-stream rounded mb-1 ml-auto" />
              <div className="h-3 w-14 data-stream rounded ml-auto" />
            </div>
            <div className="hidden md:block text-right shrink-0 w-16">
              <div className="h-3 w-10 data-stream rounded mb-1 ml-auto" />
              <div className="h-3 w-14 data-stream rounded ml-auto" />
            </div>
            <div className="hidden lg:block text-right shrink-0 w-16">
              <div className="h-3 w-10 data-stream rounded mb-1 ml-auto" />
              <div className="h-3 w-14 data-stream rounded ml-auto" />
            </div>
            {/* Type badge */}
            <div className="h-5 w-14 data-stream rounded shrink-0" />
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
