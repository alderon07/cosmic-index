"use client";

import { useState, useEffect, useCallback, Suspense, startTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { FireballCard, FireballCardSkeleton } from "@/components/fireball-card";
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
  FireballListResponse,
  FireballSortField,
  SortOrder,
} from "@/lib/types";
import { THEMES } from "@/lib/theme";
import {
  Flame,
  Filter,
  RotateCcw,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MapPin,
  Mountain,
  Gauge,
} from "lucide-react";

const theme = THEMES["fireballs"];

const SORT_OPTIONS: { value: FireballSortField; label: string }[] = [
  { value: "date", label: "Date" },
  { value: "energy", label: "Energy (radiated)" },
  { value: "impact-e", label: "Energy (impact)" },
  { value: "vel", label: "Velocity" },
  { value: "alt", label: "Altitude" },
];

interface FireballFilters {
  reqLoc?: boolean;
  reqAlt?: boolean;
  reqVel?: boolean;
  sort?: FireballSortField;
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

function countActiveFilters(filters: FireballFilters): number {
  let count = 0;
  if (filters.reqLoc) count++;
  if (filters.reqAlt) count++;
  if (filters.reqVel) count++;
  return count;
}

function FireballsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Derive filters from URL
  const reqLoc = searchParams.get("reqLoc") === "true";
  const reqAlt = searchParams.get("reqAlt") === "true";
  const reqVel = searchParams.get("reqVel") === "true";
  const sort = (searchParams.get("sort") as FireballSortField) || "date";
  const order = (searchParams.get("order") as SortOrder) || "desc";

  const filters: FireballFilters = { reqLoc, reqAlt, reqVel, sort, order };

  const [data, setData] = useState<FireballListResponse | null>(null);
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
    (key: keyof FireballFilters, value: string | boolean | undefined) => {
      // Use default values for URL cleanliness
      const defaults: Record<string, string> = {
        sort: "date",
        order: "desc",
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
      reqLoc: null,
      reqAlt: null,
      reqVel: null,
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
      if (reqLoc) params.set("reqLoc", "true");
      if (reqAlt) params.set("reqAlt", "true");
      if (reqVel) params.set("reqVel", "true");
      params.set("sort", sort);
      params.set("order", order);
      params.set("limit", "100");

      const response = await fetch(`/api/fireballs?${params.toString()}`, {
        signal,
      });

      if (signal?.aborted) return;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch fireballs");
      }

      const result: FireballListResponse = await response.json();
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
  }, [reqLoc, reqAlt, reqVel, sort, order]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const activeFilterCount = countActiveFilters(filters);

  // Count complete events for stats
  const completeCount = data?.events.filter(e => e.isComplete).length ?? 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 rounded-lg ${theme.iconContainer} flex items-center justify-center`}>
            <Flame className={`w-5 h-5 ${theme.icon}`} />
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-foreground">
            Fireballs
          </h1>
        </div>
        <p className="text-muted-foreground mb-2">
          Reported atmospheric impact events from CNEOS
        </p>
        <p className="text-sm text-muted-foreground/80">
          Data from NASA JPL&apos;s Center for Near Earth Object Studies. This is a record of
          reported fireball events, not a real-time feed. Many events have incomplete data
          (missing location, altitude, or velocity).
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-4 mb-8">
        {/* Active Filters */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Active filters:</span>
            {filters.reqLoc && (
              <FilterChip
                label="With location"
                onRemove={() => handleFilterChange("reqLoc", false)}
              />
            )}
            {filters.reqAlt && (
              <FilterChip
                label="With altitude"
                onRemove={() => handleFilterChange("reqAlt", false)}
              />
            )}
            {filters.reqVel && (
              <FilterChip
                label="With velocity"
                onRemove={() => handleFilterChange("reqVel", false)}
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
              title="Ascending (oldest first)"
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
              title="Descending (newest first)"
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
                <span className="font-display">Data Filters</span>
                {activeFilterCount > 0 && (
                  <Badge variant="outline" className={`ml-2 text-xs ${theme.filterBadge}`}>
                    {activeFilterCount}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4">
              <p className="text-xs text-muted-foreground mb-3">
                Many fireball events have incomplete data. Use these filters to show only events with specific fields reported.
              </p>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant={reqLoc ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange("reqLoc", !reqLoc)}
                  className={`text-xs gap-1.5 ${reqLoc ? theme.selectedButton : ""}`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  With location
                </Button>
                <Button
                  variant={reqAlt ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange("reqAlt", !reqAlt)}
                  className={`text-xs gap-1.5 ${reqAlt ? theme.selectedButton : ""}`}
                >
                  <Mountain className="w-3.5 h-3.5" />
                  With altitude
                </Button>
                <Button
                  variant={reqVel ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilterChange("reqVel", !reqVel)}
                  className={`text-xs gap-1.5 ${reqVel ? theme.selectedButton : ""}`}
                >
                  <Gauge className="w-3.5 h-3.5" />
                  With velocity
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
            Showing last <span className="font-mono text-foreground">{data.events.length}</span> fireball events
            {completeCount > 0 && completeCount < data.events.length && (
              <span className="text-muted-foreground/70">
                {" "}({completeCount} with complete data)
              </span>
            )}
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-6 bg-destructive/10 border border-destructive/50 rounded-lg text-center">
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => fetchData()}
            className={`mt-4 text-sm ${theme.text} hover:underline`}
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <FireballCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Results Grid */}
      {!isLoading && data && data.events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.events.map((fireball) => (
            <FireballCard key={fireball.id} fireball={fireball} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data && data.events.length === 0 && (
        <div className="p-12 text-center">
          <Flame className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-xl text-foreground mb-2">
            No fireballs found
          </h2>
          <p className="text-muted-foreground">
            Try adjusting your filters to see more events
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
            <Flame className={`w-5 h-5 ${theme.icon}`} />
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-foreground">
            Fireballs
          </h1>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <FireballCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default function FireballsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <FireballsPageContent />
    </Suspense>
  );
}
