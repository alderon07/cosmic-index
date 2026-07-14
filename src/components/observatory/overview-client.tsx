"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Eye, RadioTower, Telescope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchSignals, fetchUnreadCount, fetchWatches, mutateJson } from "@/components/observatory/api";
import { ObservatoryErrorState, ObservatoryLoadingState } from "@/components/observatory/observatory-states";
import { SignalCard } from "@/components/observatory/signal-card";
import type { ObservatorySignal, SignalsResponse, WatchesResponse } from "@/components/observatory/types";
import type { ObservatoryHealth } from "@/lib/observatory-health";

export function horizonBucket(signal: ObservatorySignal, now: number): "Now" | "Next 24 hours" | "Next 7 days" | null {
  const eventTime = new Date(signal.eventAt ?? signal.createdAt).getTime();
  if (!Number.isFinite(eventTime)) return null;
  const delta = eventTime - now;
  if (delta < -24 * 60 * 60 * 1000) return null;
  if (delta <= 0) return "Now";
  if (delta <= 24 * 60 * 60 * 1000) return "Next 24 hours";
  if (delta <= 7 * 24 * 60 * 60 * 1000) return "Next 7 days";
  return null;
}

export function OverviewClient({ initialWatches, initialSignals, initialUnreadCount, renderedAt, health }: {
  initialWatches: WatchesResponse;
  initialSignals: SignalsResponse;
  initialUnreadCount: number;
  renderedAt: string;
  health: ObservatoryHealth;
}) {
  const queryClient = useQueryClient();
  const watchesQuery = useQuery({ queryKey: ["user", "observatory", "watches", "overview"], queryFn: () => fetchWatches(), initialData: initialWatches, staleTime: 60_000 });
  const signalsQuery = useQuery({ queryKey: ["user", "observatory", "signals", "overview"], queryFn: () => fetchSignals("all"), initialData: initialSignals, staleTime: 60_000 });
  const unreadQuery = useQuery({
    queryKey: ["user", "observatory", "signals", "unread-count"],
    queryFn: fetchUnreadCount,
    initialData: initialUnreadCount,
    staleTime: 60_000,
  });
  const readMutation = useMutation({
    mutationFn: (signal: ObservatorySignal) => mutateJson(`/api/user/signals/${signal.id}`, "PATCH", { read: signal.readAt === null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user", "observatory", "signals"] }),
  });

  if (watchesQuery.isPending || signalsQuery.isPending) return <ObservatoryLoadingState />;
  if (watchesQuery.isError || signalsQuery.isError) return <ObservatoryErrorState onRetry={() => { void watchesQuery.refetch(); void signalsQuery.refetch(); }} />;

  const watches = watchesQuery.data.alerts;
  const usage = watchesQuery.data.usage;
  const signals = signalsQuery.data.signals;
  const unread = unreadQuery.data;
  const latestSignal = signals[0];
  const active = watches.reduce((total, watch) => total + (watch.enabled ? 1 : 0), 0);

  return (
    <div className="space-y-6">
      <section aria-label="Observatory status" className="grid gap-3 sm:grid-cols-3">
        <StatusCard icon={RadioTower} label="New signals" value={unread} accent="text-reactor-orange" />
        <StatusCard icon={Telescope} label="Watches running" value={active} accent="text-radium-teal" />
        <StatusCard icon={Eye} label="Watch spots used" value={`${usage.current}/${usage.limit}`} accent="text-aurora-violet" />
      </section>

      <section aria-labelledby="horizon-title" className="overflow-hidden rounded-xl border border-border/55 bg-[#15100d]/80 p-5 scanlines sm:p-6">
        <div className="relative z-20 flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-reactor-orange">Your sky at a glance</p>
            <h2 id="horizon-title" className="mt-1 font-display text-lg text-orange-100">Signal Horizon</h2>
          </div>
          <EvaluatorHealth health={health} />
        </div>
        <div className="relative z-20 mt-6 grid gap-3 md:grid-cols-3">
          {(["Now", "Next 24 hours", "Next 7 days"] as const).map((bucket) => {
            const match = signals.find((signal) => horizonBucket(signal, Date.parse(renderedAt)) === bucket);
            return (
              <div key={bucket} className="min-h-28 rounded-lg border border-border/45 bg-black/20 p-4">
                <p className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">{bucket}</p>
                {match ? <><p className="mt-3 line-clamp-2 font-display text-sm leading-5 text-foreground">{match.title}</p><p className="mt-2 text-xs text-muted-foreground">{match.watchName}</p></> : <p className="mt-3 text-sm text-muted-foreground">All quiet here.</p>}
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section aria-labelledby="latest-signal-title">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 id="latest-signal-title" className="font-display text-lg text-orange-100">Latest signal</h2>
            <Link href="/user/observatory/signals" className="flex min-h-11 items-center gap-1 text-sm text-reactor-orange hover:underline">All signals <ArrowRight className="size-4" /></Link>
          </div>
          {latestSignal ? <SignalCard signal={latestSignal} onToggleRead={async (signal) => { await readMutation.mutateAsync(signal); }} isUpdating={readMutation.isPending} /> : <Card className="border-dashed bg-black/10"><CardContent className="py-8 text-center text-sm text-muted-foreground">No signals yet. We will put the newest one here.</CardContent></Card>}
        </section>

        <section aria-labelledby="your-watches-title">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 id="your-watches-title" className="font-display text-lg text-orange-100">Your watches</h2>
            <Link href="/user/observatory/watches" className="flex min-h-11 items-center gap-1 text-sm text-reactor-orange hover:underline">Manage <ArrowRight className="size-4" /></Link>
          </div>
          <Card className="h-[calc(100%-3.5rem)] bg-black/10">
            <CardContent>
              {watches.length ? <ul className="space-y-3">{watches.slice(0, 3).map((watch) => <li key={watch.id} className="flex items-center gap-3 rounded-lg border border-border/40 bg-black/15 p-3"><span className={`size-2 rounded-full ${watch.enabled ? "bg-radium-teal" : "bg-muted-foreground"}`} /><span className="min-w-0 flex-1 truncate text-sm text-foreground">{watch.name}</span><span className="text-xs text-muted-foreground">{watch.enabled ? "Watching" : "Paused"}</span></li>)}</ul> : <div className="py-6 text-center"><Telescope aria-hidden="true" className="mx-auto size-7 text-muted-foreground" /><p className="mt-3 text-sm text-muted-foreground">Nothing is being watched yet.</p><Button asChild size="lg" className="mt-5 min-h-11"><Link href="/user/observatory/watches">Make a watch</Link></Button></div>}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

function EvaluatorHealth({ health }: { health: ObservatoryHealth }) {
  const presentation = health.status === "healthy"
    ? { label: "Watching normally", tone: "text-radium-teal", dot: "bg-radium-teal shadow-[0_0_8px_rgba(61,219,217,0.75)]" }
    : health.status === "delayed"
      ? { label: "Updates delayed", tone: "text-reactor-orange", dot: "bg-reactor-orange" }
      : { label: "Starting up", tone: "text-muted-foreground", dot: "bg-muted-foreground" };

  return (
    <span
      className={`flex items-center gap-2 text-right font-mono text-[0.65rem] uppercase tracking-wider ${presentation.tone}`}
      title={health.lastCheckedAt ? `Last successful check: ${health.lastCheckedAt}` : "No successful checks recorded yet"}
    >
      <span className={`size-2 shrink-0 rounded-full ${presentation.dot}`} />
      {presentation.label}
    </span>
  );
}

function StatusCard({ icon: Icon, label, value, accent }: { icon: typeof Eye; label: string; value: string | number; accent: string }) {
  return (
    <Card className="py-4">
      <CardContent className="flex items-center gap-4">
        <Icon aria-hidden="true" className={`size-6 ${accent}`} />
        <div><p className="font-display text-2xl text-orange-100">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
      </CardContent>
    </Card>
  );
}
