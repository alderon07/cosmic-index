"use client";

import { useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchSignals, fetchUnreadCount, mutateJson } from "@/components/observatory/api";
import { ObservatoryEmptyState, ObservatoryErrorState, ObservatoryLoadingState } from "@/components/observatory/observatory-states";
import { SignalCard } from "@/components/observatory/signal-card";
import type { ObservatorySignal, SignalsResponse } from "@/components/observatory/types";
import { cn } from "@/lib/utils";

type SignalFilter = "all" | "unread" | "read";

export function SignalsClient({ initialData, initialUnreadCount }: { initialData: SignalsResponse; initialUnreadCount: number }) {
  const [filter, setFilter] = useState<SignalFilter>("all");
  const queryClient = useQueryClient();
  const queryKey = ["user", "observatory", "signals", filter] as const;
  const signalsQuery = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchSignals(filter, pageParam),
    initialPageParam: undefined as string | undefined,
    initialData: filter === "all" ? { pages: [initialData], pageParams: [undefined] } : undefined,
    getNextPageParam: (page) => page.hasMore && page.nextCursor ? page.nextCursor : undefined,
    staleTime: 60_000,
  });
  const unreadQuery = useQuery({
    queryKey: ["user", "observatory", "signals", "unread-count"],
    queryFn: fetchUnreadCount,
    initialData: initialUnreadCount,
    staleTime: 60_000,
  });

  const refreshSignals = () => queryClient.invalidateQueries({ queryKey: ["user", "observatory", "signals"] });
  const readMutation = useMutation({
    mutationFn: (signal: ObservatorySignal) => mutateJson(`/api/user/signals/${signal.id}`, "PATCH", { read: signal.readAt === null }),
    onSuccess: refreshSignals,
  });
  const readAllMutation = useMutation({
    mutationFn: () => mutateJson("/api/user/signals/read-all", "POST", {}),
    onSuccess: refreshSignals,
  });

  if (signalsQuery.isPending) return <ObservatoryLoadingState label="Listening for signals…" />;
  if (signalsQuery.isError) return <ObservatoryErrorState onRetry={() => void signalsQuery.refetch()} />;

  const signals = signalsQuery.data.pages.flatMap((page) => page.signals);
  const unreadCount = unreadQuery.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-border/55 bg-card/55 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="Filter signals" className="grid grid-cols-3 gap-1 rounded-lg bg-black/20 p-1">
          {(["all", "unread", "read"] as const).map((option) => (
            <button key={option} type="button" aria-pressed={filter === option} onClick={() => setFilter(option)} className={cn("min-h-11 rounded-md px-3 font-mono text-xs uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-light/35", filter === option ? "bg-panel-bronze text-brass-light" : "text-muted-foreground hover:text-foreground")}>{option}</button>
          ))}
        </div>
        <Button type="button" variant="outline" size="lg" className="min-h-11" disabled={unreadCount === 0 || readAllMutation.isPending} onClick={() => readAllMutation.mutate()}><CheckCheck /> Mark all read</Button>
      </div>

      {readMutation.isError || readAllMutation.isError ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">That signal did not update. Please try again.</p> : null}

      {signals.length === 0 ? <ObservatoryEmptyState kind="signals" /> : (
        <section aria-label="Signal history" className="space-y-4">
          {signals.map((signal) => <SignalCard key={signal.id} signal={signal} onToggleRead={async (item) => { await readMutation.mutateAsync(item); }} isUpdating={readMutation.isPending} />)}
        </section>
      )}

      {signalsQuery.hasNextPage ? <div className="text-center"><Button type="button" variant="outline" size="lg" className="min-h-11" disabled={signalsQuery.isFetchingNextPage} onClick={() => void signalsQuery.fetchNextPage()}>{signalsQuery.isFetchingNextPage ? "Loading…" : "Show older signals"}</Button></div> : null}
    </div>
  );
}
