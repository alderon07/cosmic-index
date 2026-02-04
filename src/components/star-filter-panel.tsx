"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  X,
  Filter,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SpectralClass, SortOrder, SPECTRAL_CLASS_INFO } from "@/lib/types";
import { THEMES, ThemeConfig } from "@/lib/theme";

// Default stars theme (can be overridden via props)
const defaultStarTheme = THEMES.stars;

// Spectral classes for filtering (excludes "Unknown")
type FilterableSpectralClass = Exclude<SpectralClass, "Unknown">;

// Star Filter Types
export interface StarFilters {
  spectralClass?: SpectralClass;
  minPlanets?: number;
  multiPlanet?: boolean;
  maxDistancePc?: number;
  sort?: "name" | "distance" | "vmag" | "planetCount" | "planetCountDesc";
  order?: SortOrder;
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
  { value: "name", label: "Name" },
  { value: "planetCountDesc", label: "Planet Count" },
  { value: "distance", label: "Distance" },
  { value: "vmag", label: "Brightness" },
] as const;

interface StarFilterPanelProps {
  filters: StarFilters;
  onChange: (filters: StarFilters) => void;
  onReset: () => void;
  theme?: ThemeConfig;
  viewToggle?: React.ReactNode;
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
      className={`gap-1 pr-1 ${defaultStarTheme.filterChip}`}
    >
      {label}
      <button
        onClick={onRemove}
        className={`ml-1 rounded-full p-0.5 ${defaultStarTheme.filterChipHover} transition-colors`}
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
  theme = defaultStarTheme,
  viewToggle,
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
  const spectralClasses: FilterableSpectralClass[] = [
    "O",
    "B",
    "A",
    "F",
    "G",
    "K",
    "M",
  ];

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
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
          <ArrowUpDown className={`w-3.5 h-3.5 ${theme.text}`} />
          Sort
        </label>
        <Select
          value={filters.sort || "name"}
          onValueChange={(value) =>
            updateFilter("sort", value as StarFilters["sort"])
          }
        >
          <SelectTrigger className={`w-auto font-mono ${theme.sortSelect}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className={theme.selectItemFocus}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Sort Order Toggle */}
        <div
          className={`flex rounded-md border ${theme.sortOrderBorder} overflow-hidden`}
        >
          <button
            type="button"
            onClick={() => updateFilter("order", "asc")}
            className={`p-1.5 transition-colors ${
              filters.order === "asc" ||
              (!filters.order &&
                (filters.sort === "name" ||
                  filters.sort === "distance" ||
                  filters.sort === "vmag" ||
                  filters.sort === "planetCount"))
                ? theme.sortOrderSelected
                : "bg-card hover:bg-card/80 text-muted-foreground hover:text-foreground"
            }`}
            title="Ascending"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => updateFilter("order", "desc")}
            className={`p-1.5 transition-colors border-l ${
              theme.sortOrderBorder
            } ${
              filters.order === "desc" ||
              (!filters.order && filters.sort === "planetCountDesc")
                ? theme.sortOrderSelected
                : "bg-card hover:bg-card/80 text-muted-foreground hover:text-foreground"
            }`}
            title="Descending"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>
        {/* View Toggle */}
        {viewToggle && <div className="ml-auto">{viewToggle}</div>}
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
                <Badge
                  variant="outline"
                  className={`ml-2 text-xs ${theme.filterBadge}`}
                >
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
                      className={`text-xs relative ${
                        isSelected ? theme.selectedButton : ""
                      }`}
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
                        filters.minPlanets === preset.value
                          ? undefined
                          : preset.value
                      )
                    }
                    className={`text-xs ${
                      filters.minPlanets === preset.value
                        ? theme.selectedButton
                        : ""
                    }`}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Max Distance */}
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                Max Distance
              </label>
              <Select
                value={filters.maxDistancePc?.toString() || "all"}
                onValueChange={(value) =>
                  updateFilter(
                    "maxDistancePc",
                    value === "all" ? undefined : Number(value)
                  )
                }
              >
                <SelectTrigger
                  className={`w-full md:w-64 font-mono ${theme.sortSelect}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className={theme.selectItemFocus}>
                    Any Distance
                  </SelectItem>
                  {DISTANCE_PRESETS.map((preset) => (
                    <SelectItem
                      key={preset.value}
                      value={preset.value.toString()}
                      className={theme.selectItemFocus}
                    >
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
