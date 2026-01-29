"use client";

import { useState, useEffect, useCallback, useMemo, Suspense, startTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { saveListUrl } from "@/lib/list-url-store";
import { ObjectCard, ObjectCardSkeleton } from "@/components/object-card";
import { SearchBar } from "@/components/search-bar";
import { SmallBodyFilterPanel, SmallBodyFilters } from "@/components/filter-panel";
import { Pagination, PaginationInfo } from "@/components/pagination";
import { SmallBodyData, PaginatedResponse } from "@/lib/types";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/lib/constants";
import { THEMES } from "@/lib/theme";
import { CircleDot } from "lucide-react";

const theme = THEMES["small-bodies"];

function SmallBodiesPageContent() {
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

  // Save current URL to sessionStorage for breadcrumb navigation
  useEffect(() => {
    const query = searchParams.toString();
    saveListUrl("small-bodies", query ? `${pathname}?${query}` : pathname);
  }, [searchParams, pathname]);

  const [data, setData] = useState<PaginatedResponse<SmallBodyData> | null>(null);
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

  // Fetch data when page/limit/search/filters change
  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (searchQuery) params.set("query", searchQuery);
      if (filters.kind) params.set("kind", filters.kind);
      if (filters.neo) params.set("neo", "true");
      if (filters.pha) params.set("pha", "true");
      if (filters.orbitClass) params.set("orbitClass", filters.orbitClass);
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const response = await fetch(`/api/small-bodies?${params.toString()}`, {
        signal,
      });

      // If request was aborted, don't update state
      if (signal?.aborted) return;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch small bodies");
      }

      const result: PaginatedResponse<SmallBodyData> = await response.json();
      setData(result);
    } catch (err) {
      // Ignore abort errors (user navigated away or query changed)
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      // Only set loading false if not aborted
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, [searchQuery, filters, page, limit]);

  // Use AbortController to cancel in-flight requests when query/filters/page change
  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);

    return () => {
      controller.abort(); // Cancel on cleanup (re-render or unmount)
    };
  }, [fetchData]);

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="container mx-auto px-4 py-8">
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

        <SmallBodyFilterPanel
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
              theme="small-bodies"
            />
          )}
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
            <ObjectCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Results Grid */}
      {!isLoading && data && data.objects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.objects.map((smallBody) => (
            <ObjectCard key={smallBody.sourceId} object={smallBody} />
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

// Suspense wrapper (required for useSearchParams in Next.js 15)
export default function SmallBodiesPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <SmallBodiesPageContent />
    </Suspense>
  );
}
