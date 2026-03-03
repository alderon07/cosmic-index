"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, FolderPlus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/query-keys";

const HIGH_COLLECTION_WARNING_THRESHOLD = 50;
const MEMBERSHIP_ROW_ESTIMATE_PX = 54;
const MEMBERSHIP_OVERSCAN_ROWS = 6;
const MEMBERSHIP_VIRTUALIZATION_THRESHOLD = 30;

interface CollectionMembership {
  id: number;
  name: string;
  itemCount: number;
  isMember: boolean;
  updatedAt: string;
}

interface MembershipResponse {
  collections: CollectionMembership[];
  savedObjectId: number;
}

interface AddToCollectionDialogProps {
  savedObjectId: number;
  savedObjectName: string;
  onMembershipChange?: () => void;
}

class MembershipError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "MembershipError";
  }
}

async function fetchMemberships(savedObjectId: number): Promise<CollectionMembership[]> {
  const response = await fetch(`/api/user/saved-objects/${savedObjectId}/collections`);

  if (response.status === 401) {
    throw new MembershipError("Session expired. Please sign in again.", 401);
  }

  if (!response.ok) {
    throw new MembershipError("Could not load collections right now.", response.status);
  }

  const data = (await response.json()) as MembershipResponse;
  return Array.isArray(data.collections) ? data.collections : [];
}

export function AddToCollectionDialog({
  savedObjectId,
  savedObjectName,
  onMembershipChange,
}: AddToCollectionDialogProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingByCollectionId, setPendingByCollectionId] = useState<Record<number, boolean>>({});
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const [listScrollTop, setListScrollTop] = useState(0);
  const [listViewportHeight, setListViewportHeight] = useState(0);

  const membershipsQueryKey = queryKeys.savedObjectCollections(savedObjectId);

  const membershipsQuery = useQuery({
    queryKey: membershipsQueryKey,
    queryFn: () => fetchMemberships(savedObjectId),
    enabled: open,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const collections = useMemo(
    () => membershipsQuery.data ?? [],
    [membershipsQuery.data]
  );
  const isLoading = membershipsQuery.isLoading;

  useEffect(() => {
    if (!open) {
      setQuery("");
      setStatusMessage(null);
      setErrorMessage(null);
      setPendingByCollectionId({});
      return;
    }

    setStatusMessage(null);
    setErrorMessage(null);
  }, [open]);

  useEffect(() => {
    const error = membershipsQuery.error;
    if (!(error instanceof MembershipError)) return;

    if (error.status === 401) {
      setOpen(false);
      setErrorMessage("Session expired. Please sign in again.");
      return;
    }

    setErrorMessage(error.message);
  }, [membershipsQuery.error]);

  const filteredCollections = useMemo(() => {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery) return collections;
    return collections.filter((collection) =>
      collection.name.toLowerCase().includes(trimmedQuery)
    );
  }, [collections, query]);

  useEffect(() => {
    if (!open) return;
    const container = listContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setListScrollTop(container.scrollTop);
    };

    const updateMetrics = () => {
      setListViewportHeight(container.clientHeight);
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
  }, [open, filteredCollections.length]);

  useEffect(() => {
    if (!open) return;
    const container = listContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: 0 });
    setListScrollTop(0);
  }, [open, query]);

  const virtualizedMembershipList = useMemo(() => {
    const total = filteredCollections.length;
    const shouldVirtualize =
      total > MEMBERSHIP_VIRTUALIZATION_THRESHOLD && listViewportHeight > 0;

    if (!shouldVirtualize) {
      return {
        visibleCollections: filteredCollections,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
      };
    }

    const startRow = Math.max(
      0,
      Math.floor(listScrollTop / MEMBERSHIP_ROW_ESTIMATE_PX) - MEMBERSHIP_OVERSCAN_ROWS
    );
    const endRow = Math.min(
      total,
      Math.ceil((listScrollTop + listViewportHeight) / MEMBERSHIP_ROW_ESTIMATE_PX) +
        MEMBERSHIP_OVERSCAN_ROWS
    );

    return {
      visibleCollections: filteredCollections.slice(startRow, endRow),
      topSpacerHeight: startRow * MEMBERSHIP_ROW_ESTIMATE_PX,
      bottomSpacerHeight: Math.max(0, (total - endRow) * MEMBERSHIP_ROW_ESTIMATE_PX),
    };
  }, [filteredCollections, listScrollTop, listViewportHeight]);

  const applyMembershipUpdate = useCallback(
    async (collectionId: number, shouldAdd: boolean) => {
      const endpoint = `/api/user/collections/${collectionId}/items`;
      const requestInit = shouldAdd
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ savedObjectId }),
          }
        : {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ savedObjectId }),
          };

      const response = await fetch(endpoint, requestInit);
      if (response.status === 401) {
        setOpen(false);
        throw new Error("Session expired. Please sign in again.");
      }

      if (!response.ok) {
        if (shouldAdd && response.status === 409) return;
        if (!shouldAdd && response.status === 404) return;
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message || "Could not update collection membership.");
      }
    },
    [savedObjectId]
  );

  const handleToggleMembership = useCallback(
    async (collection: CollectionMembership) => {
      if (pendingByCollectionId[collection.id]) return;

      setStatusMessage(null);
      setErrorMessage(null);

      const shouldAdd = !collection.isMember;

      setPendingByCollectionId((previous) => ({ ...previous, [collection.id]: true }));

      const previousCollections = queryClient.getQueryData<CollectionMembership[]>(membershipsQueryKey) ?? [];

      queryClient.setQueryData<CollectionMembership[]>(
        membershipsQueryKey,
        previousCollections.map((entry) =>
          entry.id === collection.id
            ? {
                ...entry,
                isMember: shouldAdd,
                itemCount: Math.max(0, entry.itemCount + (shouldAdd ? 1 : -1)),
                updatedAt: new Date().toISOString(),
              }
            : entry
        )
      );

      try {
        await applyMembershipUpdate(collection.id, shouldAdd);

        setStatusMessage(
          shouldAdd
            ? `"${savedObjectName}" added to "${collection.name}".`
            : `"${savedObjectName}" removed from "${collection.name}".`
        );

        onMembershipChange?.();

        void queryClient.invalidateQueries({ queryKey: membershipsQueryKey });
        void queryClient.invalidateQueries({ queryKey: queryKeys.collections() });
        void queryClient.invalidateQueries({ queryKey: queryKeys.savedObjects(100) });
        void queryClient.invalidateQueries({ queryKey: ["user", "collection-detail", collection.id] });
      } catch (error) {
        queryClient.setQueryData(membershipsQueryKey, previousCollections);

        setErrorMessage(
          error instanceof Error ? error.message : "Could not update collection membership."
        );
      } finally {
        setPendingByCollectionId((previous) => ({ ...previous, [collection.id]: false }));
      }
    },
    [applyMembershipUpdate, membershipsQueryKey, onMembershipChange, pendingByCollectionId, queryClient, savedObjectName]
  );

  const handleCreateCollection = useCallback(async () => {
    const trimmedName = newCollectionName.trim();
    if (!trimmedName || isCreatingCollection) return;

    setIsCreatingCollection(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const createResponse = await fetch("/api/user/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: newCollectionDescription.trim() || undefined,
        }),
      });

      if (createResponse.status === 401) {
        setOpen(false);
        throw new Error("Session expired. Please sign in again.");
      }

      if (!createResponse.ok) {
        const body = (await createResponse.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message || "Could not create collection.");
      }

      const created = (await createResponse.json()) as { id: number; name: string };
      await applyMembershipUpdate(created.id, true);

      const now = new Date().toISOString();
      queryClient.setQueryData<CollectionMembership[]>(
        membershipsQueryKey,
        (previous = []) => [
          {
            id: created.id,
            name: created.name,
            itemCount: 1,
            isMember: true,
            updatedAt: now,
          },
          ...previous,
        ]
      );

      setNewCollectionName("");
      setNewCollectionDescription("");
      setStatusMessage(`Created "${created.name}" and added "${savedObjectName}".`);
      onMembershipChange?.();

      void queryClient.invalidateQueries({ queryKey: queryKeys.collections() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.savedObjects(100) });
      void queryClient.invalidateQueries({ queryKey: membershipsQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["user", "collection-detail", created.id] });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not create collection.");
    } finally {
      setIsCreatingCollection(false);
    }
  }, [
    applyMembershipUpdate,
    isCreatingCollection,
    membershipsQueryKey,
    newCollectionDescription,
    newCollectionName,
    onMembershipChange,
    queryClient,
    savedObjectName,
  ]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="border-orange-300/30 bg-black/25 text-orange-100 hover:bg-orange-500/15"
          aria-label={`Manage collections for ${savedObjectName}`}
          title="Manage collections"
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80dvh] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Manage Collections</DialogTitle>
          <DialogDescription>
            Organize <span className="text-foreground">{savedObjectName}</span> into one or more
            collections.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {collections.length >= HIGH_COLLECTION_WARNING_THRESHOLD ? (
            <div className="rounded-md border border-amber-glow/35 bg-amber-glow/10 px-3 py-2 text-xs text-amber-glow">
              You have many collections. Use search to find one faster.
            </div>
          ) : null}

          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search collections..."
          />

          <div ref={listContainerRef} className="max-h-[38dvh] space-y-2 overflow-y-auto pr-1">
            {isLoading ? (
              <>
                <Skeleton className="h-12 w-full rounded-md" />
                <Skeleton className="h-12 w-full rounded-md" />
                <Skeleton className="h-12 w-full rounded-md" />
              </>
            ) : filteredCollections.length > 0 ? (
              <>
                {virtualizedMembershipList.topSpacerHeight > 0 ? (
                  <div style={{ height: virtualizedMembershipList.topSpacerHeight }} aria-hidden />
                ) : null}
                {virtualizedMembershipList.visibleCollections.map((collection) => {
                const isPending = pendingByCollectionId[collection.id] === true;
                return (
                  <label
                    key={collection.id}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border/60 bg-card/65 px-3 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Checkbox
                        checked={collection.isMember}
                        disabled={isPending || isCreatingCollection}
                        onChange={() => {
                          void handleToggleMembership(collection);
                        }}
                        aria-label={`Toggle ${collection.name}`}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{collection.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Updated {new Date(collection.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                        {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
                      </Badge>
                      {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      ) : collection.isMember ? (
                        <Check className="h-3.5 w-3.5 text-uranium-green" />
                      ) : null}
                    </div>
                  </label>
                );
              })}
                {virtualizedMembershipList.bottomSpacerHeight > 0 ? (
                  <div style={{ height: virtualizedMembershipList.bottomSpacerHeight }} aria-hidden />
                ) : null}
              </>
            ) : (
              <p className="rounded-md border border-dashed border-border/65 px-3 py-4 text-center text-sm text-muted-foreground">
                {collections.length === 0
                  ? "No collections yet. Create one below."
                  : "No collections match your search."}
              </p>
            )}
          </div>

          <div className="space-y-2 rounded-md border border-border/60 bg-card/55 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Create Collection
            </p>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                value={newCollectionName}
                onChange={(event) => setNewCollectionName(event.target.value)}
                placeholder="Collection name"
                maxLength={100}
              />
              <Input
                value={newCollectionDescription}
                onChange={(event) => setNewCollectionDescription(event.target.value)}
                placeholder="Description (optional)"
                maxLength={500}
              />
              <Button
                type="button"
                className="sm:self-start"
                onClick={() => {
                  void handleCreateCollection();
                }}
                disabled={isCreatingCollection || !newCollectionName.trim()}
              >
                {isCreatingCollection ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </div>

          <div aria-live="polite" className="min-h-5 text-xs">
            {errorMessage ? <p className="text-destructive">{errorMessage}</p> : null}
            {!errorMessage && statusMessage ? (
              <p className="text-uranium-green">{statusMessage}</p>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
