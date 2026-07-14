"use client";

import { useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fetchWatches, mutateJson, ObservatoryApiError } from "@/components/observatory/api";
import { ObservatoryEmptyState, ObservatoryErrorState, ObservatoryLoadingState } from "@/components/observatory/observatory-states";
import { WatchBuilder, watchToBuilderState } from "@/components/observatory/watch-builder";
import { WatchCard } from "@/components/observatory/watch-card";
import type { ObservatoryWatch, WatchesResponse } from "@/components/observatory/types";

const WATCHES_KEY = ["user", "observatory", "watches", "pages"] as const;
const WATCHES_ROOT_KEY = ["user", "observatory", "watches"] as const;

export function WatchesClient({ initialData }: { initialData: WatchesResponse }) {
  const queryClient = useQueryClient();
  const [watchToDelete, setWatchToDelete] = useState<ObservatoryWatch | null>(null);
  const watchesQuery = useInfiniteQuery({
    queryKey: WATCHES_KEY,
    queryFn: ({ pageParam }) => fetchWatches(pageParam),
    initialPageParam: undefined as string | undefined,
    initialData: { pages: [initialData], pageParams: [undefined] },
    getNextPageParam: (page) => page.hasMore && page.nextCursor ? page.nextCursor : undefined,
    staleTime: 60_000,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: WATCHES_ROOT_KEY });

  const createWatch = useMutation({
    mutationFn: (payload: Parameters<typeof mutateJson>[2]) => mutateJson("/api/user/alerts", "POST", payload),
    onSuccess: refresh,
  });
  const updateWatch = useMutation({
    mutationFn: ({ watch, patch }: { watch: ObservatoryWatch; patch: Record<string, unknown> }) => mutateJson(`/api/user/alerts/${watch.id}`, "PATCH", { ...patch, expectedUpdatedAt: watch.updatedAt }),
    onSuccess: refresh,
  });
  const deleteWatch = useMutation({
    mutationFn: (watch: ObservatoryWatch) => mutateJson(`/api/user/alerts/${watch.id}`, "DELETE"),
    onSuccess: refresh,
  });

  if (watchesQuery.isPending) return <ObservatoryLoadingState label="Finding your watches…" />;
  if (watchesQuery.isError) return <ObservatoryErrorState onRetry={() => void watchesQuery.refetch()} />;

  const alerts = watchesQuery.data.pages.flatMap((page) => page.alerts);
  const usage = watchesQuery.data.pages[0]?.usage ?? initialData.usage;
  const atLimit = usage.remaining === 0;
  const mutationError = createWatch.error ?? updateWatch.error ?? deleteWatch.error;

  const makeButton = (
    <Button size="lg" disabled={atLimit} className="min-h-11">
      <Plus /> Make a watch
    </Button>
  );

  return (
    <div className="space-y-5">
      <section aria-labelledby="watch-usage-title" className="flex flex-col gap-4 rounded-xl border border-border/55 bg-card/55 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p id="watch-usage-title" className="font-mono text-xs uppercase tracking-widest text-reactor-orange">Watch slots</p>
          <p className="mt-1 text-sm text-muted-foreground"><strong className="font-display text-lg text-orange-100">{usage.current}</strong> of {usage.limit} used</p>
        </div>
        <WatchBuilder disabled={atLimit} trigger={makeButton} onCreate={async (payload) => { await createWatch.mutateAsync(payload); }} />
      </section>

      {atLimit ? (
        <Card className="border-reactor-orange/30 bg-reactor-orange/5 py-4">
          <CardContent>
            <p className="text-sm text-foreground"><strong>Your watch spot is full.</strong> Pause keeps your spot; delete a watch to make a new one.</p>
          </CardContent>
        </Card>
      ) : null}

      {mutationError ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {mutationError instanceof ObservatoryApiError ? mutationError.message : "That change did not work. Please try again."}
        </p>
      ) : null}

      {alerts.length === 0 ? (
        <ObservatoryEmptyState kind="watches" action={<WatchBuilder trigger={<Button size="lg" className="min-h-11"><Plus /> Make my first watch</Button>} onCreate={async (payload) => { await createWatch.mutateAsync(payload); }} />} />
      ) : (
        <section aria-label="Your watches" className="grid gap-4 lg:grid-cols-2">
          {alerts.map((watch) => (
            <WatchCard
              key={watch.id}
              watch={watch}
              isUpdating={updateWatch.isPending || deleteWatch.isPending}
              onToggle={(item) => updateWatch.mutate({ watch: item, patch: { enabled: !item.enabled } })}
              onDelete={setWatchToDelete}
              editControl={
                <WatchBuilder
                  title="Edit watch"
                  submitLabel="Save changes"
                  initialState={watchToBuilderState(watch)}
                  trigger={<Button type="button" variant="outline" size="lg" className="min-h-11 sm:min-h-0"><Pencil /> Edit</Button>}
                  onCreate={async (payload) => { await updateWatch.mutateAsync({ watch, patch: { name: payload.name, config: payload.config } }); }}
                />
              }
            />
          ))}
        </section>
      )}

      {watchesQuery.hasNextPage ? (
        <div className="text-center">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-11"
            disabled={watchesQuery.isFetchingNextPage}
            onClick={() => void watchesQuery.fetchNextPage()}
          >
            {watchesQuery.isFetchingNextPage ? "Loading…" : "Show more watches"}
          </Button>
        </div>
      ) : null}

      <Dialog open={watchToDelete !== null} onOpenChange={(open) => { if (!open) setWatchToDelete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-orange-100">Delete this watch?</DialogTitle>
            <DialogDescription>
              {watchToDelete ? `“${watchToDelete.name}” will stop watching. Its old signals will stay in your history.` : "This watch will stop."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" size="lg" onClick={() => setWatchToDelete(null)}>Keep watch</Button>
            <Button type="button" variant="destructive" size="lg" disabled={!watchToDelete || deleteWatch.isPending} onClick={async () => { if (!watchToDelete) return; await deleteWatch.mutateAsync(watchToDelete); setWatchToDelete(null); }}><Trash2 /> {deleteWatch.isPending ? "Deleting…" : "Delete watch"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
