"use client";

import { useState, useEffect, useCallback, useMemo, startTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { saveListUrl } from "@/lib/list-url-store";
import { ObjectCard, ObjectCardSkeleton } from "@/components/object-card";
import { SearchBar } from "@/components/search-bar";
import { SmallBodyFilterPanel, SmallBodyFilters } from "@/components/filter-panel";
import { Pagination, PaginationInfo } from "@/components/pagination";
import { AnyCosmicObject, SmallBodyData } from "@/lib/types";
import { apiFetchPaginated, PaginatedResult } from "@/lib/api-client";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/constants";
import { THEMES } from "@/lib/theme";
import { ViewToggle, ViewMode } from "@/components/view-toggle";
import { CircleDot } from "lucide-react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { SavedSearchControls } from "@/components/saved-search-controls";
import { ExportButton } from "@/components/export-button";
import { queryKeys } from "@/lib/query-keys";
import {
  applySearchParamUpdates,
  buildPathWithSearch,
  isNoopUrlUpdate,
} from "@/lib/url-normalize";

const theme = THEMES["small-bodies"];

const ObjectDetailModal = dynamic(
  () => import("@/components/object-detail-modal").then((m) => m.ObjectDetailModal),
  { ssr: false }
);

export interface SmallBodiesPageClientProps {
  initialData: PaginatedResult<SmallBodyData> | null;
  initialError: string | null;
  initialFetchKey: string;
}

function buildSmallBodiesFetchKey(input: {
  searchQuery: string;
  filters: SmallBodyFilters;
  page: number;
  limit: number;
}) {
  const params = new URLSearchParams();
  if (input.searchQuery) params.set("query", input.searchQuery);
  if (input.filters.kind) params.set("kind", input.filters.kind);
  if (input.filters.neo) params.set("neo", "true");
  if (input.filters.pha) params.set("pha", "true");
  if (input.filters.orbitClass) params.set("orbitClass", input.filters.orbitClass);
  params.set("page", input.page.toString());
  params.set("limit", input.limit.toString());
  return params.toString();
}

export function SmallBodiesPageClient({
  initialData,
  initialError,
  initialFetchKey,
}: SmallBodiesPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Derive all query state from URL (URL is source of truth)
  const page = (() => {
    const param = searchParams.get("page");
    const parsed = param ? parseInt(param, 10) : 1;
    return isNaN(parsed) || parsed < 1 ? 1 : parsed;
  })();

  const limit = (() => {
    const param = searchParams.get("limit");
    const parsed = param ? parseInt(param, 10) : DEFAULT_PAGE_SIZE;
    if (isNaN(parsed) || !PAGE_SIZE_OPTIONS.includes(parsed as typeof PAGE_SIZE_OPTIONS[number])) {
      return DEFAULT_PAGE_SIZE;
    }
    return parsed;
  })();

  // Derive search query from URL
  const searchQuery = searchParams.get("query") || "";

  // Derive filters from URL (memoized to avoid unnecessary re-renders)
  const kind = (searchParams.get("kind") as SmallBodyFilters["kind"]) || undefined;
  const neo = searchParams.get("neo") === "true" || undefined;
  const pha = searchParams.get("pha") === "true" || undefined;
  const orbitClass = searchParams.get("orbitClass") || undefined;

  const filters: SmallBodyFilters = useMemo(() => ({
    kind,
    neo,
    pha,
    orbitClass,
  }), [kind, neo, pha, orbitClass]);

  // Derive view mode from URL (default: grid)
  const viewParam = searchParams.get("view");
  const view: ViewMode = viewParam === "list" ? "list" : "grid";

  // Save current URL to sessionStorage for breadcrumb navigation
  useEffect(() => {
    const query = searchParams.toString();
    saveListUrl("small-bodies", query ? `${pathname}?${query}` : pathname);
  }, [searchParams, pathname]);

  const [selectedObject, setSelectedObject] = useState<AnyCosmicObject | null>(null);
  const [filterAccordionValue, setFilterAccordionValue] = useState<string>("");

  // Update URL helper - preserves existing params
  const updateUrl = useCallback((updates: Record<string, string | null>) => {
    if (isNoopUrlUpdate(searchParams, updates)) return;
    const params = applySearchParamUpdates(searchParams, updates);
    const nextPath = buildPathWithSearch(pathname, params);
    startTransition(() => {
      router.replace(nextPath, { scroll: false });
    });
  }, [searchParams, pathname, router]);

  const currentFetchKey = useMemo(
    () => buildSmallBodiesFetchKey({ searchQuery, filters, page, limit }),
    [searchQuery, filters, page, limit]
  );

  const shouldUseInitialError = !initialData && !!initialError && currentFetchKey === initialFetchKey;

  const queryResult = useQuery({
    queryKey: queryKeys.smallBodies(currentFetchKey),
    queryFn: ({ signal }) =>
      apiFetchPaginated<SmallBodyData>(`/small-bodies?${currentFetchKey}`, {
        signal,
      }),
    enabled: !shouldUseInitialError,
    initialData: currentFetchKey === initialFetchKey ? (initialData ?? undefined) : undefined,
    staleTime: 30_000,
  });

  const data = queryResult.data ?? null;
  const isLoading = queryResult.isPending;
  const error = shouldUseInitialError
    ? initialError
    : queryResult.error instanceof Error
      ? queryResult.error.message
      : null;

  // Page change handler (called by Pagination component)
  const setPage = useCallback((newPage: number) => {
    updateUrl({
      page: newPage === 1 ? null : newPage.toString(), // Clean URL for page 1
    });
  }, [updateUrl]);

  // Clamp page when data loads (handle out-of-range)
  useEffect(() => {
    if (data && data.total && data.total > 0) {
      const maxPage = Math.ceil(data.total / limit);
      if (page > maxPage) {
        setPage(maxPage);
      }
    }
  }, [data, limit, page, setPage]);

  // Update search query in URL (resets to page 1)
  const handleSearchChange = useCallback((query: string) => {
    updateUrl({
      query: query || null, // Remove from URL if empty
      page: null, // Reset to page 1
    });
  }, [updateUrl]);

  // Update filters in URL (resets to page 1)
  const handleFiltersChange = useCallback((newFilters: SmallBodyFilters) => {
    updateUrl({
      kind: newFilters.kind ?? null,
      neo: newFilters.neo ? "true" : null,
      pha: newFilters.pha ? "true" : null,
      orbitClass: newFilters.orbitClass ?? null,
      page: null, // Reset to page 1
    });
  }, [updateUrl]);

  // Clear all filters from URL (resets to page 1)
  const handleFilterReset = useCallback(() => {
    updateUrl({
      kind: null,
      neo: null,
      pha: null,
      orbitClass: null,
      page: null, // Reset to page 1
    });
  }, [updateUrl]);

  const handleApplySavedSearch = useCallback(
    (queryParams: Record<string, unknown>) => {
      const asString = (value: unknown): string | null =>
        typeof value === "string" && value ? value : null;
      const asBoolean = (value: unknown): string | null =>
        typeof value === "boolean" && value ? "true" : null;

      updateUrl({
        query: asString(queryParams.query),
        kind: asString(queryParams.kind),
        neo: asBoolean(queryParams.neo),
        pha: asBoolean(queryParams.pha),
        orbitClass: asString(queryParams.orbitClass),
        page: null,
      });
    },
    [updateUrl]
  );

  // Handle view mode change
  const handleViewChange = useCallback((newView: ViewMode) => {
    updateUrl({
      view: newView === "grid" ? null : newView, // Remove from URL if default
    });
  }, [updateUrl]);

  // Keyboard shortcut handlers
  const toggleFilters = useCallback(() => {
    setFilterAccordionValue((prev) => (prev === "filters" ? "" : "filters"));
  }, []);

  const toggleView = useCallback(() => {
    handleViewChange(view === "grid" ? "list" : "grid");
  }, [view, handleViewChange]);

  const nextPage = useCallback(() => {
    const totalPages = data?.total ? Math.ceil(data.total / limit) : 0;
    if (page < totalPages) {
      setPage(page + 1);
    }
  }, [data, limit, page, setPage]);

  const previousPage = useCallback(() => {
    if (page > 1) {
      setPage(page - 1);
    }
  }, [page, setPage]);

  const pageShortcuts = useMemo(
    () => [
      { key: "f", handler: toggleFilters, description: "Toggle filters" },
      { key: "v", handler: toggleView, description: "Toggle view" },
      { key: "j", handler: nextPage, description: "Next page" },
      { key: "k", handler: previousPage, description: "Previous page" },
    ],
    [toggleFilters, toggleView, nextPage, previousPage]
  );

  // Register page-level keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: pageShortcuts,
  });

  const totalPages = data?.total ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 rounded-lg ${theme.iconContainer} flex items-center justify-center`}>
            <CircleDot className={`w-5 h-5 ${theme.icon}`} />
          </div>
        <h1 className="font-display text-3xl md:text-4xl text-foreground">
          Small Bodies
        </h1>
      </div>
      <p className="text-muted-foreground mb-2">
        Discover asteroids and comets from JPL&apos;s Small-Body Database
      </p>
      <p className="text-sm text-muted-foreground/80">
        Small bodies are celestial objects in our solar system that are smaller than planets or dwarf planets.
        This category includes asteroids, rocky remnants from the early solar system, and comets, icy bodies
        that develop tails when they approach the Sun. Some small bodies, known as Near-Earth Objects (NEOs),
        have orbits that bring them close to Earth.
      </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-8">
        <SearchBar
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search asteroids and comets..."
          isLoading={isLoading}
        />
        <p className="text-xs text-muted-foreground/70 italic">
          Search by asteroid or comet name, designation, or number. Use filters to narrow results by type, classification, or other criteria.
        </p>
        <SavedSearchControls
          category="small-bodies"
          currentParams={{
            query: searchQuery || undefined,
            ...filters,
          }}
          onApply={handleApplySavedSearch}
          theme={theme}
        />

        <SmallBodyFilterPanel
          filters={filters}
          onChange={handleFiltersChange}
          onReset={handleFilterReset}
          viewToggle={
            <ViewToggle
              view={view}
              onChange={handleViewChange}
              theme={theme}
            />
          }
          accordionValue={filterAccordionValue}
          onAccordionChange={setFilterAccordionValue}
        />
      </div>

      {/* Results Info and Top Pagination */}
      {data && !isLoading && (
        <div className="mb-6 flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-between">
          <PaginationInfo
            currentPage={page}
            pageSize={limit}
            totalItems={data.total ?? 0}
            className="text-center md:text-left"
          />
          <div className="flex w-full flex-col items-center gap-2 md:w-auto md:flex-row md:flex-nowrap md:items-center md:justify-end">
            {totalPages > 1 && (
              <div className="order-1 w-full md:order-2 md:w-auto">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  theme="small-bodies"
                />
              </div>
            )}
            <div className="order-2 md:order-1">
              <ExportButton category="small-bodies" theme={theme} />
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-6 bg-destructive/10 border border-destructive/50 rounded-lg text-center">
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => {
              void queryResult.refetch();
            }}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading State - Grid */}
      {isLoading && view === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ObjectCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Loading State - List */}
      {isLoading && view === "list" && (
        <div className="min-w-0 overflow-hidden space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <ObjectCardSkeleton key={i} variant="compact" />
          ))}
        </div>
      )}

      {/* Results Grid */}
      {!isLoading && data && data.objects.length > 0 && view === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.objects.map((smallBody) => (
            <ObjectCard key={smallBody.sourceId} object={smallBody} onModalOpen={setSelectedObject} />
          ))}
        </div>
      )}

      {/* Results List */}
      {!isLoading && data && data.objects.length > 0 && view === "list" && (
        <div className="min-w-0 overflow-hidden space-y-2">
          {data.objects.map((smallBody) => (
            <ObjectCard key={smallBody.sourceId} object={smallBody} onModalOpen={setSelectedObject} variant="compact" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data && data.objects.length === 0 && (
        <div className="p-12 text-center">
          <CircleDot className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-xl text-foreground mb-2">
            No small bodies found
          </h2>
          <p className="text-muted-foreground">
            Try adjusting your search or filters
          </p>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && data && totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            theme="small-bodies"
          />
        </div>
      )}

      {/* Object Detail Modal */}
      <ObjectDetailModal
        object={selectedObject}
        open={selectedObject !== null}
        onOpenChange={(open) => !open && setSelectedObject(null)}
      />
    </div>
  );
}

// Loading skeleton for Suspense fallback
export function SmallBodiesLoadingSkeleton() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 rounded-lg ${theme.iconContainer} flex items-center justify-center`}>
            <CircleDot className={`w-5 h-5 ${theme.icon}`} />
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-foreground">
            Small Bodies
          </h1>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <ObjectCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
