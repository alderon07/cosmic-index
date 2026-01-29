"use client";

import { useState, useEffect, useCallback, useMemo, Suspense, startTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { saveListUrl } from "@/lib/list-url-store";
import { ObjectCard, ObjectCardSkeleton } from "@/components/object-card";
import { SearchBar } from "@/components/search-bar";
import { StarFilterPanel, StarFilters } from "@/components/star-filter-panel";
import { Pagination, PaginationInfo } from "@/components/pagination";
import { StarData, PaginatedResponse, SpectralClass } from "@/lib/types";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/constants";
import { Star } from "lucide-react";

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

  const filters: StarFilters = useMemo(() => ({
    spectralClass,
    minPlanets,
    multiPlanet,
    maxDistancePc,
    sort,
  }), [spectralClass, minPlanets, multiPlanet, maxDistancePc, sort]);

  // Save current URL to sessionStorage for breadcrumb navigation
  useEffect(() => {
    const query = searchParams.toString();
    saveListUrl("stars", query ? `${pathname}?${query}` : pathname);
  }, [searchParams, pathname]);

  const [data, setData] = useState<PaginatedResponse<StarData> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Update filters in URL (resets to page 1)
  const handleFiltersChange = useCallback((newFilters: StarFilters) => {
    updateUrl({
      spectralClass: newFilters.spectralClass ?? null,
      minPlanets: newFilters.minPlanets?.toString() ?? null,
      multiPlanet: newFilters.multiPlanet ? "true" : null,
      maxDistancePc: newFilters.maxDistancePc?.toString() ?? null,
      sort: newFilters.sort ?? null,
      page: null,
    });
  }, [updateUrl]);

  // Clear all filters from URL (resets to page 1)
  const handleFilterReset = useCallback(() => {
    updateUrl({
      spectralClass: null,
      minPlanets: null,
      multiPlanet: null,
      maxDistancePc: null,
      sort: null,
      page: null,
    });
  }, [updateUrl]);

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
          <div className="w-10 h-10 rounded-lg bg-amber-glow/20 flex items-center justify-center">
            <Star className="w-5 h-5 text-amber-glow" />
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
        />
      </div>

      {/* Results Info and Top Pagination */}
      {data && !isLoading && (
        <div className="flex items-center justify-between mb-6">
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

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ObjectCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Results Grid */}
      {!isLoading && data && data.objects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.objects.map((star) => (
            <ObjectCard key={star.id} object={star} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data && data.objects.length === 0 && (
        <div className="p-12 text-center">
          <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-xl text-foreground mb-2">
            No stars found
          </h3>
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
          />
        </div>
      )}
    </div>
  );
}

// Loading skeleton for Suspense fallback
function LoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-amber-glow/20 flex items-center justify-center">
            <Star className="w-5 h-5 text-amber-glow" />
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
