"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowUpRight, Bookmark, Trash2, FolderHeart, Layers, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExportButton } from "@/components/export-button";
import { useAppAuth } from "@/components/auth/app-auth-provider";
import { ACCOUNT_CARD_TONE } from "@/lib/theme";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { AddToCollectionDialog } from "@/components/collections/add-to-collection-dialog";
import {
  EMPTY_SAVED_OBJECT_TYPE_COUNTS,
  formatSavedObjectTypeBadge,
  getSavedObjectType,
  resolveSavedObjectHref,
  SAVED_OBJECT_TYPE_LABELS,
  SAVED_OBJECT_TYPE_ORDER,
  type SavedObjectUiType,
} from "@/lib/saved-object-ui";
import { queryKeys } from "@/lib/query-keys";

interface SavedObjectItem {
  id: number;
  canonicalId: string;
  displayName: string;
  notes: string | null;
  createdAt: string;
}

interface SavedObjectsResponse {
  objects: SavedObjectItem[];
  total: number;
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

interface CollectionsPrefetchResponse {
  collections: CollectionPrefetchItem[];
  total: number;
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

interface CollectionPrefetchItem {
  id: number;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  isPublic: boolean;
  itemCount?: number;
  updatedAt: string;
}

type SavedObjectType = SavedObjectUiType;
type SavedObjectFilter = "all" | SavedObjectType;
type SavedObjectFilterOption = {
  value: SavedObjectFilter;
  label: string;
  count: number;
};

const TYPE_ACCENTS: Record<SavedObjectType, string> = {
  exoplanet: "hsl(179 70% 55%)",
  star: "hsl(40 100% 58%)",
  "small-body": "hsl(17 100% 60%)",
  "close-approach": "hsl(0 100% 63%)",
  fireball: "hsl(17 100% 60%)",
  flr: "hsl(35 100% 62%)",
  cme: "hsl(270 70% 65%)",
  gst: "hsl(82 100% 67%)",
  unknown: "hsl(35 10% 65%)",
};

const SAVED_OBJECTS_LIMIT = 100;
const GRID_ROW_ESTIMATE_PX = 256;
const GRID_OVERSCAN_ROWS = 2;
const GRID_VIRTUALIZATION_THRESHOLD = 24;

function getSavedObjectsGridColumns(width: number): number {
  if (width >= 1024) return 3;
  if (width >= 768) return 2;
  return 1;
}

async function fetchSavedObjects(
  limit: number,
  cursor: string | null
): Promise<SavedObjectsResponse> {
  const query = new URLSearchParams();
  query.set("limit", String(limit));
  if (cursor) {
    query.set("cursor", cursor);
  }

  const response = await fetch(`/api/user/saved-objects?${query.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to load saved objects");
  }

  const data = (await response.json()) as SavedObjectsResponse;
  return {
    objects: Array.isArray(data.objects) ? data.objects : [],
    total: Number.isFinite(data.total) ? data.total : 0,
    limit: Number.isFinite(data.limit) ? data.limit : limit,
    hasMore: Boolean(data.hasMore),
    nextCursor: typeof data.nextCursor === "string" ? data.nextCursor : null,
  };
}

async function prefetchCollections(
  limit: number,
  cursor: string | null
): Promise<CollectionsPrefetchResponse> {
  const query = new URLSearchParams();
  query.set("limit", String(limit));
  if (cursor) {
    query.set("cursor", cursor);
  }
  const response = await fetch(`/api/user/collections?${query.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to prefetch collections");
  }
  const data = (await response.json()) as CollectionsPrefetchResponse;
  return {
    collections: Array.isArray(data.collections) ? data.collections : [],
    total: Number.isFinite(data.total) ? data.total : 0,
    limit: Number.isFinite(data.limit) ? data.limit : limit,
    hasMore: Boolean(data.hasMore),
    nextCursor: typeof data.nextCursor === "string" ? data.nextCursor : null,
  };
}

export function SavedObjectsPageContent({
  canAccessCollections = false,
}: {
  canAccessCollections?: boolean;
}) {
  const auth = useAppAuth();
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState<SavedObjectFilter>("all");
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const savedObjectsQueryKey = queryKeys.savedObjects(SAVED_OBJECTS_LIMIT);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchSavedObjects,
  } = useInfiniteQuery({
    queryKey: savedObjectsQueryKey,
    queryFn: ({ pageParam }) => fetchSavedObjects(SAVED_OBJECTS_LIMIT, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
    enabled: auth.isSignedIn,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const items = useMemo(
    () => data?.pages.flatMap((page) => page.objects) ?? [],
    [data]
  );
  const totalSavedCount = data?.pages[0]?.total ?? items.length;

  useEffect(() => {
    if (!auth.isSignedIn || !canAccessCollections) return;
    void queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.collections(),
      queryFn: ({ pageParam }: { pageParam: string | null }) =>
        prefetchCollections(48, pageParam),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage: CollectionsPrefetchResponse) =>
        lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
      staleTime: 60_000,
    });
  }, [auth.isSignedIn, canAccessCollections, queryClient]);

  const deleteSavedObjectMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/user/saved-objects/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove saved object");
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: savedObjectsQueryKey });
      const previousItems = queryClient.getQueryData<InfiniteData<SavedObjectsResponse>>(
        savedObjectsQueryKey,
      );
      queryClient.setQueryData<InfiniteData<SavedObjectsResponse>>(
        savedObjectsQueryKey,
        (current) => {
          if (!current) return current;
          const nextPages = current.pages.map((page, pageIndex) => ({
            ...page,
            objects: page.objects.filter((item) => item.id !== id),
            total: pageIndex === 0 ? Math.max(0, page.total - 1) : page.total,
          }));
          return { ...current, pages: nextPages };
        }
      );
      return { previousItems };
    },
    onError: (error, _id, context) => {
      console.error(error);
      if (context?.previousItems) {
        queryClient.setQueryData(savedObjectsQueryKey, context.previousItems);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: savedObjectsQueryKey });
      void queryClient.invalidateQueries({ queryKey: queryKeys.collections() });
    },
  });

  const hasItems = items.length > 0;

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [items]
  );

  const typeCounts = useMemo(() => {
    const counts = { ...EMPTY_SAVED_OBJECT_TYPE_COUNTS };
    for (const item of sortedItems) {
      const type = getSavedObjectType(item.canonicalId);
      counts[type] += 1;
    }
    return counts;
  }, [sortedItems]);

  const effectiveSelectedType = useMemo<SavedObjectFilter>(() => {
    if (selectedType === "all") return "all";
    if (typeCounts[selectedType] > 0) return selectedType;
    return "all";
  }, [selectedType, typeCounts]);

  const filteredItems = useMemo(() => {
    if (effectiveSelectedType === "all") return sortedItems;
    return sortedItems.filter(
      (item) => getSavedObjectType(item.canonicalId) === effectiveSelectedType
    );
  }, [effectiveSelectedType, sortedItems]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    const updateMetrics = () => {
      setViewportHeight(container.clientHeight);
      setContainerWidth(container.clientWidth);
    };

    updateMetrics();
    container.addEventListener("scroll", handleScroll, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      updateMetrics();
    });
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", handleScroll);
      resizeObserver.disconnect();
    };
  }, [filteredItems.length]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: 0 });
  }, [effectiveSelectedType]);

  const virtualizedGrid = useMemo(() => {
    const totalItems = filteredItems.length;
    const columns = getSavedObjectsGridColumns(containerWidth);
    const shouldVirtualize = totalItems > GRID_VIRTUALIZATION_THRESHOLD && viewportHeight > 0;

    if (!shouldVirtualize) {
      return {
        columns,
        visibleItems: filteredItems,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
      };
    }

    const totalRows = Math.ceil(totalItems / columns);
    const startRow = Math.max(0, Math.floor(scrollTop / GRID_ROW_ESTIMATE_PX) - GRID_OVERSCAN_ROWS);
    const endRow = Math.min(
      totalRows,
      Math.ceil((scrollTop + viewportHeight) / GRID_ROW_ESTIMATE_PX) + GRID_OVERSCAN_ROWS
    );
    const startIndex = startRow * columns;
    const endIndex = Math.min(totalItems, endRow * columns);

    return {
      columns,
      visibleItems: filteredItems.slice(startIndex, endIndex),
      topSpacerHeight: startRow * GRID_ROW_ESTIMATE_PX,
      bottomSpacerHeight: Math.max(0, (totalRows - endRow) * GRID_ROW_ESTIMATE_PX),
    };
  }, [containerWidth, filteredItems, scrollTop, viewportHeight]);

  const filterOptions = useMemo<SavedObjectFilterOption[]>(() => {
    return [
      { value: "all" as const, label: "All", count: sortedItems.length },
      ...SAVED_OBJECT_TYPE_ORDER.filter((type) => typeCounts[type] > 0).map((type) => ({
        value: type,
        label: SAVED_OBJECT_TYPE_LABELS[type],
        count: typeCounts[type],
      })),
    ];
  }, [sortedItems.length, typeCounts]);

  const cycleFilter = useCallback(() => {
    setSelectedType((previous) => {
      if (filterOptions.length === 0) return "all";
      const currentIndex = filterOptions.findIndex((option) => option.value === previous);
      if (currentIndex === -1 || currentIndex === filterOptions.length - 1) {
        return filterOptions[0].value;
      }
      return filterOptions[currentIndex + 1].value;
    });
  }, [filterOptions]);

  const refreshItems = useCallback(() => {
    if (isLoading) return;
    void refetchSavedObjects();
  }, [isLoading, refetchSavedObjects]);

  const pageShortcuts = useMemo(
    () => [
      { key: "f", handler: cycleFilter, description: "Next type filter" },
      { key: "r", handler: refreshItems, description: "Refresh saved objects" },
    ],
    [cycleFilter, refreshItems]
  );

  useKeyboardShortcuts({
    shortcuts: pageShortcuts,
  });

  const handleDelete = useCallback(
    async (id: number) => {
      const confirmed = window.confirm("Remove this item from saved objects?");
      if (!confirmed) return;

      await deleteSavedObjectMutation.mutateAsync(id);
    },
    [deleteSavedObjectMutation]
  );

  if (!auth.isSignedIn) {
    return (
      <div className="shell-container py-12">
        <Card
          tone={ACCOUNT_CARD_TONE}
          className="relative max-w-3xl overflow-hidden border-orange-300/20 bg-[#1a120d]/80"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,185,120,0.13),transparent_52%)]" />
          <CardContent className="relative py-10 text-center">
            <FolderHeart className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Sign in to view your saved objects.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const headingContent = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl text-foreground sm:text-4xl">Saved Objects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Catalog objects and events you&apos;ve bookmarked
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground/85">
          {totalSavedCount} total saved
        </p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
        {canAccessCollections ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 border-orange-300/30 bg-black/25 text-orange-100 hover:bg-orange-500/15"
          >
            <Link href="/user/collections">
              <Layers className="h-3.5 w-3.5" />
              Collections
            </Link>
          </Button>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-orange-300/30 bg-black/25 text-orange-100 hover:bg-orange-500/15"
          onClick={refreshItems}
          disabled={isLoading || isFetchingNextPage}
          aria-busy={isLoading || isFetchingNextPage}
        >
          {isLoading || isFetchingNextPage ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {isLoading || isFetchingNextPage ? "Refreshing..." : "Refresh"}
        </Button>
        <ExportButton category="saved-objects" />
      </div>
    </div>
  );

  return (
    <div className="shell-container py-8">
      {isLoading ? (
        <>
          <div className="mb-6">{headingContent}</div>
          <Card tone={ACCOUNT_CARD_TONE} className="border-orange-300/20 bg-[#17100d]/80">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-orange-300" />
              Loading saved objects...
            </CardContent>
          </Card>
        </>
      ) : !hasItems ? (
        <>
          <div className="mb-6">{headingContent}</div>
          <Card tone={ACCOUNT_CARD_TONE} className="border-orange-300/20 bg-[#17100d]/80">
            <CardContent className="py-12 text-center">
              <Bookmark className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-display text-xl text-orange-100">No saved objects yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Save items from any detail page and they will appear here.
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr] lg:items-start">
          <Card
            tone={ACCOUNT_CARD_TONE}
            className="relative overflow-hidden border-orange-300/20 bg-[#17100d]/85 lg:sticky"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,180,110,0.14),transparent_58%)]" />
            <CardContent className="relative space-y-4 py-1">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-orange-200/70">Filters</p>
                <p className="mt-1 text-sm text-orange-100/75">
                  Focus on one object family at a time.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {filterOptions.map((option) => {
                  const isActive = effectiveSelectedType === option.value;
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={isActive ? "default" : "outline"}
                      className={
                        isActive
                          ? "h-8 gap-2 bg-orange-500 text-black hover:bg-orange-400"
                          : "h-8 gap-2 border-orange-300/30 bg-black/25 text-orange-100 hover:bg-orange-500/15"
                      }
                      onClick={() => setSelectedType(option.value)}
                    >
                      {option.label}
                      <Badge
                        variant={isActive ? "secondary" : "outline"}
                        className={
                          isActive
                            ? "text-[10px] bg-black/15 text-black"
                            : "text-[10px] border-orange-300/35 bg-black/30 text-orange-100"
                        }
                      >
                        {option.count}
                      </Badge>
                    </Button>
                  );
                })}
              </div>

              <div className="rounded-lg border border-orange-200/15 bg-black/20 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-orange-200/70">
                  Keyboard
                </p>
                <p className="mt-2 text-xs text-orange-100/70">
                  Press <kbd className="rounded border border-orange-300/30 bg-black/35 px-1.5 py-0.5">F</kbd> to
                  cycle filters and{" "}
                  <kbd className="rounded border border-orange-300/30 bg-black/35 px-1.5 py-0.5">R</kbd> to refresh.
                </p>
              </div>
            </CardContent>
          </Card>

          <section className="space-y-4">
            {headingContent}

            {filteredItems.length > 0 ? (
              <div
                ref={scrollContainerRef}
                className="max-h-[64dvh] overflow-y-auto pr-1 overscroll-contain md:max-h-[68dvh]"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground/90">
                    {effectiveSelectedType === "all" ? "All saved objects" : SAVED_OBJECT_TYPE_LABELS[effectiveSelectedType]}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-orange-300/30 bg-black/20 text-[10px] uppercase tracking-wider text-orange-100"
                  >
                    {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}
                  </Badge>
                </div>

                {virtualizedGrid.topSpacerHeight > 0 ? (
                  <div style={{ height: virtualizedGrid.topSpacerHeight }} aria-hidden />
                ) : null}

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {virtualizedGrid.visibleItems.map((item) => {
                    const itemType = getSavedObjectType(item.canonicalId);
                    const href = resolveSavedObjectHref(item.canonicalId);
                    const accent = TYPE_ACCENTS[itemType];

                    return (
                      <div
                        key={item.id}
                        className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/50 bg-card/95 p-4 shadow-[inset_0_1px_0_rgba(255,210,160,0.06)] transition duration-300 hover:border-orange-300/40"
                      >
                        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/80 to-transparent" />
                        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(255,184,116,0.12),transparent_58%)]" />
                        <div className="relative flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-base font-semibold text-foreground">
                              {item.displayName}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className="border-orange-300/30 bg-black/20 text-[10px] uppercase tracking-wider text-orange-100"
                              >
                                <span
                                  className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
                                  style={{ backgroundColor: accent }}
                                  aria-hidden
                                />
                                {formatSavedObjectTypeBadge(itemType)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Saved {new Date(item.createdAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              void handleDelete(item.id);
                            }}
                            aria-label={`Remove ${item.displayName}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {item.notes ? (
                          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.notes}</p>
                        ) : null}

                        <div className="mt-auto flex w-full items-center justify-between gap-3 pt-3 text-sm">
                          {href ? (
                            <Link
                              href={href}
                              className="inline-flex items-center gap-1.5 text-primary transition-colors hover:text-primary/85"
                            >
                              Open details
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No direct detail page available
                            </span>
                          )}
                          {canAccessCollections ? (
                            <AddToCollectionDialog
                              savedObjectId={item.id}
                              savedObjectName={item.displayName}
                              onMembershipChange={() => {
                                void queryClient.invalidateQueries({ queryKey: queryKeys.collections() });
                              }}
                            />
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {virtualizedGrid.bottomSpacerHeight > 0 ? (
                  <div style={{ height: virtualizedGrid.bottomSpacerHeight }} aria-hidden />
                ) : null}

                {hasNextPage ? (
                  <div className="py-4 text-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void fetchNextPage();
                      }}
                      disabled={isFetchingNextPage}
                      className="gap-1.5 border-orange-300/30 bg-black/25 text-orange-100 hover:bg-orange-500/15"
                    >
                      {isFetchingNextPage ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load more"
                      )}
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Card tone={ACCOUNT_CARD_TONE} className="border-orange-300/20 bg-[#17100d]/80">
                <CardContent className="py-8 text-center text-muted-foreground">
                  No saved objects match this filter.
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
