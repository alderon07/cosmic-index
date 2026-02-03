"use client";

import { useState, useEffect, useCallback, Suspense, startTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { CloseApproachCard, CloseApproachCardSkeleton } from "@/components/close-approach-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CloseApproachListResponse,
  CloseApproachSortField,
  SortOrder,
} from "@/lib/types";
import { THEMES } from "@/lib/theme";
import {
  Crosshair,
  Filter,
  RotateCcw,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Gauge,
  Ruler,
} from "lucide-react";

const theme = THEMES["close-approaches"];

// Filter options
const TIME_RANGE_OPTIONS = [
  { value: "7", label: "Next 7 days" },
  { value: "30", label: "Next 30 days" },
  { value: "60", label: "Next 60 days" },
  { value: "90", label: "Next 90 days" },
] as const;

const DISTANCE_THRESHOLD_OPTIONS = [
  { value: "3", label: "< 3 LD (very close)" },
  { value: "5", label: "< 5 LD" },
  { value: "10", label: "< 10 LD" },
  { value: "20", label: "< 20 LD" },
] as const;

const SORT_OPTIONS: { value: CloseApproachSortField; label: string }[] = [
  { value: "date", label: "Date" },
  { value: "dist", label: "Distance" },
  { value: "h", label: "Size (brightness)" },
  { value: "v-rel", label: "Velocity" },
];

interface CloseApproachFilters {
  days?: string;
  distMaxLd?: string;
  phaOnly?: boolean;
  sort?: CloseApproachSortField;
  order?: SortOrder;
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge variant="secondary" className={`gap-1 pr-1 ${theme.filterChip}`}>
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

function countActiveFilters(filters: CloseApproachFilters): number {
  let count = 0;
  if (filters.days && filters.days !== "60") count++;
  if (filters.distMaxLd && filters.distMaxLd !== "10") count++;
  if (filters.phaOnly) count++;
  return count;
}

function CloseApproachesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Derive filters from URL
  const days = searchParams.get("days") || "60";
  const distMaxLd = searchParams.get("distMaxLd") || "10";
  const phaOnly = searchParams.get("phaOnly") === "true";
  const sort = (searchParams.get("sort") as CloseApproachSortField) || "date";
  const order = (searchParams.get("order") as SortOrder) || "asc";

  const filters: CloseApproachFilters = { days, distMaxLd, phaOnly, sort, order };

  const [data, setData] = useState<CloseApproachListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Update URL helper
  const updateUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === null) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [searchParams, pathname, router]
  );

  const handleFilterChange = useCallback(
    (key: keyof CloseApproachFilters, value: string | boolean | undefined) => {
      // Use default values for URL cleanliness
      const defaults: Record<string, string> = {
        days: "60",
        distMaxLd: "10",
        sort: "date",
        order: "asc",
      };

      if (typeof value === "boolean") {
        updateUrl({ [key]: value ? "true" : null });
      } else if (value === undefined || value === defaults[key]) {
        updateUrl({ [key]: null });
      } else {
        updateUrl({ [key]: value });
      }
    },
    [updateUrl]
  );

  const handleFilterReset = useCallback(() => {
    updateUrl({
      days: null,
      distMaxLd: null,
      phaOnly: null,
      sort: null,
      order: null,
    });
  }, [updateUrl]);

  // Fetch data
  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("dateMin", "now");
      params.set("dateMax", `+${days}`);
      params.set("distMaxLd", distMaxLd);
      if (phaOnly) params.set("phaOnly", "true");
      params.set("sort", sort);
      params.set("order", order);
      params.set("limit", "100");

      const response = await fetch(`/api/close-approaches?${params.toString()}`, {
        signal,
      });

      if (signal?.aborted) return;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch close approaches");
      }

      const result: CloseApproachListResponse = await response.json();
      setData(result);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [days, distMaxLd, phaOnly, sort, order]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const activeFilterCount = countActiveFilters(filters);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 rounded-lg ${theme.iconContainer} flex items-center justify-center`}>
            <Crosshair className={`w-5 h-5 ${theme.icon}`} />
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-foreground">
            Close Approaches
          </h1>
        </div>
        <p className="text-muted-foreground mb-2">
          Upcoming asteroid and comet flybys near Earth
        </p>
        <p className="text-sm text-muted-foreground/80">
          Data from NASA JPL&apos;s Center for Near Earth Object Studies (CNEOS). Close approaches
          are defined as objects passing within 0.05 AU (~7.5 million km) of Earth. Distance is
          measured in Lunar Distances (LD), where 1 LD = 384,400 km.
        </p>
      </div>

      {/* Highlight Cards */}
      {!isLoading && data?.highlights && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {data.highlights.closestApproach && (
            <div>
              <h2 className="text-sm font-display text-muted-foreground mb-2 flex items-center gap-2">
                <Ruler className={`w-4 h-4 ${theme.icon}`} />
                Closest Approach
              </h2>
              <CloseApproachCard
                approach={data.highlights.closestApproach}
                showHighlightBadge="closest"
              />
            </div>
          )}
          {data.highlights.fastestFlyby && (
            <div>
              <h2 className="text-sm font-display text-muted-foreground mb-2 flex items-center gap-2">
                <Gauge className={`w-4 h-4 ${theme.icon}`} />
                Fastest Flyby
              </h2>
              <CloseApproachCard
                approach={data.highlights.fastestFlyby}
                showHighlightBadge="fastest"
              />
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-4 mb-8">
        {/* Active Filters */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Active filters:</span>
            {filters.days && filters.days !== "60" && (
              <FilterChip
                label={`${filters.days} days`}
                onRemove={() => handleFilterChange("days", undefined)}
              />
            )}
            {filters.distMaxLd && filters.distMaxLd !== "10" && (
              <FilterChip
                label={`< ${filters.distMaxLd} LD`}
                onRemove={() => handleFilterChange("distMaxLd", undefined)}
              />
            )}
            {filters.phaOnly && (
              <FilterChip
                label="PHA only"
                onRemove={() => handleFilterChange("phaOnly", false)}
              />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFilterReset}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset all
            </Button>
          </div>
        )}

        {/* Sort Controls */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider">
            <ArrowUpDown className={`w-3.5 h-3.5 ${theme.text}`} />
            Sort
          </label>
          <Select
            value={sort}
            onValueChange={(value) => handleFilterChange("sort", value)}
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
          <div className={`flex rounded-md border ${theme.sortOrderBorder} overflow-hidden`}>
            <button
              type="button"
              onClick={() => handleFilterChange("order", "asc")}
              className={`p-1.5 transition-colors ${
                order === "asc"
                  ? theme.sortOrderSelected
                  : "bg-card hover:bg-card/80 text-muted-foreground hover:text-foreground"
              }`}
              title="Ascending"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleFilterChange("order", "desc")}
              className={`p-1.5 transition-colors border-l ${theme.sortOrderBorder} ${
                order === "desc"
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
                {activeFilterCount > 0 && (
                  <Badge variant="outline" className={`ml-2 text-xs ${theme.filterBadge}`}>
                    {activeFilterCount}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4">
              {/* Time Range */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                  Time Range
                </label>
                <div className="flex flex-wrap gap-2">
                  {TIME_RANGE_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      variant={days === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleFilterChange("days", option.value)}
                      className={`text-xs ${days === option.value ? theme.selectedButton : ""}`}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Distance Threshold */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                  Maximum Distance
                </label>
                <div className="flex flex-wrap gap-2">
                  {DISTANCE_THRESHOLD_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      variant={distMaxLd === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleFilterChange("distMaxLd", option.value)}
                      className={`text-xs ${distMaxLd === option.value ? theme.selectedButton : ""}`}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* PHA Filter */}
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wider block mb-2">
                  Classification
                </label>
                <Button
                  variant={phaOnly ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange("phaOnly", !phaOnly)}
                  className="text-xs"
                >
                  Potentially Hazardous Only (PHA)
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Results Info */}
      {data && !isLoading && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-mono text-foreground">{data.events.length}</span> close
            approaches in the next <span className="font-mono text-foreground">{days}</span> days
            within <span className="font-mono text-foreground">{distMaxLd}</span> lunar distances
            {data.meta.phaFilterApplied && " (PHAs only)"}
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-6 bg-destructive/10 border border-destructive/50 rounded-lg text-center">
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => fetchData()}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CloseApproachCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Results Grid */}
      {!isLoading && data && data.events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.events.map((approach) => (
            <CloseApproachCard key={approach.id} approach={approach} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data && data.events.length === 0 && (
        <div className="p-12 text-center">
          <Crosshair className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-xl text-foreground mb-2">
            No close approaches found
          </h2>
          <p className="text-muted-foreground">
            Try adjusting your filters or expanding the time range
          </p>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 rounded-lg ${theme.iconContainer} flex items-center justify-center`}>
            <Crosshair className={`w-5 h-5 ${theme.icon}`} />
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-foreground">
            Close Approaches
          </h1>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <CloseApproachCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default function CloseApproachesPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CloseApproachesPageContent />
    </Suspense>
  );
}
