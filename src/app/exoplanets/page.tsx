"use client";

import { useState, useEffect, useCallback } from "react";
import { ObjectCard, ObjectCardSkeleton } from "@/components/object-card";
import { SearchBar } from "@/components/search-bar";
import { ExoplanetFilterPanel, ExoplanetFilters } from "@/components/filter-panel";
import { Pagination, PaginationInfo } from "@/components/pagination";
import { ExoplanetData, PaginatedResponse } from "@/lib/types";
import { Sparkles } from "lucide-react";

export default function ExoplanetsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<ExoplanetFilters>({});
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [data, setData] = useState<PaginatedResponse<ExoplanetData> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (searchQuery) params.set("query", searchQuery);
      if (filters.discoveryMethod) params.set("discoveryMethod", filters.discoveryMethod);
      if (filters.yearFrom) params.set("yearFrom", filters.yearFrom.toString());
      if (filters.yearTo) params.set("yearTo", filters.yearTo.toString());
      if (filters.hasRadius) params.set("hasRadius", "true");
      if (filters.hasMass) params.set("hasMass", "true");
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

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, filters]);

  const handleFilterReset = () => {
    setFilters({});
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-foreground">
            Exoplanets
          </h1>
        </div>
        <p className="text-muted-foreground">
          Explore confirmed exoplanets from NASA&apos;s Exoplanet Archive
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-8">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search exoplanets by name..."
          isLoading={isLoading}
        />

        <ExoplanetFilterPanel
          filters={filters}
          onChange={setFilters}
          onReset={handleFilterReset}
        />
      </div>

      {/* Results Info */}
      {data && !isLoading && (
        <div className="flex items-center justify-between mb-6">
          <PaginationInfo
            currentPage={page}
            pageSize={limit}
            totalItems={data.total}
          />
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
          <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
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
