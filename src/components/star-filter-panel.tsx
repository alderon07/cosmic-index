"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { X, Filter, RotateCcw, ArrowUpDown, ChevronDown } from "lucide-react";
import { SpectralClass, SPECTRAL_CLASS_INFO } from "@/lib/types";
import { THEMES } from "@/lib/theme";

// Use stars theme
const theme = THEMES.stars;

// Spectral classes for filtering (excludes "Unknown")
type FilterableSpectralClass = Exclude<SpectralClass, "Unknown">;

// Star Filter Types
export interface StarFilters {
  spectralClass?: SpectralClass;
  minPlanets?: number;
  multiPlanet?: boolean;
  maxDistancePc?: number;
  sort?: "name" | "distance" | "vmag" | "planetCount" | "planetCountDesc";
}

// Distance presets (parsecs)
const DISTANCE_PRESETS = [
  { value: 10, label: "< 10 pc (~33 ly)" },
  { value: 50, label: "< 50 pc (~163 ly)" },
  { value: 100, label: "< 100 pc (~326 ly)" },
  { value: 500, label: "< 500 pc (~1,630 ly)" },
  { value: 1000, label: "< 1,000 pc (~3,260 ly)" },
] as const;

// Min planets presets
const MIN_PLANETS_PRESETS = [
  { value: 1, label: "1+" },
  { value: 2, label: "2+" },
  { value: 3, label: "3+" },
  { value: 5, label: "5+" },
] as const;

// Sort options
const SORT_OPTIONS = [
  { value: "name", label: "Name (A-Z)" },
  { value: "planetCountDesc", label: "Most Planets" },
  { value: "distance", label: "Closest" },
  { value: "vmag", label: "Brightest" },
] as const;

interface StarFilterPanelProps {
  filters: StarFilters;
  onChange: (filters: StarFilters) => void;
  onReset: () => void;
}

// Count active filters (excluding sort)
function countActiveFilters(filters: StarFilters): number {
  let count = 0;
  if (filters.spectralClass) count++;
  if (filters.minPlanets) count++;
  if (filters.multiPlanet) count++;
  if (filters.maxDistancePc) count++;
  return count;
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
      className={`gap-1 pr-1 ${theme.filterChip}`}
    >
      {label}
      <button
        onClick={onRemove}
        className={`ml-1 rounded-full p-0.5 ${theme.filterChipHover} transition-colors`}
      >
        <X className="w-3 h-3" />
      </button>
    </Badge>
  );
}

export function StarFilterPanel({
  filters,
  onChange,
  onReset,
}: StarFilterPanelProps) {
  const activeCount = countActiveFilters(filters);

  const updateFilter = <K extends keyof StarFilters>(
    key: K,
    value: StarFilters[K]
  ) => {
    onChange({ ...filters, [key]: value });
  };

  const removeFilter = (key: keyof StarFilters) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onChange(newFilters);
  };

  // Spectral classes with color indicators (excludes "Unknown")
  const spectralClasses: FilterableSpectralClass[] = ["O", "B", "A", "F", "G", "K", "M"];

  return (
    <div className="space-y-4">
      {/* Active Filters */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Active filters:</span>
          {filters.spectralClass && (
            <FilterChip
              label={`${filters.spectralClass}-type`}
              onRemove={() => removeFilter("spectralClass")}
            />
          )}
          {filters.minPlanets && (
            <FilterChip
              label={`${filters.minPlanets}+ planets`}
              onRemove={() => removeFilter("minPlanets")}
            />
          )}
          {filters.multiPlanet && !filters.minPlanets && (
            <FilterChip
              label="Multi-planet"
              onRemove={() => removeFilter("multiPlanet")}
            />
          )}
          {filters.maxDistancePc && (
            <FilterChip
              label={`< ${filters.maxDistancePc.toLocaleString()} pc`}
              onRemove={() => removeFilter("maxDistancePc")}
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

      {/* Sort Selector - Always visible */}
      <div className="flex items-center gap-3">
        <label htmlFor="star-filter-sort" className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
          <ArrowUpDown className={`w-3.5 h-3.5 ${theme.text}`} />
          Sort
        </label>
        <div className="relative">
          <select
            id="star-filter-sort"
            value={filters.sort || "name"}
            onChange={(e) =>
              updateFilter("sort", e.target.value as StarFilters["sort"])
            }
            className={`appearance-none pl-3 pr-8 py-1.5 bg-card border rounded-md text-sm text-foreground font-mono cursor-pointer transition-all duration-200 hover:bg-card/80 focus:outline-none focus:ring-1 ${theme.sortSelect}`}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 ${theme.text} opacity-70 pointer-events-none`} />
        </div>
      </div>

      {/* Filter Accordion */}
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem
          value="filters"
          className="border border-border/50 rounded-lg px-4 bg-card"
        >
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Filter className={`w-4 h-4 ${theme.text}`} />
              <span className="font-display">Filters</span>
              {activeCount > 0 && (
                <Badge variant="outline" className={`ml-2 text-xs ${theme.filterBadge}`}>
                  {activeCount}
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
            {/* Spectral Class */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                Spectral Class
              </label>
              <div className="flex flex-wrap gap-2">
                {spectralClasses.map((sc) => {
                  const info = SPECTRAL_CLASS_INFO[sc];
                  const isSelected = filters.spectralClass === sc;
                  return (
                    <Button
                      key={sc}
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateFilter(
                          "spectralClass",
                          isSelected ? undefined : sc
                        )
                      }
                      className={`text-xs relative ${isSelected ? theme.selectedButton : ""}`}
                      title={`${info.description} (${info.tempRange})`}
                    >
                      <span
                        className="w-2 h-2 rounded-full mr-1.5"
                        style={{ backgroundColor: info.color }}
                      />
                      {sc}
                    </Button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                O (hottest) to M (coolest). G is Sun-like.
              </p>
            </div>

            {/* Min Planets */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                Minimum Planets
              </label>
              <div className="flex flex-wrap gap-2">
                {MIN_PLANETS_PRESETS.map((preset) => (
                  <Button
                    key={preset.value}
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateFilter(
                        "minPlanets",
                        filters.minPlanets === preset.value ? undefined : preset.value
                      )
                    }
                    className={`text-xs ${filters.minPlanets === preset.value ? theme.selectedButton : ""}`}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Max Distance */}
            <div>
              <label htmlFor="star-filter-max-distance" className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                Max Distance
              </label>
              <select
                id="star-filter-max-distance"
                value={filters.maxDistancePc || ""}
                onChange={(e) =>
                  updateFilter(
                    "maxDistancePc",
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                className={`w-full px-3 py-2 bg-input border border-border rounded-md text-sm font-mono focus:outline-none focus:ring-1 ${theme.focusRing}`}
              >
                <option value="">Any Distance</option>
                {DISTANCE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
