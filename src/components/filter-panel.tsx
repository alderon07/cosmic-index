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
import {
  DISCOVERY_METHODS,
  DISCOVERY_FACILITIES,
  SIZE_CATEGORIES,
  SmallBodyKind,
  SizeCategory,
  SortOrder,
  ASTEROID_ORBIT_CLASSES,
  COMET_ORBIT_CLASSES,
  SHARED_ORBIT_CLASSES,
  ORBIT_CLASSES,
} from "@/lib/types";
import { THEMES, COMET_THEME, ThemeConfig } from "@/lib/theme";

// Theme configs
const exoplanetTheme = THEMES.exoplanets;
const smallBodyTheme = THEMES["small-bodies"];

// Exoplanet Sort Options
export type ExoplanetSort =
  | "name"
  | "discovered"
  | "distance"
  | "radius"
  | "mass";

const EXOPLANET_SORT_OPTIONS = [
  { value: "discovered", label: "Discovery Year" },
  { value: "name", label: "Name" },
  { value: "distance", label: "Distance" },
  { value: "radius", label: "Radius" },
  { value: "mass", label: "Mass" },
] as const;

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
  maxDistancePc?: number;
  sort?: ExoplanetSort;
  order?: SortOrder;
}

// Distance-from-Earth presets (parsecs)
const DISTANCE_PRESETS = [
  { value: 10, label: "< 10 pc (~33 ly)" },
  { value: 100, label: "< 100 pc (~326 ly)" },
  { value: 500, label: "< 500 pc (~1,630 ly)" },
  { value: 1000, label: "< 1,000 pc (~3,260 ly)" },
  { value: 5000, label: "< 5,000 pc (~16,300 ly)" },
] as const;

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
  theme?: ThemeConfig;
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

// Active filter chip component for exoplanets (primary/orange)
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
      className={`gap-1 pr-1 ${exoplanetTheme.filterChip}`}
    >
      {label}
      <button
        onClick={onRemove}
        className={`ml-1 rounded-full p-0.5 ${exoplanetTheme.filterChipHover} transition-colors`}
      >
        <X className="w-3 h-3" />
      </button>
    </Badge>
  );
}

// Active filter chip component for small bodies (secondary/amber)
function SmallBodyFilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <Badge
      variant="secondary"
      className={`gap-1 pr-1 ${smallBodyTheme.filterChip}`}
    >
      {label}
      <button
        onClick={onRemove}
        className={`ml-1 rounded-full p-0.5 ${smallBodyTheme.filterChipHover} transition-colors`}
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

// Count active exoplanet filters (excluding sort)
function countExoplanetFilters(filters: ExoplanetFilters): number {
  let count = 0;
  if (filters.discoveryMethod) count++;
  if (filters.year) count++;
  if (filters.hasRadius) count++;
  if (filters.hasMass) count++;
  if (filters.sizeCategory) count++;
  if (filters.habitable) count++;
  if (filters.facility) count++;
  if (filters.multiPlanet) count++;
  if (filters.maxDistancePc) count++;
  return count;
}

// Exoplanet Filter Panel
export function ExoplanetFilterPanel({
  filters,
  onChange,
  onReset,
  theme = exoplanetTheme,
}: ExoplanetFilterPanelProps) {
  const activeCount = countExoplanetFilters(filters);

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

      {/* Sort Selector */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
          <ArrowUpDown className={`w-3.5 h-3.5 ${theme.text}`} />
          Sort
        </label>
        <Select
          value={filters.sort || "discovered"}
          onValueChange={(value) =>
            updateFilter("sort", value as ExoplanetSort)
          }
        >
          <SelectTrigger className={`w-auto font-mono ${theme.sortSelect}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {EXOPLANET_SORT_OPTIONS.map((option) => (
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
                (filters.sort === "name" || filters.sort === "distance"))
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
              (!filters.order &&
                filters.sort !== "name" &&
                filters.sort !== "distance")
                ? theme.sortOrderSelected
                : "bg-card hover:bg-card/80 text-muted-foreground hover:text-foreground"
            }`}
            title="Descending"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
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
                {(Object.keys(SIZE_CATEGORIES) as SizeCategory[]).map(
                  (category) => (
                    <Button
                      key={category}
                      variant={
                        filters.sizeCategory === category
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        updateFilter(
                          "sizeCategory",
                          filters.sizeCategory === category
                            ? undefined
                            : category
                        )
                      }
                      className="text-xs"
                    >
                      {SIZE_CATEGORIES[category].label}
                    </Button>
                  )
                )}
              </div>
            </div>

            {/* Discovery Facility, Year, Distance - Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Discovery Facility */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                  Discovery Facility
                </label>
                <Select
                  value={filters.facility || "all"}
                  onValueChange={(value) =>
                    updateFilter(
                      "facility",
                      value === "all" ? undefined : value
                    )
                  }
                >
                  <SelectTrigger className={`w-full ${theme.sortSelect}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className={theme.selectItemFocus}>
                      All Facilities
                    </SelectItem>
                    {DISCOVERY_FACILITIES.map((facility) => (
                      <SelectItem
                        key={facility}
                        value={facility}
                        className={theme.selectItemFocus}
                      >
                        {facility}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Discovery Year */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                  Discovery Year
                </label>
                <Select
                  value={filters.year?.toString() || "all"}
                  onValueChange={(value) =>
                    updateFilter(
                      "year",
                      value === "all" ? undefined : parseInt(value, 10)
                    )
                  }
                >
                  <SelectTrigger
                    className={`w-full font-mono ${theme.sortSelect}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className={theme.selectItemFocus}>
                      All Years
                    </SelectItem>
                    {YEAR_OPTIONS.slice()
                      .reverse()
                      .map((year) => (
                        <SelectItem
                          key={year}
                          value={year.toString()}
                          className={theme.selectItemFocus}
                        >
                          {year}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Max Distance from Earth */}
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
                    className={`w-full font-mono ${theme.sortSelect}`}
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
                  onClick={() =>
                    updateFilter("multiPlanet", !filters.multiPlanet)
                  }
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
  return [
    ...ASTEROID_ORBIT_CLASSES,
    ...COMET_ORBIT_CLASSES,
    ...SHARED_ORBIT_CLASSES,
  ];
}

// Check if an orbit class is valid for a given body kind
function isOrbitClassValidForKind(
  orbitClass: string,
  kind?: SmallBodyKind
): boolean {
  const validOptions = getOrbitClassOptions(kind);
  return validOptions.some((opt) => opt.code === orbitClass);
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
            <SmallBodyFilterChip
              label={filters.kind === "asteroid" ? "Asteroids" : "Comets"}
              onRemove={() => removeFilter("kind")}
            />
          )}
          {filters.neo && (
            <SmallBodyFilterChip
              label="NEO"
              onRemove={() => removeFilter("neo")}
            />
          )}
          {filters.pha && (
            <SmallBodyFilterChip
              label="PHA"
              onRemove={() => removeFilter("pha")}
            />
          )}
          {filters.orbitClass && (
            <SmallBodyFilterChip
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
          variant={filters.kind === undefined ? "secondary" : "outline"}
          size="sm"
          onClick={() => updateFilter("kind", undefined)}
        >
          All
        </Button>
        <Button
          variant={filters.kind === "asteroid" ? "secondary" : "outline"}
          size="sm"
          onClick={() => updateFilter("kind", "asteroid")}
        >
          Asteroids
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => updateFilter("kind", "comet")}
          className={filters.kind === "comet" ? COMET_THEME.selectedButton : ""}
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
              <Filter className={`w-4 h-4 ${smallBodyTheme.text}`} />
              <span className="font-display">More Filters</span>
              {(filters.neo || filters.pha || filters.orbitClass) && (
                <Badge
                  variant="outline"
                  className={`ml-2 text-xs ${smallBodyTheme.filterBadge}`}
                >
                  {(filters.neo ? 1 : 0) +
                    (filters.pha ? 1 : 0) +
                    (filters.orbitClass ? 1 : 0)}
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
                    variant={
                      filters.orbitClass === option.code
                        ? "secondary"
                        : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      updateFilter(
                        "orbitClass",
                        filters.orbitClass === option.code
                          ? undefined
                          : option.code
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
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={filters.neo ? "secondary" : "outline"}
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
