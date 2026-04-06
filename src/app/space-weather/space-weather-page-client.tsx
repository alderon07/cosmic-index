"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  startTransition,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
  SpaceWeatherNotification,
  SPACE_WEATHER_EVENT_TYPES,
} from "@/lib/types";
import {
  apiFetchEvents,
  apiFetchPaginated,
  EventStreamResult,
  PaginatedResult,
} from "@/lib/api-client";
import {
  SPACE_WEATHER_EVENT_BREAKDOWN_LABELS,
  SPACE_WEATHER_EVENT_LABELS,
  SPACE_WEATHER_NOTIFICATION_BADGES,
  THEMES,
} from "@/lib/theme";
import { SPACE_WEATHER_EVENT_ICONS } from "@/lib/space-weather-icons";
import { sanitizeExternalHttpUrl } from "@/lib/safe-url";
import {
  Sun,
  Filter,
  RotateCcw,
  X,
  AlertTriangle,
  ExternalLink,
  Copy,
} from "lucide-react";
import { ViewToggle, ViewMode } from "@/components/view-toggle";
import { Pagination, PaginationInfo } from "@/components/pagination";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
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
  buildSpaceWeatherNotificationsFetchKey,
  SPACE_WEATHER_NOTIFICATIONS_UI_LIMIT,
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

const GRID_SKELETON_KEYS = [
  "sw-grid-sk-1",
  "sw-grid-sk-2",
  "sw-grid-sk-3",
  "sw-grid-sk-4",
  "sw-grid-sk-5",
  "sw-grid-sk-6",
] as const;

const LIST_SKELETON_KEYS = [
  "sw-list-sk-1",
  "sw-list-sk-2",
  "sw-list-sk-3",
  "sw-list-sk-4",
  "sw-list-sk-5",
  "sw-list-sk-6",
  "sw-list-sk-7",
  "sw-list-sk-8",
] as const;
const SPACE_WEATHER_TIMELINE_DAYS = 45;

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

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function stripMarkdownForPreview(value: string): string {
  return value
    .replace(/^#{1,6}\s+/gm, "")        // strip heading markers
    .replace(/\*\*(.+?)\*\*/g, "$1")     // strip bold
    .replace(/__(.+?)__/g, "$1")         // strip bold (alt)
    .replace(/\*(.+?)\*/g, "$1")         // strip italic
    .replace(/_(.+?)_/g, "$1")           // strip italic (alt)
    .replace(/~~(.+?)~~/g, "$1")         // strip strikethrough
    .replace(/`(.+?)`/g, "$1")           // strip inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links → text only
    .replace(/^\s*[-*+]\s+/gm, "")      // strip list markers
    .replace(/^\s*\d+\.\s+/gm, "")      // strip numbered list markers
    .replace(/^\s*>\s?/gm, "")          // strip blockquote markers
    .replace(/---+/g, "")               // strip horizontal rules
    .replace(/\n{2,}/g, " ")            // collapse multi-newlines into space
    .replace(/\n/g, " ")                // remaining newlines → space
    .replace(/\s{2,}/g, " ")            // collapse runs of whitespace
    .trim();
}

function NotificationMarkdown({ content }: { content: string }) {
  return (
    <div className="max-w-prose font-sans text-[0.9rem] leading-[1.75] text-foreground/80 [&>*:first-child]:mt-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h3 className="mt-6 mb-2.5 font-sans text-base font-semibold tracking-tight text-foreground">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h4 className="mt-5 mb-2 font-sans text-[0.94rem] font-semibold tracking-tight text-foreground">
              {children}
            </h4>
          ),
          h3: ({ children }) => (
            <h5 className="mt-4 mb-1.5 font-sans text-sm font-semibold text-foreground/95">
              {children}
            </h5>
          ),
          p: ({ children }) => (
            <p className="mb-3.5 last:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-3.5 list-disc pl-5 space-y-2 last:mb-0 marker:text-muted-foreground/40">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3.5 list-decimal pl-5 space-y-2 last:mb-0 marker:text-muted-foreground/40">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="pl-1 leading-[1.65]">{children}</li>
          ),
          code: ({ children, className }) => (
            <code
              className={`rounded px-1.5 py-0.5 text-[0.82em] font-mono bg-muted/50 text-foreground/85 ${className ?? ""}`}
            >
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-4 overflow-x-auto rounded-md border border-border/30 bg-black/15 p-4 text-[0.82rem] leading-relaxed font-mono text-foreground/85 last:mb-0">
              {children}
            </pre>
          ),
          a: ({ children, href }) => {
            const safeHref = sanitizeExternalHttpUrl(href);
            if (!safeHref) {
              return <span className="text-foreground/80">{children}</span>;
            }

            return (
              <a
                href={safeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground/90 hover:text-foreground underline underline-offset-2 decoration-aurora-violet/40 hover:decoration-aurora-violet/70 transition-colors"
              >
                {children}
              </a>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="my-4 border-l-2 border-aurora-violet/30 pl-4 text-foreground/65 italic [&>p]:mb-2">
              {children}
            </blockquote>
          ),
          strong: ({ children }) => (
            <strong className="text-foreground font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-foreground/70">{children}</em>,
          hr: () => <hr className="my-5 border-border/25" />,
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-md border border-border/30">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-border/30 bg-muted/15 text-foreground/70 text-xs uppercase tracking-wider">
              {children}
            </thead>
          ),
          tbody: ({ children }) => <tbody className="divide-y divide-border/15">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-muted/10 transition-colors">{children}</tr>,
          th: ({ children }) => (
            <th className="px-3 py-2.5 text-left font-medium">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2.5">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function formatNotificationIssueTime(value: string): string {
  if (!value) return "Unknown issue time";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

const EVENT_TYPE_INFO: Record<
  SpaceWeatherEventType,
  { label: string; icon: React.ReactNode }
> = {
  FLR: { label: SPACE_WEATHER_EVENT_LABELS.FLR, icon: <SPACE_WEATHER_EVENT_ICONS.FLR className="w-3.5 h-3.5" /> },
  CME: { label: SPACE_WEATHER_EVENT_LABELS.CME, icon: <SPACE_WEATHER_EVENT_ICONS.CME className="w-3.5 h-3.5" /> },
  GST: { label: SPACE_WEATHER_EVENT_LABELS.GST, icon: <SPACE_WEATHER_EVENT_ICONS.GST className="w-3.5 h-3.5" /> },
  IPS: { label: SPACE_WEATHER_EVENT_LABELS.IPS, icon: <SPACE_WEATHER_EVENT_ICONS.IPS className="w-3.5 h-3.5" /> },
  HSS: { label: SPACE_WEATHER_EVENT_LABELS.HSS, icon: <SPACE_WEATHER_EVENT_ICONS.HSS className="w-3.5 h-3.5" /> },
  SEP: { label: SPACE_WEATHER_EVENT_LABELS.SEP, icon: <SPACE_WEATHER_EVENT_ICONS.SEP className="w-3.5 h-3.5" /> },
};

export interface SpaceWeatherPageClientProps {
  initialData: PaginatedResult<AnySpaceWeatherEvent> | null;
  initialError: string | null;
  initialFetchKey: string;
  forceBackgroundRefresh?: boolean;
}

export function SpaceWeatherPageClient({
  initialData,
  initialError,
  initialFetchKey,
  forceBackgroundRefresh = false,
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

      // If all event types selected, clear the param (default)
      if (newTypes.length === SPACE_WEATHER_EVENT_TYPES.length) {
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
  const timelineGateRef = useRef<HTMLDivElement | null>(null);
  const [isTimelineRequested, setIsTimelineRequested] = useState(
    () => typeof window !== "undefined" && typeof window.IntersectionObserver === "undefined"
  );
  const timelineEligible = !shouldUseInitialError && page === 1;

  const queryResult = useQuery({
    queryKey: queryKeys.spaceWeather(currentFetchKey),
    queryFn: ({ signal }) =>
      apiFetchPaginated<AnySpaceWeatherEvent>(`/space-weather?${currentFetchKey}`, {
        signal,
      }),
    enabled: !shouldUseInitialError,
    initialData: currentFetchKey === initialFetchKey ? (initialData ?? undefined) : undefined,
    staleTime: 30_000,
    refetchOnMount: forceBackgroundRefresh ? "always" : true,
    retry: 1,
  });

  useEffect(() => {
    if (!timelineEligible) return;

    if (isTimelineRequested) return;

    const target = timelineGateRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsTimelineRequested(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [timelineEligible, isTimelineRequested]);

  const timelineFetchKey = useMemo(
    () => buildSpaceWeatherFetchKey(eventTypes, SPACE_WEATHER_TIMELINE_LIMIT),
    [eventTypes]
  );

  const shouldFetchTimeline = timelineEligible && isTimelineRequested;

  const timelineQueryResult = useQuery({
    queryKey: [...queryKeys.spaceWeather(timelineFetchKey), "timeline"],
    queryFn: ({ signal }) =>
      apiFetchEvents<AnySpaceWeatherEvent>(`/space-weather?${timelineFetchKey}`, {
        signal,
      }),
    enabled: shouldFetchTimeline,
    staleTime: 30_000,
    retry: 1,
  });

  const notificationsFetchKey = useMemo(
    () => buildSpaceWeatherNotificationsFetchKey(SPACE_WEATHER_NOTIFICATIONS_UI_LIMIT, 1, "all"),
    []
  );

  const notificationsQueryResult = useQuery({
    queryKey: queryKeys.spaceWeatherNotifications(notificationsFetchKey),
    queryFn: ({ signal }) =>
      apiFetchPaginated<SpaceWeatherNotification>(
        `/space-weather/notifications?${notificationsFetchKey}`,
        { signal }
      ),
    staleTime: 60_000,
    retry: 1,
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

  const activeFilterCount = eventTypes.length < SPACE_WEATHER_EVENT_TYPES.length ? 1 : 0;

  // Count events by type
  const countByType = useMemo(() => {
    const counts: Record<SpaceWeatherEventType, number> = {
      FLR: 0,
      CME: 0,
      GST: 0,
      IPS: 0,
      HSS: 0,
      SEP: 0,
    };
    for (const event of events) {
      counts[event.eventType] += 1;
    }
    return counts;
  }, [events]);

  const timelineBuckets = useMemo(() => {
    const timelineEvents = dedupeEventsForRender(
      (timelineQueryResult.data as EventStreamResult<AnySpaceWeatherEvent> | undefined)?.events ?? []
    );
    if (timelineEvents.length === 0) return [];

    const endDate = new Date();
    const startDate = new Date(
      endDate.getTime() - (SPACE_WEATHER_TIMELINE_DAYS - 1) * 24 * 60 * 60 * 1000
    );

    return buildTimelineBuckets({
      events: timelineEvents.map((event) => ({ timestamp: event.startTime })),
      startDate,
      endDate,
    });
  }, [timelineQueryResult.data]);

  const notifications = notificationsQueryResult.data?.objects ?? [];
  const notificationWarnings = (notificationsQueryResult.data?.meta?.warnings as string[] | undefined) ?? [];
  const notificationTotal = notificationsQueryResult.data?.total ?? notifications.length;
  const copyNotificationId = useCallback((id: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    void navigator.clipboard.writeText(id);
  }, []);

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
        <p className="text-[0.94rem] leading-relaxed text-muted-foreground mb-2">
          Space weather describes changing conditions on the Sun and in the solar wind that can
          affect satellites, radio communication, navigation, and power systems on Earth.
        </p>
        <p className="text-[0.9rem] leading-relaxed text-muted-foreground/85 mb-3">
          This page shows a 90-day slice of NASA DONKI events: solar flares (FLR), coronal mass
          ejections (CME), geomagnetic storms (GST), interplanetary shocks (IPS), high-speed streams
          (HSS), and solar energetic particle events (SEP). Cards surface the most useful metric per
          event type (for example flare class, CME speed, Kp index, shock location, or observing
          instrument).
        </p>
        <div className="flex items-start gap-3 p-3.5 rounded-lg bg-muted/30 border border-muted-foreground/15">
          <AlertTriangle className="w-4 h-4 text-muted-foreground/60 mt-0.5 shrink-0" />
          <p className="text-[0.82rem] leading-[1.65] text-muted-foreground/70 max-w-xl">
            Data from NASA&apos;s DONKI. This is a{" "}
            <span className="text-foreground/90 font-medium">research catalog</span>,
            not a real-time monitoring feed. Events cover a 90-day window;
            notifications are limited to 30 days. Events may be added or
            updated days after occurrence.
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
                {SPACE_WEATHER_EVENT_TYPES.map(
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
              {(data.meta.warnings as string[]).map((warning) => (
                <p key={warning} className="text-sm text-muted-foreground">
                  {warning}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mb-10">
        <Card
          tone="neutral"
          className="border-border/50 bg-card/95 [background-image:radial-gradient(circle_at_top_right,rgba(178,102,255,0.1),transparent_60%)]"
        >
          <Accordion
            type="single"
            collapsible
            className="w-full"
          >
            <AccordionItem value="notifications-panel" className="border-none">
              <AccordionTrigger className="px-5 md:px-6 py-0 hover:no-underline">
                <div className="w-full space-y-2 text-left">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="font-display text-lg md:text-xl tracking-tight flex items-center gap-2.5">
                      <AlertTriangle className={`w-4.5 h-4.5 ${theme.text}`} />
                      DONKI Notifications
                    </CardTitle>
                    <Badge variant="outline" className={`${theme.badge} font-medium tabular-nums`}>
                      {notificationTotal} recent
                    </Badge>
                  </div>
                  <p className="text-[0.82rem] leading-[1.6] text-muted-foreground/70 max-w-lg">
                    Separate alert feed from NASA&apos;s DONKI system. Limited to a
                    rolling 30-day query window.
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 md:px-5 pb-5 space-y-3">
                {notificationsQueryResult.isPending && (
                  <p className="text-sm leading-relaxed text-muted-foreground/70">Loading notifications…</p>
                )}

                {notificationsQueryResult.error instanceof Error && (
                  <p className="text-sm leading-relaxed text-destructive">
                    {notificationsQueryResult.error.message}
                  </p>
                )}

                {notificationWarnings.length > 0 && (
                  <div className="p-3 rounded-md border border-yellow-500/30 bg-yellow-500/10 space-y-1.5">
                    {notificationWarnings.map((warning) => (
                      <p key={warning} className="text-[0.8rem] leading-relaxed text-muted-foreground">
                        {warning}
                      </p>
                    ))}
                  </div>
                )}

                {!notificationsQueryResult.isPending &&
                  !(notificationsQueryResult.error instanceof Error) &&
                  notifications.length === 0 && (
                  <p className="text-sm leading-relaxed text-muted-foreground/70">
                    No notifications in the current DONKI window.
                  </p>
                )}

                <div className="space-y-2.5">
                  {notifications.map((notification) => {
                    const previewBody = stripMarkdownForPreview(notification.body);
                    const hasOverflowBody = previewBody.length > 200;
                    const safeNotificationUrl = sanitizeExternalHttpUrl(notification.url);

                    return (
                      <Card
                        key={notification.id}
                        tone="neutral"
                        className="border-border/45 bg-black/20"
                      >
                        <CardContent className="p-3 md:p-4 space-y-2.5">
                        {/* Header: badge + metadata + source link */}
                        <div className="grid grid-cols-[1fr_auto] items-start gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={SPACE_WEATHER_NOTIFICATION_BADGES[notification.type]}
                              >
                                {notification.type.toUpperCase()}
                              </Badge>
                              <span className="text-xs text-muted-foreground/50 select-none" aria-hidden>
                                &middot;
                              </span>
                              <time className="text-xs text-muted-foreground/80">
                                {formatNotificationIssueTime(notification.issuedAt)}
                              </time>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => copyNotificationId(notification.id)}
                              title={notification.id}
                              className="inline-flex items-center gap-1 rounded-md border border-border/40 px-1.5 py-1 text-[0.68rem] font-medium text-muted-foreground/80 hover:text-foreground hover:border-border/70 transition-colors"
                              aria-label={`Copy notification ID ${notification.id}`}
                            >
                              <Copy className="w-3 h-3" />
                              ID
                            </button>
                            {safeNotificationUrl && (
                              <a
                                href={safeNotificationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1 text-[0.68rem] font-medium ${theme.text} ${theme.hoverText} transition-colors`}
                              >
                                <ExternalLink className="w-3 h-3" />
                                Source
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Body preview */}
                        <p className="max-w-prose font-sans text-[0.84rem] leading-[1.55] text-foreground/85">
                          {truncateText(previewBody, 200) || "No notification message body provided."}
                        </p>

                        {/* Expandable full body */}
                        {hasOverflowBody && (
                          <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="body" className="border-border/25">
                              <AccordionTrigger className="py-1.5 text-[0.75rem] font-medium text-muted-foreground/70 hover:text-foreground transition-colors">
                                <span className="inline-flex items-center gap-1.5">
                                  Read full notification
                                </span>
                              </AccordionTrigger>
                              <AccordionContent className="pt-2 pb-0">
                                <div className="rounded-lg border border-border/20 bg-black/15 px-3.5 py-3 md:px-4 md:py-3.5">
                                  <NotificationMarkdown content={notification.body} />
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      </div>

      {!isLoading && shouldFetchTimeline && timelineBuckets.length > 0 && (
        <div className="mb-10">
          <EventTimeline
            title="Space Weather Timeline"
            pageType="space-weather"
            theme="space-weather"
            buckets={timelineBuckets}
            actionable={false}
          />
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
                (
                {SPACE_WEATHER_EVENT_TYPES.map((type) =>
                  `${countByType[type]} ${SPACE_WEATHER_EVENT_BREAKDOWN_LABELS[type]}`
                ).join(", ")}
                ).
              </span>
            </p>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-6 bg-destructive/10 border border-destructive/50 rounded-lg text-center">
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => {
              const requests: Promise<unknown>[] = [queryResult.refetch()];
              if (shouldFetchTimeline) {
                requests.push(timelineQueryResult.refetch());
              }
              void Promise.all(requests);
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
          {GRID_SKELETON_KEYS.map((placeholderKey) => (
            <SpaceWeatherCardSkeleton key={placeholderKey} />
          ))}
        </div>
      )}

      {/* Loading State - List */}
      {isLoading && view === "list" && (
        <div className="min-w-0 overflow-hidden space-y-2">
          {LIST_SKELETON_KEYS.map((placeholderKey) => (
            <SpaceWeatherCardSkeleton key={placeholderKey} variant="compact" />
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

      {!isLoading && data && events.length > 0 && timelineEligible && (
        <div ref={timelineGateRef} className="mt-10 h-px w-full" aria-hidden />
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
        {GRID_SKELETON_KEYS.map((placeholderKey) => (
          <SpaceWeatherCardSkeleton key={placeholderKey} />
        ))}
      </div>
    </div>
  );
}
