"use client";

import { useState, useEffect, useCallback, useMemo, Suspense, startTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ObjectCard, ObjectCardSkeleton } from "@/components/object-card";
import { SearchBar } from "@/components/search-bar";
import { ExoplanetFilterPanel, ExoplanetFilters } from "@/components/filter-panel";
import { Pagination, PaginationInfo } from "@/components/pagination";
import { ExoplanetData, PaginatedResponse } from "@/lib/types";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/constants";
import { Circle } from "lucide-react";

function ExoplanetsPageContent() {
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
  const discoveryMethod = searchParams.get("discoveryMethod") || undefined;
  const year = searchParams.get("year");
  const hasRadius = searchParams.get("hasRadius") === "true" || undefined;
  const hasMass = searchParams.get("hasMass") === "true" || undefined;
  const sizeCategory = (searchParams.get("sizeCategory") as ExoplanetFilters["sizeCategory"]) || undefined;
  const habitable = searchParams.get("habitable") === "true" || undefined;
  const facility = searchParams.get("facility") || undefined;
  const multiPlanet = searchParams.get("multiPlanet") === "true" || undefined;
  const maxDistancePcRaw = searchParams.get("maxDistancePc");
  const maxDistancePc = maxDistancePcRaw ? Number(maxDistancePcRaw) : undefined;

  const filters: ExoplanetFilters = useMemo(() => ({
    discoveryMethod,
    year: year ? parseInt(year, 10) : undefined,
    hasRadius,
    hasMass,
    sizeCategory,
    habitable,
    facility,
    multiPlanet,
    maxDistancePc,
  }), [discoveryMethod, year, hasRadius, hasMass, sizeCategory, habitable, facility, multiPlanet, maxDistancePc]);
  const [data, setData] = useState<PaginatedResponse<ExoplanetData> | null>(null);
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

  // Page change handler (called by Pagination component)
  const setPage = useCallback((newPage: number) => {
    updateUrl({
      page: newPage === 1 ? null : newPage.toString(), // Clean URL for page 1
    });
  }, [updateUrl]);

  // Clamp page when data loads (handle out-of-range)
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
      query: query || null, // Remove from URL if empty
      page: null, // Reset to page 1
    });
  }, [updateUrl]);

  // Update filters in URL (resets to page 1)
  const handleFiltersChange = useCallback((newFilters: ExoplanetFilters) => {
    updateUrl({
      discoveryMethod: newFilters.discoveryMethod ?? null,
      year: newFilters.year?.toString() ?? null,
      hasRadius: newFilters.hasRadius ? "true" : null,
      hasMass: newFilters.hasMass ? "true" : null,
      sizeCategory: newFilters.sizeCategory ?? null,
      habitable: newFilters.habitable ? "true" : null,
      facility: newFilters.facility ?? null,
      multiPlanet: newFilters.multiPlanet ? "true" : null,
      maxDistancePc: newFilters.maxDistancePc?.toString() ?? null,
      page: null, // Reset to page 1
    });
  }, [updateUrl]);

  // Clear all filters from URL (resets to page 1)
  const handleFilterReset = useCallback(() => {
    updateUrl({
      discoveryMethod: null,
      year: null,
      hasRadius: null,
      hasMass: null,
      sizeCategory: null,
      habitable: null,
      facility: null,
      multiPlanet: null,
      maxDistancePc: null,
      page: null, // Reset to page 1
    });
  }, [updateUrl]);

  // Fetch data when page/limit/search/filters change
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (searchQuery) params.set("query", searchQuery);
      if (filters.discoveryMethod) params.set("discoveryMethod", filters.discoveryMethod);
      if (filters.year) params.set("year", filters.year.toString());
      if (filters.hasRadius) params.set("hasRadius", "true");
      if (filters.hasMass) params.set("hasMass", "true");
      if (filters.sizeCategory) params.set("sizeCategory", filters.sizeCategory);
      if (filters.habitable) params.set("habitable", "true");
      if (filters.facility) params.set("facility", filters.facility);
      if (filters.multiPlanet) params.set("multiPlanet", "true");
      if (filters.maxDistancePc) params.set("maxDistancePc", filters.maxDistancePc.toString());
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const response = await fetch(`/api/exoplanets?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch exoplanets");
      }

      const result: PaginatedResponse<ExoplanetData> = await response.json();
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
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Circle className="w-5 h-5 text-primary" />
          </div>
        <h1 className="font-display text-3xl md:text-4xl text-foreground">
          Exoplanets
        </h1>
      </div>
      <p className="text-muted-foreground mb-2">
        Explore confirmed exoplanets from NASA&apos;s Exoplanet Archive
      </p>
      <p className="text-sm text-muted-foreground/80">
        An exoplanet, or extrasolar planet, is a planet that orbits a star outside our solar system.
        These distant worlds range from rocky planets similar to Earth to gas giants larger than Jupiter,
        and they may exist in habitable zones where conditions could potentially support life.
      </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-8">
        <SearchBar
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search exoplanets by name..."
          isLoading={isLoading}
        />
        <p className="text-xs text-muted-foreground/70 italic">
          Search by exoplanet name or host star. Use filters to narrow results by discovery method, year, or other criteria.
        </p>

        <ExoplanetFilterPanel
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
          {data.objects.map((exoplanet) => (
            <ObjectCard key={exoplanet.id} object={exoplanet} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && data && data.objects.length === 0 && (
        <div className="p-12 text-center">
          <Circle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-xl text-foreground mb-2">
            No exoplanets found
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
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Circle className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-foreground">
            Exoplanets
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

// Suspense wrapper (required for useSearchParams in Next.js 15)
export default function ExoplanetsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ExoplanetsPageContent />
    </Suspense>
  );
}
