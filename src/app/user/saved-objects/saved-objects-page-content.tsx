"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bookmark, Trash2, FolderHeart, Loader2, RefreshCw } from "lucide-react";
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

interface SavedObjectItem {
  id: number;
  canonicalId: string;
  displayName: string;
  notes: string | null;
  createdAt: string;
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

export function SavedObjectsPageContent() {
  const auth = useAppAuth();
  const [items, setItems] = useState<SavedObjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<SavedObjectFilter>("all");

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/saved-objects?page=1&limit=100");
      if (!response.ok) {
        throw new Error("Failed to load saved objects");
      }

      const data = await response.json();
      setItems(Array.isArray(data.objects) ? data.objects : []);
    } catch (error) {
      console.error(error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

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

  const filteredItems = useMemo(() => {
    if (selectedType === "all") return sortedItems;
    return sortedItems.filter(
      (item) => getSavedObjectType(item.canonicalId) === selectedType
    );
  }, [selectedType, sortedItems]);

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

  useEffect(() => {
    if (selectedType === "all") return;
    if (typeCounts[selectedType] > 0) return;
    setSelectedType("all");
  }, [selectedType, typeCounts]);

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
    void loadItems();
  }, [isLoading, loadItems]);

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

      try {
        const response = await fetch(`/api/user/saved-objects/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to remove saved object");
        }

        setItems((previous) => previous.filter((item) => item.id !== id));
      } catch (error) {
        console.error(error);
      }
    },
    []
  );

  if (!auth.isSignedIn) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-12">
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
          {sortedItems.length} total saved
        </p>
      </div>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-orange-300/30 bg-black/25 text-orange-100 hover:bg-orange-500/15"
          onClick={refreshItems}
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {isLoading ? "Refreshing..." : "Refresh"}
        </Button>
        <ExportButton category="saved-objects" />
      </div>
    </div>
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
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
                  const isActive = selectedType === option.value;
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
              <div className="max-h-[64dvh] overflow-y-auto pr-1 overscroll-contain md:max-h-[68dvh]">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground/90">
                    {selectedType === "all" ? "All saved objects" : SAVED_OBJECT_TYPE_LABELS[selectedType]}
                  </span>
                  <Badge
                    variant="outline"
                    className="border-orange-300/30 bg-black/20 text-[10px] uppercase tracking-wider text-orange-100"
                  >
                    {filteredItems.length} {filteredItems.length === 1 ? "item" : "items"}
                  </Badge>
                </div>

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {filteredItems.map((item) => {
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
                          <AddToCollectionDialog
                            savedObjectId={item.id}
                            savedObjectName={item.displayName}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
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
