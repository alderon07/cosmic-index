"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowUpRight,
  Bookmark,
  FolderHeart,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAppAuth } from "@/components/auth/app-auth-provider";
import { ACCOUNT_CARD_TONE } from "@/lib/theme";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { queryKeys } from "@/lib/query-keys";

interface CollectionItem {
  id: number;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  isPublic: boolean;
  itemCount?: number;
  updatedAt: string;
}

interface CollectionsResponse {
  collections: CollectionItem[];
  total: number;
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

interface SavedObjectsPrefetchResponse {
  objects: SavedObjectPrefetchItem[];
  total: number;
  limit: number;
  hasMore: boolean;
  nextCursor: string | null;
}

interface SavedObjectPrefetchItem {
  id: number;
  canonicalId: string;
  displayName: string;
  notes: string | null;
  createdAt: string;
}

const FALLBACK_ACCENTS = [
  "hsl(17 100% 60%)",
  "hsl(40 100% 58%)",
  "hsl(82 100% 67%)",
  "hsl(179 70% 55%)",
];

function resolveCollectionAccent(rawColor: string | null | undefined, index: number) {
  const trimmedColor = rawColor?.trim();
  if (trimmedColor) return trimmedColor;
  return FALLBACK_ACCENTS[index % FALLBACK_ACCENTS.length];
}

async function fetchCollections(
  limit: number,
  cursor: string | null
): Promise<CollectionsResponse> {
  const query = new URLSearchParams();
  query.set("limit", String(limit));
  if (cursor) {
    query.set("cursor", cursor);
  }
  const response = await fetch(`/api/user/collections?${query.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to load collections");
  }

  const data = (await response.json()) as CollectionsResponse;
  return {
    collections: Array.isArray(data.collections) ? data.collections : [],
    total: Number.isFinite(data.total) ? data.total : 0,
    limit: Number.isFinite(data.limit) ? data.limit : limit,
    hasMore: Boolean(data.hasMore),
    nextCursor: typeof data.nextCursor === "string" ? data.nextCursor : null,
  };
}

async function prefetchSavedObjects(
  limit: number,
  cursor: string | null
): Promise<SavedObjectsPrefetchResponse> {
  const query = new URLSearchParams();
  query.set("limit", String(limit));
  if (cursor) {
    query.set("cursor", cursor);
  }
  const response = await fetch(`/api/user/saved-objects?${query.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to prefetch saved objects");
  }
  const data = (await response.json()) as SavedObjectsPrefetchResponse;
  return {
    objects: Array.isArray(data.objects) ? data.objects : [],
    total: Number.isFinite(data.total) ? data.total : 0,
    limit: Number.isFinite(data.limit) ? data.limit : limit,
    hasMore: Boolean(data.hasMore),
    nextCursor: typeof data.nextCursor === "string" ? data.nextCursor : null,
  };
}

export function CollectionsPageContent() {
  const auth = useAppAuth();
  const queryClient = useQueryClient();
  const collectionsLimit = 48;
  const collectionsQueryKey = queryKeys.collections();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch: refetchCollections,
  } = useInfiniteQuery({
    queryKey: collectionsQueryKey,
    queryFn: ({ pageParam }) => fetchCollections(collectionsLimit, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
    enabled: auth.isSignedIn,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
  const collections = useMemo(
    () => data?.pages.flatMap((page) => page.collections) ?? [],
    [data]
  );
  const totalCollectionsCount = data?.pages[0]?.total ?? collections.length;

  useEffect(() => {
    if (!auth.isSignedIn) return;
    void queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.savedObjects(100),
      queryFn: ({ pageParam }: { pageParam: string | null }) =>
        prefetchSavedObjects(100, pageParam),
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage: SavedObjectsPrefetchResponse) =>
        lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
      staleTime: 60_000,
    });
  }, [auth.isSignedIn, queryClient]);

  const createCollectionMutation = useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      const response = await fetch("/api/user/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: input.name,
          description: input.description || undefined,
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message || "Failed to create collection");
      }

      return (await response.json()) as CollectionItem;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: collectionsQueryKey });
      const previousCollections = queryClient.getQueryData<InfiniteData<CollectionsResponse>>(
        collectionsQueryKey
      );
      const tempId = -Date.now();
      const now = new Date().toISOString();

      const optimisticCollection: CollectionItem = {
        id: tempId,
        name: input.name,
        description: input.description ?? null,
        color: "#f97316",
        icon: "folder",
        isPublic: false,
        itemCount: 0,
        updatedAt: now,
      };

      queryClient.setQueryData<InfiniteData<CollectionsResponse>>(
        collectionsQueryKey,
        (current) => {
          if (!current) {
            return {
              pages: [
                {
                  collections: [optimisticCollection],
                  total: 1,
                  limit: collectionsLimit,
                  hasMore: false,
                  nextCursor: null,
                },
              ],
              pageParams: [null],
            };
          }

          if (current.pages.length === 0) return current;
          const [firstPage, ...restPages] = current.pages;
          const nextFirstPage: CollectionsResponse = {
            ...firstPage,
            collections: [optimisticCollection, ...firstPage.collections],
            total: firstPage.total + 1,
          };
          return {
            ...current,
            pages: [nextFirstPage, ...restPages],
          };
        }
      );

      return { previousCollections, tempId };
    },
    onError: (error, _input, context) => {
      console.error(error);
      if (context?.previousCollections) {
        queryClient.setQueryData(collectionsQueryKey, context.previousCollections);
      }
    },
    onSuccess: (createdCollection, _input, context) => {
      queryClient.setQueryData<InfiniteData<CollectionsResponse>>(
        collectionsQueryKey,
        (current) => {
          if (!current || current.pages.length === 0) return current;

          const [firstPage, ...restPages] = current.pages;
          const replacedCollections = firstPage.collections.map((collection) =>
            collection.id === context?.tempId ? createdCollection : collection
          );
          if (!replacedCollections.some((collection) => collection.id === createdCollection.id)) {
            replacedCollections.unshift(createdCollection);
          }

          return {
            ...current,
            pages: [
              {
                ...firstPage,
                collections: replacedCollections,
              },
              ...restPages,
            ],
          };
        }
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: collectionsQueryKey });
    },
  });

  const deleteCollectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/user/collections/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message || "Failed to delete collection");
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: collectionsQueryKey });
      const previousCollections = queryClient.getQueryData<InfiniteData<CollectionsResponse>>(
        collectionsQueryKey
      );
      queryClient.setQueryData<InfiniteData<CollectionsResponse>>(
        collectionsQueryKey,
        (current) => {
          if (!current) return current;
          const nextPages = current.pages.map((page, pageIndex) => ({
            ...page,
            collections: page.collections.filter((collection) => collection.id !== id),
            total: pageIndex === 0 ? Math.max(0, page.total - 1) : page.total,
          }));
          return { ...current, pages: nextPages };
        }
      );
      return { previousCollections };
    },
    onError: (error, _id, context) => {
      console.error(error);
      if (context?.previousCollections) {
        queryClient.setQueryData(collectionsQueryKey, context.previousCollections);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: collectionsQueryKey });
    },
  });

  const refreshCollections = useCallback(() => {
    if (isLoading || isFetchingNextPage) return;
    void refetchCollections();
  }, [isFetchingNextPage, isLoading, refetchCollections]);

  const focusCollectionNameInput = useCallback(() => {
    nameInputRef.current?.focus();
  }, []);

  const pageShortcuts = useMemo(
    () => [
      { key: "r", handler: refreshCollections, description: "Refresh collections" },
      { key: "n", handler: focusCollectionNameInput, description: "Focus new collection name" },
    ],
    [refreshCollections, focusCollectionNameInput]
  );

  useKeyboardShortcuts({
    shortcuts: pageShortcuts,
  });

  const stats = useMemo(() => {
    const totalCollections = collections.length;
    const totalItems = collections.reduce(
      (count, collection) => count + (collection.itemCount ?? 0),
      0
    );

    return {
      totalCollections: Math.max(totalCollections, totalCollectionsCount),
      totalItems,
    };
  }, [collections, totalCollectionsCount]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName || isCreating) return;

    setIsCreating(true);
    try {
      await createCollectionMutation.mutateAsync({
        name: trimmedName,
        description: description.trim() || undefined,
      });
      setName("");
      setDescription("");
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("Delete this collection?");
    if (!confirmed) return;

    try {
      await deleteCollectionMutation.mutateAsync(id);
    } catch (error) {
      console.error(error);
    }
  };

  if (!auth.isSignedIn) {
    return (
      <div className="shell-container py-12">
        <Card
          tone={ACCOUNT_CARD_TONE}
          className="relative max-w-3xl overflow-hidden border-orange-300/20 bg-[#1a120d]/80"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,185,120,0.13),transparent_52%)]" />
          <CardContent className="relative py-12 text-center">
            <FolderHeart className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Sign in to manage your collections.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="shell-container overflow-x-clip py-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr] lg:items-start">
        <Card
          tone={ACCOUNT_CARD_TONE}
          className="relative overflow-hidden border-orange-300/20 bg-[#17100d]/85 lg:sticky lg:top-24"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,180,110,0.16),transparent_60%)]" />
          <CardHeader className="relative pb-3">
            <p className="text-[10px] uppercase tracking-[0.2em] text-orange-200/70">Builder</p>
            <CardTitle className="mt-1 flex items-center gap-2 text-xl text-orange-100">
              <Plus className="h-4 w-4 text-orange-300" />
              New Collection
            </CardTitle>
            <p className="text-sm text-orange-100/70">
              Create a focused set for exoplanets, stars, events, or mission snapshots.
            </p>
          </CardHeader>
          <CardContent className="relative">
            <form className="space-y-3" onSubmit={handleCreate}>
              <div className="space-y-1.5">
                <label
                  htmlFor="collection-name"
                  className="text-[11px] uppercase tracking-[0.16em] text-orange-200/70"
                >
                  Name
                </label>
                <Input
                  id="collection-name"
                  ref={nameInputRef}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Near-Earth Watchlist"
                  maxLength={100}
                  className="border-orange-300/20 bg-black/25 text-orange-100 placeholder:text-orange-100/45"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="collection-description"
                  className="text-[11px] uppercase tracking-[0.16em] text-orange-200/70"
                >
                  Description
                </label>
                <Input
                  id="collection-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional short context for this collection"
                  maxLength={500}
                  className="border-orange-300/20 bg-black/25 text-orange-100 placeholder:text-orange-100/45"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <p className="text-[11px] text-orange-100/55">
                  Shortcut: <kbd className="rounded border border-orange-300/30 bg-black/35 px-1.5 py-0.5">N</kbd>
                </p>
                <Button
                  type="submit"
                  disabled={isCreating || !name.trim()}
                  className="min-w-36 bg-orange-500 text-black hover:bg-orange-400"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Collection"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <section className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-3xl text-foreground sm:text-4xl">Collections</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Organize your saved objects into focused sets
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground/90">
                {stats.totalCollections} total • {stats.totalItems} objects tracked
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="gap-1.5 border-orange-300/30 bg-black/25 text-orange-100 hover:bg-orange-500/15"
              >
                <Link href="/user/saved-objects">
                  <Bookmark className="h-3.5 w-3.5" />
                  Saved Objects
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshCollections}
                disabled={isLoading || isFetchingNextPage}
                className="gap-1.5 border-orange-300/30 bg-black/25 text-orange-100 hover:bg-orange-500/15 sm:w-auto"
              >
                {isLoading || isFetchingNextPage ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                {isLoading || isFetchingNextPage ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <Card tone={ACCOUNT_CARD_TONE} className="border-orange-300/20 bg-[#17100d]/80">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-orange-300" />
                Loading collections...
              </CardContent>
            </Card>
          ) : collections.length === 0 ? (
            <Card tone={ACCOUNT_CARD_TONE} className="border-orange-300/20 bg-[#17100d]/80">
              <CardContent className="py-12 text-center">
                <Layers className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="font-display text-xl text-orange-100">No collections yet</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Build your first collection using the panel on the left.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground/90">
                  All collections
                </span>
                <Badge
                  variant="outline"
                  className="border-orange-300/30 bg-black/20 text-[10px] uppercase tracking-wider text-orange-100"
                >
                  {collections.length} {collections.length === 1 ? "collection" : "collections"}
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {collections.map((collection, index) => {
                  const accent = resolveCollectionAccent(collection.color, index);

                  return (
                    <Card
                      tone={ACCOUNT_CARD_TONE}
                      key={collection.id}
                      className="group relative flex h-full flex-col overflow-hidden border-border/50 bg-card/95 transition duration-300 hover:-translate-y-0.5 hover:border-orange-300/45"
                    >
                      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/80 to-transparent" />
                      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(255,184,116,0.12),transparent_58%)]" />
                      <CardHeader className="relative pb-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/85">
                              Collection {index + 1}
                            </p>
                            <CardTitle className="text-xl leading-tight text-foreground">
                              <Link
                                href={`/user/collections/${collection.id}`}
                                prefetch={false}
                                className="inline-flex items-center gap-2 transition-colors hover:text-primary"
                              >
                                <span
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: accent }}
                                  aria-hidden
                                />
                                <span className="truncate">{collection.name}</span>
                              </Link>
                            </CardTitle>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              void handleDelete(collection.id);
                            }}
                            aria-label={`Delete ${collection.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="relative flex flex-1 flex-col pt-0">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="border-orange-300/35 bg-black/20 text-orange-100">
                            {collection.itemCount ?? 0} items
                          </Badge>
                          <Badge
                            variant={collection.isPublic ? "secondary" : "outline"}
                            className={
                              collection.isPublic
                                ? "bg-uranium-green/80 text-background"
                                : "border-border/70 bg-black/25 text-muted-foreground"
                            }
                          >
                            {collection.isPublic ? "Public" : "Private"}
                          </Badge>
                        </div>

                        {collection.description ? (
                          <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                            {collection.description}
                          </p>
                        ) : (
                          <p className="mb-3 text-sm italic text-muted-foreground/75">
                            No description provided.
                          </p>
                        )}

                        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                          <Link
                            href={`/user/collections/${collection.id}`}
                            prefetch={false}
                            className="inline-flex items-center gap-1.5 text-sm text-primary transition-colors hover:text-primary/85"
                          >
                            Open collection
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          </Link>
                          <p className="text-right text-[11px] text-muted-foreground">
                            Updated
                            <br />
                            {new Date(collection.updatedAt).toLocaleString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {hasNextPage ? (
                <div className="pt-2 text-center">
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
            </>
          )}
        </section>
      </div>
    </div>
  );
}
