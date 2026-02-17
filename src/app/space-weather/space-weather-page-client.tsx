"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  startTransition,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import {
  SpaceWeatherCard,
  SpaceWeatherCardSkeleton,
} from "@/components/space-weather-card";
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
import {
  apiFetchEvents,
  apiFetchPaginated,
  EventStreamResult,
  PaginatedResult,
} from "@/lib/api-client";
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
import { Pagination, PaginationInfo } from "@/components/pagination";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { EventTimeline } from "@/components/timeline/event-timeline";
import { buildTimelineBuckets } from "@/lib/timeline-buckets";
import { queryKeys } from "@/lib/query-keys";
import {
  applySearchParamUpdates,
  buildPathWithSearch,
  isNoopUrlUpdate,
} from "@/lib/url-normalize";
import { parseEventTypesParam } from "@/lib/space-weather-url";
import {
  buildSpaceWeatherFetchKey,
  SPACE_WEATHER_TIMELINE_LIMIT,
  SPACE_WEATHER_UI_PAGE_SIZE,
} from "@/lib/space-weather-fetch-key";

const theme = THEMES["space-weather"];

const SpaceWeatherDetailModal = dynamic(
  () =>
    import("@/components/space-weather-detail-modal").then(
      (m) => m.SpaceWeatherDetailModal
    ),
  { ssr: false }
);

function getEventCompletenessScore(event: AnySpaceWeatherEvent): number {
  let score = 0;

  for (const value of Object.values(event)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      if (value.length > 0) score += 1;
      continue;
    }

    if (typeof value === "string") {
      if (value.trim().length > 0) score += 1;
      continue;
    }

    score += 1;
  }

  return score;
}

function dedupeEventsForRender(
  events: AnySpaceWeatherEvent[]
): AnySpaceWeatherEvent[] {
  const eventsById = new Map<string, AnySpaceWeatherEvent>();

  for (const event of events) {
    const normalizedId = event.id.trim();
    const dedupeId = normalizedId.length > 0 ? normalizedId : event.id;
    const normalizedEvent = normalizedId.length > 0 && normalizedId !== event.id
      ? { ...event, id: normalizedId }
      : event;

    const existing = eventsById.get(dedupeId);
    if (!existing) {
      eventsById.set(dedupeId, normalizedEvent);
      continue;
    }

    if (getEventCompletenessScore(normalizedEvent) > getEventCompletenessScore(existing)) {
      eventsById.set(dedupeId, normalizedEvent);
    }
  }

  return Array.from(eventsById.values());
}

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
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
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

export interface SpaceWeatherPageClientProps {
  initialData: PaginatedResult<AnySpaceWeatherEvent> | null;
  initialError: string | null;
  initialFetchKey: string;
}

export function SpaceWeatherPageClient({
  initialData,
  initialError,
  initialFetchKey,
}: SpaceWeatherPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Derive filters from URL (memoized to avoid dependency issues)
  const eventTypesParam = searchParams.get("eventTypes");
  const eventTypes = useMemo<SpaceWeatherEventType[]>(
    () => parseEventTypesParam(eventTypesParam),
    [eventTypesParam]
  );

  const rawPageParam = searchParams.get("page");
  const page = useMemo(() => {
    if (!rawPageParam) return 1;
    const parsed = Number.parseInt(rawPageParam, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    return parsed;
  }, [rawPageParam]);
  const limit = SPACE_WEATHER_UI_PAGE_SIZE;

  // Derive view mode from URL (default: grid)
  const viewParam = searchParams.get("view");
  const view: ViewMode = viewParam === "list" ? "list" : "grid";

  const [filterAccordionValue, setFilterAccordionValue] = useState<string>("filters");
  const [selectedEvent, setSelectedEvent] = useState<AnySpaceWeatherEvent | null>(null);

  // Update URL helper
  const updateUrl = useCallback(
    (updates: Record<string, string | null>) => {
      if (isNoopUrlUpdate(searchParams, updates)) return;
      const params = applySearchParamUpdates(searchParams, updates);
      const nextPath = buildPathWithSearch(pathname, params);
      startTransition(() => {
        router.replace(nextPath, {
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
        updateUrl({ eventTypes: null, page: null });
      } else {
        const canonicalTypes = parseEventTypesParam(newTypes.join(","));
        updateUrl({ eventTypes: canonicalTypes.join(","), page: null });
      }
    },
    [eventTypes, updateUrl]
  );

  const handleFilterReset = useCallback(() => {
    updateUrl({ eventTypes: null, page: null });
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

  const pageShortcuts = useMemo(
    () => [
      { key: "f", handler: toggleFilters, description: "Toggle filters" },
      { key: "v", handler: toggleView, description: "Toggle view" },
      { key: "Escape", handler: handleCloseModal, description: "Close modal" },
    ],
    [toggleFilters, toggleView, handleCloseModal]
  );

  // Register page-level keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: pageShortcuts,
  });

  const currentFetchKey = useMemo(
    () => buildSpaceWeatherFetchKey(eventTypes, limit, page),
    [eventTypes, limit, page]
  );

  const shouldUseInitialError = !initialData && !!initialError && currentFetchKey === initialFetchKey;

  const queryResult = useQuery({
    queryKey: queryKeys.spaceWeather(currentFetchKey),
    queryFn: ({ signal }) =>
      apiFetchPaginated<AnySpaceWeatherEvent>(`/space-weather?${currentFetchKey}`, {
        signal,
      }),
    enabled: !shouldUseInitialError,
    initialData: currentFetchKey === initialFetchKey ? (initialData ?? undefined) : undefined,
    staleTime: 30_000,
  });

  const timelineFetchKey = useMemo(
    () => buildSpaceWeatherFetchKey(eventTypes, SPACE_WEATHER_TIMELINE_LIMIT),
    [eventTypes]
  );

  const timelineQueryResult = useQuery({
    queryKey: [...queryKeys.spaceWeather(timelineFetchKey), "timeline"],
    queryFn: ({ signal }) =>
      apiFetchEvents<AnySpaceWeatherEvent>(`/space-weather?${timelineFetchKey}`, {
        signal,
      }),
    enabled: !shouldUseInitialError,
    staleTime: 30_000,
  });

  const data = queryResult.data ?? null;
  const isLoading = queryResult.isPending;
  const error = shouldUseInitialError
    ? initialError
    : queryResult.error instanceof Error
      ? queryResult.error.message
      : null;
  const events = useMemo(() => {
    const rawEvents = data?.objects ?? [];
    const dedupedEvents = dedupeEventsForRender(rawEvents);

    if (
      process.env.NODE_ENV !== "production" &&
      dedupedEvents.length !== rawEvents.length
    ) {
      console.warn(
        `[space-weather] Removed ${rawEvents.length - dedupedEvents.length} duplicate event(s) before render`
      );
    }

    return dedupedEvents;
  }, [data?.objects]);

  const totalItems = data?.total ?? 0;
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;

  const setPage = useCallback((nextPage: number) => {
    const sanitized = Math.max(1, nextPage);
    updateUrl({
      page: sanitized === 1 ? null : sanitized.toString(),
    });
  }, [updateUrl]);

  useEffect(() => {
    if (rawPageParam !== null && page === 1) {
      updateUrl({ page: null });
    }
  }, [rawPageParam, page, updateUrl]);

  useEffect(() => {
    if (data && page > totalPages) {
      setPage(totalPages);
    }
  }, [data, page, totalPages, setPage]);

  const activeFilterCount = eventTypes.length < 3 ? 1 : 0;

  // Count events by type
  const countByType = useMemo(() => {
    const counts = { FLR: 0, CME: 0, GST: 0 };
    for (const event of events) {
      if (event.eventType === "FLR") counts.FLR += 1;
      if (event.eventType === "CME") counts.CME += 1;
      if (event.eventType === "GST") counts.GST += 1;
    }
    return counts;
  }, [events]);

  const timelineBuckets = useMemo(() => {
    const timelineEvents = dedupeEventsForRender(
      (timelineQueryResult.data as EventStreamResult<AnySpaceWeatherEvent> | undefined)?.events ?? []
    );
    if (timelineEvents.length === 0) return [];

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 89 * 24 * 60 * 60 * 1000);

    return buildTimelineBuckets({
      events: timelineEvents.map((event) => ({ timestamp: event.startTime })),
      startDate,
      endDate,
    });
  }, [timelineQueryResult.data]);

  return (
    <div className="shell-container py-8">
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
          Solar flares, coronal mass ejections, and geomagnetic storms from the
          last 90 days
        </p>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-muted-foreground/20">
          <AlertTriangle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground/80">
            Data from NASA&apos;s Space Weather Database (DONKI). This is a{" "}
            <span className="text-foreground">research catalog</span> of space
            weather events, not a real-time operational monitoring feed. This
            page shows a rolling 90-day window. Events may be added or updated
            days after occurrence.
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
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <PaginationInfo
              currentPage={page}
              pageSize={limit}
              totalItems={totalItems}
              itemLabel="events"
            />
            {totalPages > 1 && (
              <div className="md:w-auto">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  theme="space-weather"
                />
              </div>
            )}
          </div>
          {events.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Current page breakdown:
              <span className="text-muted-foreground/70">
                {" "}
                ({countByType.FLR} flares, {countByType.CME} CMEs,{" "}
                {countByType.GST} storms).
              </span>
            </p>
          )}
        </div>
      )}

      {!isLoading && timelineBuckets.length > 0 && (
        <EventTimeline
          title="Space Weather Timeline"
          pageType="space-weather"
          theme="space-weather"
          buckets={timelineBuckets}
          actionable={false}
        />
      )}

      {/* Error State */}
      {error && (
        <div className="p-6 bg-destructive/10 border border-destructive/50 rounded-lg text-center">
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => {
              void Promise.all([
                queryResult.refetch(),
                timelineQueryResult.refetch(),
              ]);
            }}
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
      {!isLoading && data && events.length > 0 && view === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <SpaceWeatherCard
              key={event.id}
              event={event}
              onModalOpen={setSelectedEvent}
            />
          ))}
        </div>
      )}

      {/* Results List */}
      {!isLoading && data && events.length > 0 && view === "list" && (
        <div className="min-w-0 overflow-hidden space-y-2">
          {events.map((event) => (
            <SpaceWeatherCard
              key={event.id}
              event={event}
              variant="compact"
              onModalOpen={setSelectedEvent}
            />
          ))}
        </div>
      )}

      {!isLoading && data && totalPages > 1 && (
        <div className="mt-8">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            theme="space-weather"
          />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data && events.length === 0 && (
        <div className="p-12 text-center">
          <Sun className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-xl text-foreground mb-2">
            No space weather events
          </h2>
          <p className="text-muted-foreground">
            No events found for the selected filters in the last 90 days. Try
            showing all event types.
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

export function SpaceWeatherLoadingSkeleton() {
  return (
    <div className="shell-container py-8">
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
