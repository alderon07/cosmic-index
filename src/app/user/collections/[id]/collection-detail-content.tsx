"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, FolderHeart, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppAuth } from "@/components/auth/app-auth-provider";
import { ACCOUNT_CARD_TONE } from "@/lib/theme";
import {
  formatSavedObjectTypeBadge,
  getSavedObjectType,
  resolveSavedObjectHref,
} from "@/lib/saved-object-ui";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ExportButton } from "@/components/export-button";

interface CollectionMetadata {
  id: number;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CollectionItem {
  id: number;
  canonicalId: string;
  displayName: string;
  notes: string | null;
  createdAt: string;
  position: number;
}

interface CollectionDetailResponse {
  collection: CollectionMetadata;
  items: CollectionItem[];
  itemCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

const DEFAULT_LIMIT = 24;
const TYPE_ACCENTS: Record<string, string> = {
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

export function CollectionDetailContent() {
  const auth = useAppAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const collectionId = Number.parseInt(params.id, 10);
  const parsedPage = Number.parseInt(searchParams.get("page") || "1", 10);
  const parsedLimit = Number.parseInt(
    searchParams.get("limit") || String(DEFAULT_LIMIT),
    10
  );
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(100, parsedLimit)
      : DEFAULT_LIMIT;

  const [data, setData] = useState<CollectionDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<number | null>(null);

  const queryString = useMemo(() => {
    const query = new URLSearchParams();
    query.set("page", String(page));
    query.set("limit", String(limit));
    return query.toString();
  }, [limit, page]);

  const setPage = useCallback(
    (nextPage: number) => {
      const safePage = Math.max(1, nextPage);
      router.push(`/user/collections/${params.id}?page=${safePage}&limit=${limit}`);
    },
    [limit, params.id, router]
  );

  const loadCollection = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);
      setIsNotFound(false);

      try {
        const response = await fetch(`/api/user/collections/${params.id}?${queryString}`);

        if (response.status === 404) {
          setIsNotFound(true);
          setData(null);
          return;
        }

        if (response.status === 401) {
          setErrorMessage("Session expired. Please sign in again.");
          setData(null);
          return;
        }

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(body?.message || "Failed to load collection.");
        }

        const payload = (await response.json()) as CollectionDetailResponse;
        setData(payload);
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error ? error.message : "Could not load this collection right now."
        );
        setData(null);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [params.id, queryString]
  );

  useEffect(() => {
    if (!Number.isFinite(collectionId)) {
      setIsNotFound(true);
      setIsLoading(false);
      return;
    }
    void loadCollection();
  }, [collectionId, loadCollection]);

  const refreshCollection = useCallback(() => {
    if (isRefreshing) return;
    void loadCollection(true);
  }, [isRefreshing, loadCollection]);

  const pageShortcuts = useMemo(
    () => [{ key: "r", handler: refreshCollection, description: "Refresh collection" }],
    [refreshCollection]
  );

  useKeyboardShortcuts({
    shortcuts: pageShortcuts,
  });

  const handleRemoveItem = useCallback(
    async (savedObjectId: number) => {
      const confirmed = window.confirm("Remove this item from the collection?");
      if (!confirmed || pendingRemoveId) return;

      setPendingRemoveId(savedObjectId);
      setErrorMessage(null);

      try {
        const response = await fetch(`/api/user/collections/${params.id}/items`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ savedObjectId }),
        });

        if (!response.ok && response.status !== 404) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(body?.message || "Failed to remove item from collection.");
        }

        setData((previous) => {
          if (!previous) return previous;
          const removedCount = previous.items.some((item) => item.id === savedObjectId) ? 1 : 0;
          const nextItems = previous.items.filter((item) => item.id !== savedObjectId);
          const nextCount = Math.max(0, previous.itemCount - removedCount);
          return {
            ...previous,
            items: nextItems,
            itemCount: nextCount,
          };
        });

        if (data && data.items.length === 1 && page > 1) {
          setPage(page - 1);
        }
      } catch (error) {
        console.error(error);
        setErrorMessage(
          error instanceof Error ? error.message : "Could not remove this item right now."
        );
      } finally {
        setPendingRemoveId(null);
      }
    },
    [data, page, params.id, pendingRemoveId, setPage]
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
            <p className="text-muted-foreground">Sign in to view your collection.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="shell-container py-8">
        <Card tone={ACCOUNT_CARD_TONE} className="max-w-4xl border-orange-300/20 bg-[#17100d]/80">
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">Resource not found.</p>
            <Link
              href="/user/collections"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to collections
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="shell-container space-y-5 py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Link
            href="/user/collections"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to collections
          </Link>
          <h1 className="mt-2 truncate font-display text-3xl text-foreground sm:text-4xl">
            {data?.collection.name || "Collection"}
          </h1>
          {data?.collection.description ? (
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{data.collection.description}</p>
          ) : null}
          {data ? (
            <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground/90">
              {data.itemCount} {data.itemCount === 1 ? "item" : "items"} • Updated{" "}
              {new Date(data.collection.updatedAt).toLocaleString()}
            </p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          {Number.isFinite(collectionId) ? (
            <ExportButton
              category="saved-objects"
              queryParams={{ collectionId }}
              fileLabel={data?.collection.name || `collection-${collectionId}`}
            />
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refreshCollection}
            disabled={isLoading || isRefreshing}
            className="gap-1.5 border-orange-300/30 bg-black/25 text-orange-100 hover:bg-orange-500/15"
          >
            {isRefreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <Card tone={ACCOUNT_CARD_TONE} className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">{errorMessage}</CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <Card tone={ACCOUNT_CARD_TONE} className="border-orange-300/20 bg-[#17100d]/80">
          <CardContent className="py-5 space-y-3">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </CardContent>
        </Card>
      ) : data && data.items.length > 0 ? (
        <div className="flex min-h-[52dvh] flex-col">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {data.items.map((item) => {
              const href = resolveSavedObjectHref(item.canonicalId);
              const type = getSavedObjectType(item.canonicalId);
              const accent = TYPE_ACCENTS[type];
              const isRemoving = pendingRemoveId === item.id;

              return (
                <Card
                  key={item.id}
                  tone={ACCOUNT_CARD_TONE}
                  className="group relative overflow-hidden border-border/50 bg-card/95 transition duration-300 hover:-translate-y-0.5 hover:border-orange-300/45"
                >
                  <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-orange-300/80 to-transparent" />
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-[radial-gradient(circle_at_top_right,rgba(255,184,116,0.12),transparent_58%)]" />
                  <CardHeader className="relative pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="line-clamp-2 text-xl leading-tight">
                          {item.displayName}
                        </CardTitle>
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
                            {formatSavedObjectTypeBadge(type)}
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
                          void handleRemoveItem(item.id);
                        }}
                        disabled={isRemoving}
                        aria-label={`Remove ${item.displayName} from collection`}
                      >
                        {isRemoving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="relative pt-0">
                    {item.notes ? (
                      <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{item.notes}</p>
                    ) : null}
                    {href ? (
                      <Link
                        href={href}
                        className="inline-flex items-center gap-1.5 text-sm text-primary transition-colors hover:text-primary/85"
                      >
                        Open details
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">No direct detail page available</span>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="mt-auto flex items-center justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="border-orange-300/30 bg-black/25 text-orange-100 hover:bg-orange-500/15"
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">Page {page}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!data.hasMore}
              onClick={() => setPage(page + 1)}
              className="border-orange-300/30 bg-black/25 text-orange-100 hover:bg-orange-500/15"
            >
              Next
            </Button>
          </div>
        </div>
      ) : (
        <Card tone={ACCOUNT_CARD_TONE} className="border-orange-300/20 bg-[#17100d]/80">
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">No items in this collection yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
