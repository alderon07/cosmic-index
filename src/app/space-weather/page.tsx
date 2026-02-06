"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
  startTransition,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  SpaceWeatherCard,
  SpaceWeatherCardSkeleton,
} from "@/components/space-weather-card";
import { SpaceWeatherDetailModal } from "@/components/space-weather-detail-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  SpaceWeatherEventType,
  AnySpaceWeatherEvent,
} from "@/lib/types";
import { apiFetchEvents, EventStreamResult } from "@/lib/api-client";
import { THEMES } from "@/lib/theme";
import {
  Sun,
  Cloud,
  Magnet,
  Filter,
  RotateCcw,
  X,
  AlertTriangle,
} from "lucide-react";
import { ViewToggle, ViewMode } from "@/components/view-toggle";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

const theme = THEMES["space-weather"];

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
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

const EVENT_TYPE_INFO: Record<
  SpaceWeatherEventType,
  { label: string; icon: React.ReactNode }
> = {
  FLR: { label: "Solar Flares", icon: <Sun className="w-3.5 h-3.5" /> },
  CME: { label: "CMEs", icon: <Cloud className="w-3.5 h-3.5" /> },
  GST: { label: "Geomagnetic Storms", icon: <Magnet className="w-3.5 h-3.5" /> },
};

function SpaceWeatherPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Derive filters from URL (memoized to avoid dependency issues)
  const eventTypesParam = searchParams.get("eventTypes");
  const eventTypes = useMemo<SpaceWeatherEventType[]>(() => {
    if (!eventTypesParam) return ["FLR", "CME", "GST"];
    return eventTypesParam.split(",").filter((t): t is SpaceWeatherEventType =>
      ["FLR", "CME", "GST"].includes(t)
    );
  }, [eventTypesParam]);

  // Derive view mode from URL (default: grid)
  const viewParam = searchParams.get("view");
  const view: ViewMode = viewParam === "list" ? "list" : "grid";

  const [data, setData] = useState<EventStreamResult<AnySpaceWeatherEvent> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAccordionValue, setFilterAccordionValue] = useState<string>("filters");
  const [selectedEvent, setSelectedEvent] = useState<AnySpaceWeatherEvent | null>(null);

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
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [searchParams, pathname, router]
  );

  const handleEventTypeToggle = useCallback(
    (type: SpaceWeatherEventType) => {
      let newTypes: SpaceWeatherEventType[];

      if (eventTypes.includes(type)) {
        // Remove type (but keep at least one)
        newTypes = eventTypes.filter((t) => t !== type);
        if (newTypes.length === 0) {
          newTypes = [type]; // Can't remove the last one
          return;
        }
      } else {
        // Add type
        newTypes = [...eventTypes, type];
      }

      // If all three selected, clear the param (default)
      if (newTypes.length === 3) {
        updateUrl({ eventTypes: null });
      } else {
        updateUrl({ eventTypes: newTypes.join(",") });
      }
    },
    [eventTypes, updateUrl]
  );

  const handleFilterReset = useCallback(() => {
    updateUrl({ eventTypes: null });
  }, [updateUrl]);

  // Handle view mode change
  const handleViewChange = useCallback((newView: ViewMode) => {
    updateUrl({
      view: newView === "grid" ? null : newView,
    });
  }, [updateUrl]);

  // Keyboard shortcut handlers
  const toggleFilters = useCallback(() => {
    setFilterAccordionValue((prev) => (prev === "filters" ? "" : "filters"));
  }, []);

  const toggleView = useCallback(() => {
    handleViewChange(view === "grid" ? "list" : "grid");
  }, [view, handleViewChange]);

  // Close modal handler
  const handleCloseModal = useCallback(() => {
    setSelectedEvent(null);
  }, []);

  // Register page-level keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      { key: "f", handler: toggleFilters, description: "Toggle filters" },
      { key: "v", handler: toggleView, description: "Toggle view" },
      { key: "Escape", handler: handleCloseModal, description: "Close modal" },
    ],
  });

  // Fetch data
  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (eventTypes.length < 3) {
          params.set("eventTypes", eventTypes.join(","));
        }
        params.set("limit", "100");

        const result = await apiFetchEvents<AnySpaceWeatherEvent>(`/space-weather?${params.toString()}`, {
          signal,
        });

        if (signal?.aborted) return;

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
    },
    [eventTypes]
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const activeFilterCount = eventTypes.length < 3 ? 1 : 0;

  // Count events by type
  const countByType = {
    FLR: data?.events.filter((e) => e.eventType === "FLR").length ?? 0,
    CME: data?.events.filter((e) => e.eventType === "CME").length ?? 0,
    GST: data?.events.filter((e) => e.eventType === "GST").length ?? 0,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className={`w-10 h-10 rounded-lg ${theme.iconContainer} flex items-center justify-center`}
          >
            <Sun className={`w-5 h-5 ${theme.icon}`} />
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-foreground">
            Space Weather
          </h1>
        </div>
        <p className="text-muted-foreground mb-2">
          Solar flares, coronal mass ejections, and geomagnetic storms
        </p>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-muted-foreground/20">
          <AlertTriangle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground/80">
            Data from NASA&apos;s Space Weather Database (DONKI). This is a{" "}
            <span className="text-foreground">research catalog</span> of space
            weather events, not a real-time operational monitoring feed. Events
            may be added or updated days after occurrence.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4 mb-8">
        {/* Active Filters */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Active filters:
            </span>
            <FilterChip
              label={`${eventTypes.length} event type${eventTypes.length !== 1 ? "s" : ""}`}
              onRemove={handleFilterReset}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFilterReset}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Show all
            </Button>
          </div>
        )}

        {/* View Toggle */}
        <div className="flex justify-end">
          <ViewToggle view={view} onChange={handleViewChange} theme={theme} />
        </div>

        {/* Filter Accordion */}
        <Accordion
          type="single"
          collapsible
          className="w-full"
          value={filterAccordionValue}
          onValueChange={setFilterAccordionValue}
        >
          <AccordionItem
            value="filters"
            className="border border-border/50 rounded-lg px-4 bg-card"
          >
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Filter className={`w-4 h-4 ${theme.text}`} />
                <span className="font-display">Event Types</span>
                {activeFilterCount > 0 && (
                  <Badge
                    variant="outline"
                    className={`ml-2 text-xs ${theme.filterBadge}`}
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 space-y-4">
              <p className="text-xs text-muted-foreground mb-3">
                Filter by space weather event type. At least one type must be
                selected.
              </p>

              <div className="flex flex-wrap gap-2">
                {(["FLR", "CME", "GST"] as SpaceWeatherEventType[]).map(
                  (type) => {
                    const info = EVENT_TYPE_INFO[type];
                    const isSelected = eventTypes.includes(type);
                    return (
                      <Button
                        key={type}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleEventTypeToggle(type)}
                        className={`text-xs gap-1.5 ${
                          isSelected ? theme.selectedButton : ""
                        }`}
                      >
                        {info.icon}
                        {info.label}
                      </Button>
                    );
                  }
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Warnings from API */}
      {!!data?.meta?.warnings && (data.meta.warnings as string[]).length > 0 && (
        <div className="mb-6 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-yellow-500 font-medium">
                Partial results
              </p>
              {(data.meta.warnings as string[]).map((warning, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  {warning}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results Info */}
      {data && !isLoading && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-mono text-foreground">
              {data.events.length}
            </span>{" "}
            events from the last 30 days
            {data.events.length > 0 && (
              <span className="text-muted-foreground/70">
                {" "}
                ({countByType.FLR} flares, {countByType.CME} CMEs,{" "}
                {countByType.GST} storms)
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

      {/* Loading State - Grid */}
      {isLoading && view === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SpaceWeatherCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Loading State - List */}
      {isLoading && view === "list" && (
        <div className="min-w-0 overflow-hidden space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <SpaceWeatherCardSkeleton key={i} variant="compact" />
          ))}
        </div>
      )}

      {/* Results Grid */}
      {!isLoading && data && data.events.length > 0 && view === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.events.map((event) => (
            <SpaceWeatherCard
              key={event.id}
              event={event}
              onModalOpen={setSelectedEvent}
            />
          ))}
        </div>
      )}

      {/* Results List */}
      {!isLoading && data && data.events.length > 0 && view === "list" && (
        <div className="min-w-0 overflow-hidden space-y-2">
          {data.events.map((event) => (
            <SpaceWeatherCard
              key={event.id}
              event={event}
              variant="compact"
              onModalOpen={setSelectedEvent}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data && data.events.length === 0 && (
        <div className="p-12 text-center">
          <Sun className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-xl text-foreground mb-2">
            No space weather events
          </h2>
          <p className="text-muted-foreground">
            No events found for the selected filters. Try showing all event
            types.
          </p>
        </div>
      )}

      {/* Event Detail Modal */}
      <SpaceWeatherDetailModal
        event={selectedEvent}
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className={`w-10 h-10 rounded-lg ${theme.iconContainer} flex items-center justify-center`}
          >
            <Sun className={`w-5 h-5 ${theme.icon}`} />
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-foreground">
            Space Weather
          </h1>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <SpaceWeatherCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default function SpaceWeatherPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <SpaceWeatherPageContent />
    </Suspense>
  );
}
