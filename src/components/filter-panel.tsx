"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { X, Filter, RotateCcw } from "lucide-react";
import {
  DISCOVERY_METHODS,
  DISCOVERY_FACILITIES,
  SIZE_CATEGORIES,
  SmallBodyKind,
  SizeCategory,
  ASTEROID_ORBIT_CLASSES,
  COMET_ORBIT_CLASSES,
  SHARED_ORBIT_CLASSES,
  ORBIT_CLASSES,
} from "@/lib/types";

// Exoplanet Filter Types
export interface ExoplanetFilters {
  discoveryMethod?: string;
  year?: number;
  hasRadius?: boolean;
  hasMass?: boolean;
  sizeCategory?: SizeCategory;
  habitable?: boolean;
  facility?: string;
  multiPlanet?: boolean;
}

// Small Body Filter Types
export interface SmallBodyFilters {
  kind?: SmallBodyKind;
  neo?: boolean;
  pha?: boolean;
  orbitClass?: string;
}

interface ExoplanetFilterPanelProps {
  filters: ExoplanetFilters;
  onChange: (filters: ExoplanetFilters) => void;
  onReset: () => void;
}

interface SmallBodyFilterPanelProps {
  filters: SmallBodyFilters;
  onChange: (filters: SmallBodyFilters) => void;
  onReset: () => void;
}

// Count active filters
function countActiveFilters<T extends object>(filters: T): number {
  return Object.values(filters).filter(
    (v) => v !== undefined && v !== null && v !== ""
  ).length;
}

// Active filter chip component
function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <Badge
      variant="secondary"
      className="gap-1 pr-1 bg-primary/20 text-primary border-primary/30"
    >
      {label}
      <button
        onClick={onRemove}
        className="ml-1 rounded-full p-0.5 hover:bg-primary/30 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </Badge>
  );
}

// Year validation constants
const MIN_DISCOVERY_YEAR = 1990;
const MAX_DISCOVERY_YEAR = new Date().getFullYear();

// Generate year options array
const YEAR_OPTIONS = Array.from(
  { length: MAX_DISCOVERY_YEAR - MIN_DISCOVERY_YEAR + 1 },
  (_, i) => MIN_DISCOVERY_YEAR + i
);

// Exoplanet Filter Panel
export function ExoplanetFilterPanel({
  filters,
  onChange,
  onReset,
}: ExoplanetFilterPanelProps) {
  const activeCount = countActiveFilters(filters);

  const updateFilter = <K extends keyof ExoplanetFilters>(
    key: K,
    value: ExoplanetFilters[K]
  ) => {
    onChange({ ...filters, [key]: value });
  };


  const removeFilter = (key: keyof ExoplanetFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onChange(newFilters);
  };

  return (
    <div className="space-y-4">
      {/* Active Filters */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {filters.discoveryMethod && (
            <FilterChip
              label={filters.discoveryMethod}
              onRemove={() => removeFilter("discoveryMethod")}
            />
          )}
          {filters.sizeCategory && (
            <FilterChip
              label={SIZE_CATEGORIES[filters.sizeCategory].label}
              onRemove={() => removeFilter("sizeCategory")}
            />
          )}
          {filters.facility && (
            <FilterChip
              label={filters.facility}
              onRemove={() => removeFilter("facility")}
            />
          )}
          {filters.year && (
            <FilterChip
              label={`Year ${filters.year}`}
              onRemove={() => removeFilter("year")}
            />
          )}
          {filters.habitable && (
            <FilterChip
              label="Habitable Zone"
              onRemove={() => removeFilter("habitable")}
            />
          )}
          {filters.multiPlanet && (
            <FilterChip
              label="Multi-planet"
              onRemove={() => removeFilter("multiPlanet")}
            />
          )}
          {filters.hasRadius && (
            <FilterChip
              label="Has Radius"
              onRemove={() => removeFilter("hasRadius")}
            />
          )}
          {filters.hasMass && (
            <FilterChip
              label="Has Mass"
              onRemove={() => removeFilter("hasMass")}
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset all
          </Button>
        </div>
      )}

      {/* Filter Accordion */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem
          value="filters"
          className="border border-border/50 rounded-lg px-4 bg-card"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              <span className="font-display">Filters</span>
              {activeCount > 0 && (
                <Badge variant="default" className="ml-2 text-xs">
                  {activeCount}
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
            {/* Planet Size Category */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                Planet Size
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(SIZE_CATEGORIES) as SizeCategory[]).map((category) => (
                  <Button
                    key={category}
                    variant={
                      filters.sizeCategory === category ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      updateFilter(
                        "sizeCategory",
                        filters.sizeCategory === category ? undefined : category
                      )
                    }
                    className="text-xs"
                  >
                    {SIZE_CATEGORIES[category].label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Discovery Facility and Year - Side by side on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Discovery Facility */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                  Discovery Facility
                </label>
                <select
                  value={filters.facility || ""}
                  onChange={(e) =>
                    updateFilter("facility", e.target.value || undefined)
                  }
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">All Facilities</option>
                  {DISCOVERY_FACILITIES.map((facility) => (
                    <option key={facility} value={facility}>
                      {facility}
                    </option>
                  ))}
                </select>
              </div>

              {/* Discovery Year */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                  Discovery Year
                </label>
                <select
                  value={filters.year || ""}
                  onChange={(e) =>
                    updateFilter("year", e.target.value ? parseInt(e.target.value, 10) : undefined)
                  }
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">All Years</option>
                  {YEAR_OPTIONS.slice().reverse().map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Discovery Method */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                Discovery Method
              </label>
              <div className="flex flex-wrap gap-2">
                {DISCOVERY_METHODS.map((method) => (
                  <Button
                    key={method}
                    variant={
                      filters.discoveryMethod === method ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      updateFilter(
                        "discoveryMethod",
                        filters.discoveryMethod === method ? undefined : method
                      )
                    }
                    className="text-xs"
                  >
                    {method}
                  </Button>
                ))}
              </div>
            </div>

            {/* Special Filters */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                Special Filters
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filters.habitable ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("habitable", !filters.habitable)}
                  className="text-xs"
                >
                  Potentially Habitable
                </Button>
                <Button
                  variant={filters.multiPlanet ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("multiPlanet", !filters.multiPlanet)}
                  className="text-xs"
                >
                  Multi-planet System
                </Button>
              </div>
            </div>

            {/* Data Availability */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                Data Availability
              </label>
              <div className="flex gap-2">
                <Button
                  variant={filters.hasRadius ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("hasRadius", !filters.hasRadius)}
                  className="text-xs"
                >
                  Has Radius
                </Button>
                <Button
                  variant={filters.hasMass ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("hasMass", !filters.hasMass)}
                  className="text-xs"
                >
                  Has Mass
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

// Get orbit class options based on selected body type
function getOrbitClassOptions(kind?: SmallBodyKind) {
  if (kind === "asteroid") {
    return [...ASTEROID_ORBIT_CLASSES, ...SHARED_ORBIT_CLASSES];
  } else if (kind === "comet") {
    return [...COMET_ORBIT_CLASSES, ...SHARED_ORBIT_CLASSES];
  }
  // Show all orbit classes when "All" is selected
  return [...ASTEROID_ORBIT_CLASSES, ...COMET_ORBIT_CLASSES, ...SHARED_ORBIT_CLASSES];
}

// Check if an orbit class is valid for a given body kind
function isOrbitClassValidForKind(orbitClass: string, kind?: SmallBodyKind): boolean {
  const validOptions = getOrbitClassOptions(kind);
  return validOptions.some(opt => opt.code === orbitClass);
}

// Get display label for an orbit class code
function getOrbitClassLabel(code: string): string {
  return ORBIT_CLASSES[code as keyof typeof ORBIT_CLASSES] || code;
}

// Small Body Filter Panel
export function SmallBodyFilterPanel({
  filters,
  onChange,
  onReset,
}: SmallBodyFilterPanelProps) {
  const activeCount = countActiveFilters(filters);

  const updateFilter = <K extends keyof SmallBodyFilters>(
    key: K,
    value: SmallBodyFilters[K]
  ) => {
    // When changing kind, clear orbitClass if it becomes invalid
    if (key === "kind" && filters.orbitClass) {
      const newKind = value as SmallBodyKind | undefined;
      if (!isOrbitClassValidForKind(filters.orbitClass, newKind)) {
        onChange({ ...filters, [key]: value, orbitClass: undefined });
        return;
      }
    }
    onChange({ ...filters, [key]: value });
  };

  const removeFilter = (key: keyof SmallBodyFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onChange(newFilters);
  };

  const orbitClassOptions = getOrbitClassOptions(filters.kind);

  return (
    <div className="space-y-4">
      {/* Active Filters */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {filters.kind && (
            <FilterChip
              label={filters.kind === "asteroid" ? "Asteroids" : "Comets"}
              onRemove={() => removeFilter("kind")}
            />
          )}
          {filters.neo && (
            <FilterChip label="NEO" onRemove={() => removeFilter("neo")} />
          )}
          {filters.pha && (
            <FilterChip label="PHA" onRemove={() => removeFilter("pha")} />
          )}
          {filters.orbitClass && (
            <FilterChip
              label={getOrbitClassLabel(filters.orbitClass)}
              onRemove={() => removeFilter("orbitClass")}
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset all
          </Button>
        </div>
      )}

      {/* Type Toggle */}
      <div className="flex gap-2">
        <Button
          variant={filters.kind === undefined ? "default" : "outline"}
          size="sm"
          onClick={() => updateFilter("kind", undefined)}
        >
          All
        </Button>
        <Button
          variant={filters.kind === "asteroid" ? "default" : "outline"}
          size="sm"
          onClick={() => updateFilter("kind", "asteroid")}
        >
          Asteroids
        </Button>
        <Button
          variant={filters.kind === "comet" ? "default" : "outline"}
          size="sm"
          onClick={() => updateFilter("kind", "comet")}
        >
          Comets
        </Button>
      </div>

      {/* Filter Accordion */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem
          value="filters"
          className="border border-border/50 rounded-lg px-4 bg-card"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-primary" />
              <span className="font-display">More Filters</span>
              {(filters.neo || filters.pha || filters.orbitClass) && (
                <Badge variant="default" className="ml-2 text-xs">
                  {(filters.neo ? 1 : 0) + (filters.pha ? 1 : 0) + (filters.orbitClass ? 1 : 0)}
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
            {/* Orbit Class */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                Orbit Class
              </label>
              <div className="flex flex-wrap gap-2">
                {orbitClassOptions.map((option) => (
                  <Button
                    key={option.code}
                    variant={filters.orbitClass === option.code ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      updateFilter(
                        "orbitClass",
                        filters.orbitClass === option.code ? undefined : option.code
                      )
                    }
                    className="text-xs"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Classification Filters */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                Classification
              </label>
              <div className="flex gap-2">
                <Button
                  variant={filters.neo ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("neo", !filters.neo)}
                  className="text-xs"
                >
                  Near-Earth Objects (NEO)
                </Button>
                <Button
                  variant={filters.pha ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => updateFilter("pha", !filters.pha)}
                  className="text-xs"
                >
                  Potentially Hazardous (PHA)
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
