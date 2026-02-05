"use client";

import { useState, useEffect, useCallback, useMemo, Suspense, startTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { saveListUrl } from "@/lib/list-url-store";
import { ObjectCard, ObjectCardSkeleton } from "@/components/object-card";
import { ObjectDetailModal } from "@/components/object-detail-modal";
import { SearchBar } from "@/components/search-bar";
import { StarFilterPanel, StarFilters } from "@/components/star-filter-panel";
import { Pagination, PaginationInfo } from "@/components/pagination";
import { AnyCosmicObject, StarData, PaginatedResponse, SpectralClass } from "@/lib/types";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/constants";
import { THEMES } from "@/lib/theme";
import { ViewToggle, ViewMode } from "@/components/view-toggle";
import { Star } from "lucide-react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

const theme = THEMES.stars;

function StarsPageContent() {
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

  // Derive filters from URL
  const spectralClass = searchParams.get("spectralClass") as SpectralClass | undefined;
  const minPlanetsRaw = searchParams.get("minPlanets");
  const minPlanets = minPlanetsRaw ? Number(minPlanetsRaw) : undefined;
  const multiPlanet = searchParams.get("multiPlanet") === "true" || undefined;
  const maxDistancePcRaw = searchParams.get("maxDistancePc");
  const maxDistancePc = maxDistancePcRaw ? Number(maxDistancePcRaw) : undefined;
  const sort = (searchParams.get("sort") as StarFilters["sort"]) || undefined;
  const order = (searchParams.get("order") as StarFilters["order"]) || undefined;

  const filters: StarFilters = useMemo(() => ({
    spectralClass,
    minPlanets,
    multiPlanet,
    maxDistancePc,
    sort,
    order,
  }), [spectralClass, minPlanets, multiPlanet, maxDistancePc, sort, order]);

  // Derive view mode from URL (default: grid)
  const viewParam = searchParams.get("view");
  const view: ViewMode = viewParam === "list" ? "list" : "grid";

  // Save current URL to sessionStorage for breadcrumb navigation
  useEffect(() => {
    const query = searchParams.toString();
    saveListUrl("stars", query ? `${pathname}?${query}` : pathname);
  }, [searchParams, pathname]);

  const [data, setData] = useState<PaginatedResponse<StarData> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedObject, setSelectedObject] = useState<AnyCosmicObject | null>(null);
  const [filterAccordionValue, setFilterAccordionValue] = useState<string>("");

  // Update URL helper - preserves existing params
  const updateUrl = useCallback((updates: Record<string, string | null>) => {
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
  }, [searchParams, pathname, router]);

  // Page change handler
  const setPage = useCallback((newPage: number) => {
    updateUrl({
      page: newPage === 1 ? null : newPage.toString(),
    });
  }, [updateUrl]);

  // Clamp page when data loads
  useEffect(() => {
    if (data && data.total > 0) {
      const maxPage = Math.ceil(data.total / limit);
      if (page > maxPage) {
        setPage(maxPage);
      }
    }
  }, [data, limit, page, setPage]);

  // Update search query in URL (resets to page 1)
  const handleSearchChange = useCallback((query: string) => {
    updateUrl({
      query: query || null,
      page: null,
    });
  }, [updateUrl]);

  // Update filters in URL (resets to page 1, except for sort/order changes)
  const handleFiltersChange = useCallback((newFilters: StarFilters) => {
    const sortChanged = newFilters.sort !== filters.sort || newFilters.order !== filters.order;
    updateUrl({
      spectralClass: newFilters.spectralClass ?? null,
      minPlanets: newFilters.minPlanets?.toString() ?? null,
      multiPlanet: newFilters.multiPlanet ? "true" : null,
      maxDistancePc: newFilters.maxDistancePc?.toString() ?? null,
      sort: newFilters.sort ?? null,
      order: newFilters.order ?? null,
      // Only reset page if something other than sort/order changed
      page: sortChanged ? page.toString() : null,
    });
  }, [updateUrl, filters.sort, filters.order, page]);

  // Clear all filters from URL (resets to page 1)
  const handleFilterReset = useCallback(() => {
    updateUrl({
      spectralClass: null,
      minPlanets: null,
      multiPlanet: null,
      maxDistancePc: null,
      sort: null,
      order: null,
      page: null,
    });
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

  const nextPage = useCallback(() => {
    const totalPages = data ? Math.ceil(data.total / limit) : 0;
    if (page < totalPages) {
      setPage(page + 1);
    }
  }, [data, limit, page, setPage]);

  const previousPage = useCallback(() => {
    if (page > 1) {
      setPage(page - 1);
    }
  }, [page, setPage]);

  // Register page-level keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      { key: "f", handler: toggleFilters, description: "Toggle filters" },
      { key: "v", handler: toggleView, description: "Toggle view" },
      { key: "j", handler: nextPage, description: "Next page" },
      { key: "k", handler: previousPage, description: "Previous page" },
    ],
  });

  // Fetch data when page/limit/search/filters change
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (searchQuery) params.set("query", searchQuery);
      if (filters.spectralClass) params.set("spectralClass", filters.spectralClass);
      if (filters.minPlanets) params.set("minPlanets", filters.minPlanets.toString());
      if (filters.multiPlanet) params.set("multiPlanet", "true");
      if (filters.maxDistancePc) params.set("maxDistancePc", filters.maxDistancePc.toString());
      if (filters.sort) params.set("sort", filters.sort);
      if (filters.order) params.set("order", filters.order);
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const response = await fetch(`/api/stars?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch stars");
      }

      const result: PaginatedResponse<StarData> = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, filters, page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 rounded-lg ${theme.iconContainer} flex items-center justify-center`}>
            <Star className={`w-5 h-5 ${theme.icon}`} />
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-foreground">
            Stars
          </h1>
        </div>
        <p className="text-muted-foreground mb-2">
          Explore host stars of known exoplanets from NASA&apos;s Exoplanet Archive
        </p>
        <p className="text-sm text-muted-foreground/80">
          These are stars confirmed to host one or more exoplanets. Browse by spectral type,
          number of planets, or distance from Earth.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-8">
        <SearchBar
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search host stars by name..."
          isLoading={isLoading}
        />
        <p className="text-xs text-muted-foreground/70 italic">
          Search by star name. Use filters to narrow results by spectral class, planet count, or distance.
        </p>

        <StarFilterPanel
          filters={filters}
          onChange={handleFiltersChange}
          onReset={handleFilterReset}
          theme={theme}
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
        <div className="flex flex-col gap-4 md:flex-row items-center md:justify-between mb-6">
          <PaginationInfo
            currentPage={page}
            pageSize={limit}
            totalItems={data.total}
          />
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              theme="stars"
            />
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-6 bg-destructive/10 border border-destructive/50 rounded-lg text-center">
          <p className="text-destructive">{error}</p>
          <button
            onClick={fetchData}
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
          {data.objects.map((star) => (
            <ObjectCard key={star.id} object={star} onModalOpen={setSelectedObject} />
          ))}
        </div>
      )}

      {/* Results List */}
      {!isLoading && data && data.objects.length > 0 && view === "list" && (
        <div className="min-w-0 overflow-hidden space-y-2">
          {data.objects.map((star) => (
            <ObjectCard key={star.id} object={star} onModalOpen={setSelectedObject} variant="compact" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data && data.objects.length === 0 && (
        <div className="p-12 text-center">
          <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-xl text-foreground mb-2">
            No stars found
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
            theme="stars"
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
function LoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-10 h-10 rounded-lg ${theme.iconContainer} flex items-center justify-center`}>
            <Star className={`w-5 h-5 ${theme.icon}`} />
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-foreground">
            Stars
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

// Suspense wrapper
export default function StarsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <StarsPageContent />
    </Suspense>
  );
}
