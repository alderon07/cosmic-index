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
import {
  Orbit,
  Sparkles,
  AlertTriangle,
  SquareArrowOutUpRight,
  ChevronRight,
  Star,
  Circle,
  Timer,
  Ruler,
  Calendar,
  Thermometer,
  Scale,
  Globe,
  Gauge,
} from "lucide-react";
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

  // All type badges use outline variant with consistent styling
  const typeVariant = "outline" as const;

  const typeClassName = isExoplanet(object)
    ? "border-primary/50 text-primary bg-primary/10"
    : isStar(object)
    ? "border-uranium-green/50 text-uranium-green bg-uranium-green/10"
    : isSmallBody(object) && object.bodyKind === "comet"
    ? "border-radium-teal/50 text-radium-teal bg-radium-teal/10"
    : "border-secondary/50 text-secondary bg-secondary/10"; // asteroids

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

  // Handle navigation icon click (navigates to detail page, stops propagation in modal mode)
  const handleNavigateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    storeListUrl();
  };

  // Compact variant for list view - with type-specific column layouts
  if (variant === "compact") {
    // Type-specific data extraction for optimal list display
    const renderExoplanetColumns = () => {
      const exo = object as ExoplanetData;
      const cellClass = "min-w-0 flex flex-col items-center gap-0.5 justify-start";
      return (
        <>
          <div className={cellClass}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help" aria-hidden="true">
                  <Star className="w-3.5 h-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Host star</TooltipContent>
            </Tooltip>
            <p className="text-xs font-mono text-foreground truncate w-full text-center">{exo.hostStar || "—"}</p>
          </div>
          <div className={cellClass}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help" aria-hidden="true">
                  <Circle className="w-3.5 h-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Radius (Earth radii)</TooltipContent>
            </Tooltip>
            <p className="text-xs font-mono text-foreground truncate w-full text-center">
              {exo.radiusEarth ? `${exo.radiusEarth.toFixed(1)} R⊕` : "—"}
            </p>
          </div>
          <div className={cellClass}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help" aria-hidden="true">
                  <Timer className="w-3.5 h-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Orbital period</TooltipContent>
            </Tooltip>
            <p className="text-xs font-mono text-foreground truncate w-full text-center">
              {exo.orbitalPeriodDays ? `${exo.orbitalPeriodDays.toFixed(1)} d` : "—"}
            </p>
          </div>
          <div className={cellClass}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help" aria-hidden="true">
                  <Ruler className="w-3.5 h-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Distance (pc)</TooltipContent>
            </Tooltip>
            <p className="text-xs font-mono text-foreground truncate w-full text-center">
              {exo.distanceParsecs ? `${exo.distanceParsecs.toFixed(0)} pc` : "—"}
            </p>
          </div>
          <div className={cellClass}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help" aria-hidden="true">
                  <Calendar className="w-3.5 h-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Discovery year</TooltipContent>
            </Tooltip>
            <p className="text-xs font-mono text-foreground truncate w-full text-center">{exo.discoveredYear || "—"}</p>
          </div>
        </>
      );
    };

    const renderStarColumns = () => {
      const star = object as StarData;
      const cellClass = "min-w-0 flex flex-col items-center gap-0.5 justify-start";
      return (
        <>
          <div className={cellClass}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help" aria-hidden="true">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Spectral class</TooltipContent>
            </Tooltip>
            <p className="text-xs font-mono text-foreground truncate w-full text-center">{star.spectralClass || "—"}</p>
          </div>
          <div className={cellClass}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help" aria-hidden="true">
                  <Thermometer className="w-3.5 h-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Temperature (K)</TooltipContent>
            </Tooltip>
            <p className="text-xs font-mono text-foreground truncate w-full text-center">
              {star.starTempK ? `${star.starTempK.toFixed(0)} K` : "—"}
            </p>
          </div>
          <div className={cellClass}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help" aria-hidden="true">
                  <Scale className="w-3.5 h-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Mass (solar)</TooltipContent>
            </Tooltip>
            <p className="text-xs font-mono text-foreground truncate w-full text-center">
              {star.starMassSolar ? `${star.starMassSolar.toFixed(2)} M☉` : "—"}
            </p>
          </div>
          <div className={cellClass}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help" aria-hidden="true">
                  <Globe className="w-3.5 h-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Planet count</TooltipContent>
            </Tooltip>
            <p className="text-xs font-mono text-foreground truncate w-full text-center">{star.planetCount}</p>
          </div>
          <div className={cellClass}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help" aria-hidden="true">
                  <Ruler className="w-3.5 h-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Distance (pc)</TooltipContent>
            </Tooltip>
            <p className="text-xs font-mono text-foreground truncate w-full text-center">
              {star.distanceParsecs ? `${star.distanceParsecs.toFixed(1)} pc` : "—"}
            </p>
          </div>
        </>
      );
    };

    const renderSmallBodyColumns = () => {
      const sb = object as SmallBodyData;
      const cellClass = "min-w-0 flex flex-col items-center gap-0.5 justify-start";
      return (
        <>
          <div className={cellClass}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help" aria-hidden="true">
                  <Orbit className="w-3.5 h-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Orbit class</TooltipContent>
            </Tooltip>
            <p className="text-xs font-mono text-foreground truncate w-full text-center">{sb.orbitClass || "—"}</p>
          </div>
          <div className={cellClass}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help" aria-hidden="true">
                  <Circle className="w-3.5 h-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Diameter (km)</TooltipContent>
            </Tooltip>
            <p className="text-xs font-mono text-foreground truncate w-full text-center">
              {sb.diameterKm ? `${sb.diameterKm.toFixed(1)} km` : "—"}
            </p>
          </div>
          <div className={cellClass}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help" aria-hidden="true">
                  <Gauge className="w-3.5 h-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Absolute magnitude (H)</TooltipContent>
            </Tooltip>
            <p className="text-xs font-mono text-foreground truncate w-full text-center">
              {sb.absoluteMagnitude ? sb.absoluteMagnitude.toFixed(1) : "—"}
            </p>
          </div>
          <div className={cellClass}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-help" aria-hidden="true">
                  <Calendar className="w-3.5 h-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Discovery year</TooltipContent>
            </Tooltip>
            <p className="text-xs font-mono text-foreground truncate w-full text-center">{sb.discoveredYear || "—"}</p>
          </div>
        </>
      );
    };

    const compactContent = (
      <Card className={`w-full py-0 bg-card border-border/50 transition-all duration-300 ${hoverStyles} bezel overflow-hidden min-h-[44px]`}>
        <CardContent className="w-full py-3 px-4 min-h-[44px] flex flex-col md:grid md:grid-cols-[1fr_2fr_1fr] md:items-center justify-center gap-y-2.5 md:gap-y-0 md:gap-x-6">
          {/* Block 1: Name and subtitle (left on md+; on mobile, subtitle next to title) */}
          <div className="min-w-0 overflow-hidden flex flex-row flex-wrap items-baseline gap-x-2">
            <p className={`font-display text-sm font-medium ${nameColorClass} truncate min-w-0`}>
              {object.displayName}
            </p>
            {isExoplanet(object) && object.discoveryMethod && (
              <span className="text-xs text-muted-foreground shrink-0">
                {object.discoveryMethod}
              </span>
            )}
            {isSmallBody(object) && object.aliases.length > 0 && (
              <span className="text-xs text-muted-foreground truncate shrink-0 max-w-32">
                {object.aliases[0]}
              </span>
            )}
          </div>

          {/* Block 2: Data columns (center on md+, grid for consistent spacing) */}
          <div className="w-full md:w-auto min-w-0">
            <div
              className={`grid min-w-0 w-full md:w-auto gap-x-4 sm:gap-x-6 ${
                isSmallBody(object) ? "grid-cols-4" : "grid-cols-5"
              }`}
            >
              {isExoplanet(object) && renderExoplanetColumns()}
              {isStar(object) && renderStarColumns()}
              {isSmallBody(object) && renderSmallBodyColumns()}
            </div>
          </div>

          {/* Block 3: Badges + navigation icon (right on md+) */}
          <div className="flex shrink-0 items-center justify-end gap-2 min-w-0">
            {isSmallBody(object) && object.isNeo && (
              <Badge variant="outline" className="text-[10px] border-amber-glow/50 text-amber-glow py-0 px-1.5">
                NEO
              </Badge>
            )}
            {isSmallBody(object) && object.isPha && (
              <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                PHA
              </Badge>
            )}
            <Badge variant={typeVariant} className={`font-mono text-[10px] py-0 px-1.5 ${typeClassName}`}>
              {typeLabel}
            </Badge>
            {onModalOpen ? (
              <Link
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleNavigateClick}
                className={`p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hidden md:block ${iconLinkHover}`}
                aria-label={`Go to ${object.displayName} detail page (opens in new tab)`}
              >
                <SquareArrowOutUpRight className={`w-4 h-4 text-muted-foreground transition-colors ${iconHoverText}`} />
              </Link>
            ) : (
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-colors hidden md:block ${iconHoverText}`} />
            )}
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
          className="block w-full group cursor-pointer"
        >
          {compactContent}
        </div>
      );
    }

    return (
      <Link href={href} onClick={storeListUrl} className="block w-full group">
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

  const cardContent = (
    <>
      {/* Navigation icon (only in modal mode) */}
      {onModalOpen && (
        <Link
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleNavigateClick}
          className={`absolute top-3 right-3 z-10 p-1.5 rounded-md bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity ${iconLinkHover}`}
          aria-label={`Go to ${object.displayName} detail page (opens in new tab)`}
        >
          <SquareArrowOutUpRight className={`w-4 h-4 text-muted-foreground transition-colors ${iconHoverText}`} />
        </Link>
      )}

      <CardHeader className="pb-3">
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
      </CardContent>

      {/* Bottom: line separator + discovery year (if any) + badges */}
      <div className="border-t border-border/50 px-6 pt-3 flex flex-wrap items-center gap-2 min-w-0">
        {object.discoveredYear && (
          <p className="text-xs text-muted-foreground">
            Discovered{" "}
            <span className="font-mono text-foreground">
              {object.discoveredYear}
            </span>
          </p>
        )}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto justify-end">
          {isSmallBody(object) && object.isNeo && (
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
          {isSmallBody(object) && object.isPha && (
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
          <Badge variant={typeVariant} className={`font-mono text-xs ${typeClassName}`}>
            {typeLabel}
          </Badge>
        </div>
      </div>
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
      <Card className="py-0 bg-card border-border/50 bezel overflow-hidden min-h-[44px]">
        <CardContent className="py-3 px-4 min-h-[44px] flex flex-col md:grid md:grid-cols-[1fr_2fr_1fr] md:items-center justify-center gap-y-2.5 md:gap-y-0 md:gap-x-6">
          <div className="min-w-0">
            <div className="h-4 w-32 data-stream rounded" />
            <div className="h-3 w-20 data-stream rounded mt-1" />
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
      <CardHeader className="pb-3">
        <div className="h-6 w-3/4 data-stream rounded" />
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
      </CardContent>
      <div className="border-t border-border/50 px-6 py-3 flex items-center justify-end">
        <div className="h-5 w-16 data-stream rounded" />
      </div>
    </Card>
  );
}
