"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { ArrowUpRight, Check, Circle, RadioTower } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ObservatorySignal } from "@/components/observatory/types";
import { cn } from "@/lib/utils";

const severityTone = {
  notable: "border-radium-teal/40 bg-radium-teal/5 text-radium-teal",
  minor: "border-border text-muted-foreground",
  moderate: "border-radium-teal/45 bg-radium-teal/10 text-radium-teal",
  strong: "border-aurora-violet/45 bg-aurora-violet/10 text-aurora-violet",
  severe: "border-reactor-orange/55 bg-reactor-orange/10 text-reactor-orange",
  extreme: "border-destructive/55 bg-destructive/10 text-destructive",
} as const;

function formatDate(value: string | null | undefined): string {
  if (!value) return "Time unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unknown";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(date) + " UTC";
}

export function SignalCard({ signal, onToggleRead, isUpdating }: {
  signal: ObservatorySignal;
  onToggleRead: (signal: ObservatorySignal) => Promise<void> | void;
  isUpdating: boolean;
}) {
  const isUnread = signal.readAt === null;

  async function openSignal(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (isUnread) await onToggleRead(signal);
    window.location.assign(signal.destinationUrl);
  }

  return (
    <Card className={cn("overflow-hidden py-0 [content-visibility:auto] [contain-intrinsic-size:auto_320px]", isUnread ? "border-reactor-orange/35" : "opacity-85")}>
      <CardContent className="p-0">
        <article className="relative p-4 sm:p-5">
          {isUnread ? <span className="absolute left-0 top-5 h-9 w-1 rounded-r-full bg-reactor-orange shadow-[0_0_12px_rgba(255,116,72,0.7)]" /> : null}
          <div className="flex flex-wrap items-center gap-2 pl-2">
            <Badge variant="outline" className={severityTone[signal.severity]}>
              <RadioTower aria-hidden="true" className="size-3" />
              {signal.severity[0].toUpperCase() + signal.severity.slice(1)}
            </Badge>
            {isUnread ? <span className="font-mono text-[0.65rem] uppercase tracking-widest text-reactor-orange">New signal</span> : <span className="font-mono text-[0.65rem] uppercase tracking-widest text-muted-foreground">Read</span>}
            <time className="ml-auto font-mono text-[0.68rem] text-muted-foreground" dateTime={signal.eventAt ?? signal.createdAt}>{formatDate(signal.eventAt ?? signal.createdAt)}</time>
          </div>
          <div className="mt-4 pl-2">
            <h2 className="font-display text-base leading-6 text-orange-100 sm:text-lg">{signal.title}</h2>
            <p className="mt-2 text-sm leading-6 text-foreground/80">{signal.summary}</p>
            <div className="mt-4 rounded-lg border border-border/45 bg-black/15 p-3">
              <p className="font-mono text-[0.65rem] uppercase tracking-wider text-radium-teal">Why you got this</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{signal.matchReason}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 pl-2 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="min-h-11 sm:min-h-0"><a href={signal.destinationUrl} onClick={openSignal}>See what happened <ArrowUpRight /></a></Button>
            <Button type="button" size="lg" variant="ghost" disabled={isUpdating} onClick={() => void onToggleRead(signal)} className="min-h-11 sm:min-h-0">
              {isUnread ? <><Check /> Mark read</> : <><Circle /> Mark unread</>}
            </Button>
            {signal.sourceUrl ? <Button asChild size="lg" variant="link" className="min-h-11 sm:ml-auto sm:min-h-0"><Link href={signal.sourceUrl} target="_blank" rel="noopener noreferrer">{signal.sourceLabel}<ArrowUpRight /></Link></Button> : null}
          </div>
        </article>
      </CardContent>
    </Card>
  );
}
