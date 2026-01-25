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
import { DISCOVERY_METHODS, SmallBodyKind } from "@/lib/types";

// Exoplanet Filter Types
export interface ExoplanetFilters {
  discoveryMethod?: string;
  yearFrom?: number;
  yearTo?: number;
  hasRadius?: boolean;
  hasMass?: boolean;
}

// Small Body Filter Types
export interface SmallBodyFilters {
  kind?: SmallBodyKind;
  neo?: boolean;
  pha?: boolean;
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
          {filters.yearFrom && (
            <FilterChip
              label={`From ${filters.yearFrom}`}
              onRemove={() => removeFilter("yearFrom")}
            />
          )}
          {filters.yearTo && (
            <FilterChip
              label={`To ${filters.yearTo}`}
              onRemove={() => removeFilter("yearTo")}
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

            {/* Year Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                  Year From
                </label>
                <input
                  type="number"
                  min={1990}
                  max={2030}
                  value={filters.yearFrom || ""}
                  onChange={(e) =>
                    updateFilter(
                      "yearFrom",
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  placeholder="1990"
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                  Year To
                </label>
                <input
                  type="number"
                  min={1990}
                  max={2030}
                  value={filters.yearTo || ""}
                  onChange={(e) =>
                    updateFilter(
                      "yearTo",
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  placeholder="2025"
                  className="w-full px-3 py-2 bg-input border border-border rounded-md text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
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
    onChange({ ...filters, [key]: value });
  };

  const removeFilter = (key: keyof SmallBodyFilters) => {
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
              {(filters.neo || filters.pha) && (
                <Badge variant="default" className="ml-2 text-xs">
                  {(filters.neo ? 1 : 0) + (filters.pha ? 1 : 0)}
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
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
