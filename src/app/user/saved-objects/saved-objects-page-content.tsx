"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, Trash2, FolderHeart, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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

  const groupedItems = useMemo(() => {
    const grouped = new Map<SavedObjectType, SavedObjectItem[]>(
      SAVED_OBJECT_TYPE_ORDER.map((type) => [type, []])
    );

    for (const item of filteredItems) {
      const type = getSavedObjectType(item.canonicalId);
      grouped.get(type)?.push(item);
    }

    return SAVED_OBJECT_TYPE_ORDER.map((type) => ({
      type,
      label: SAVED_OBJECT_TYPE_LABELS[type],
      items: grouped.get(type) ?? [],
    })).filter((group) => group.items.length > 0);
  }, [filteredItems]);

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
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Card tone={ACCOUNT_CARD_TONE}>
          <CardContent className="py-10 text-center">
            <FolderHeart className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Sign in to view your saved objects.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground">Saved Objects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Catalog objects and events you&apos;ve bookmarked
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <ExportButton category="saved-objects" />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
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
        </div>
      </div>

      {isLoading ? (
        <Card tone={ACCOUNT_CARD_TONE}>
          <CardContent className="py-10 text-center text-muted-foreground">
            Loading saved objects...
          </CardContent>
        </Card>
      ) : !hasItems ? (
        <Card tone={ACCOUNT_CARD_TONE}>
          <CardContent className="py-10 text-center">
            <Bookmark className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No saved objects yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/90">
              Filter
            </span>
            {filterOptions.map((option) => {
              const isActive = selectedType === option.value;
              return (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  className="h-8 gap-2"
                  onClick={() => setSelectedType(option.value)}
                >
                  {option.label}
                  <Badge variant={isActive ? "secondary" : "outline"} className="text-[10px]">
                    {option.count}
                  </Badge>
                </Button>
              );
            })}
          </div>

          {groupedItems.length > 0 ? (
            <div className="max-h-[60dvh] overflow-y-auto pr-1 overscroll-contain md:max-h-[62dvh]">
              <Accordion
                key={selectedType}
                type="multiple"
                defaultValue={groupedItems.map((group) => group.type)}
                className="space-y-3"
              >
                {groupedItems.map((group) => (
                  <AccordionItem
                    key={group.type}
                    value={group.type}
                    className="overflow-hidden rounded-xl border border-border/60 bg-card/92 px-5"
                  >
                    <AccordionTrigger className="py-4 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-semibold">{group.label}</span>
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                          {group.items.length} {group.items.length === 1 ? "item" : "items"}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 data-[state=closed]:animate-none data-[state=open]:animate-none">
                      <div className="grid gap-3 md:grid-cols-2">
                        {group.items.map((item) => {
                          const itemType = getSavedObjectType(item.canonicalId);
                          const href = resolveSavedObjectHref(item.canonicalId);
                          return (
                            <div
                              key={item.id}
                              className="rounded-xl border border-border/50 bg-card/70 p-4 shadow-sm"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-base font-semibold text-foreground">{item.displayName}</p>
                                  <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
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
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              {item.notes ? (
                                <p className="mt-3 text-sm text-muted-foreground">{item.notes}</p>
                              ) : null}

                              <div className="mt-3 flex flex-wrap items-center gap-3">
                                {href ? (
                                  <Link href={href} className="text-sm text-primary hover:underline">
                                    Open details
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
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ) : (
            <Card tone={ACCOUNT_CARD_TONE}>
              <CardContent className="py-8 text-center text-muted-foreground">
                No saved objects match this filter.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
