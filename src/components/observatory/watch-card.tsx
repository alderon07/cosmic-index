"use client";

import type { ReactNode } from "react";
import { Activity, Orbit, Pause, Play, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ObservatoryWatch } from "@/components/observatory/types";

function describeWatch(watch: ObservatoryWatch): string {
  if (watch.alertType === "space_weather" && "categories" in watch.config) {
    const category = watch.config.categories.length > 1 ? "space weather" : ({ flr: "solar flares", cme: "solar eruptions", gst: "geomagnetic storms", sep: "particle events" } as Record<string, string>)[watch.config.categories[0]] ?? "space weather";
    return `${watch.config.minimumSeverity[0].toUpperCase()}${watch.config.minimumSeverity.slice(1)} or greater ${category}.`;
  }
  if ("maxDistanceLd" in watch.config) {
    return `Objects within ${watch.config.maxDistanceLd} Moon distances during the next ${watch.config.leadTimeDays} days${watch.config.phaOnly ? ", potentially hazardous only" : ""}.`;
  }
  return "Monitoring rule";
}

export function WatchCard({ watch, onToggle, onDelete, isUpdating, editControl }: {
  watch: ObservatoryWatch;
  onToggle: (watch: ObservatoryWatch) => void;
  onDelete: (watch: ObservatoryWatch) => void;
  isUpdating: boolean;
  editControl?: ReactNode;
}) {
  const Icon = watch.alertType === "space_weather" ? Activity : Orbit;
  return (
    <Card className={watch.enabled ? (watch.alertType === "space_weather" ? "border-aurora-violet/30" : "border-radium-teal/30") : "opacity-75"}>
      <CardContent>
        <article>
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full border border-border/60 bg-black/20"><Icon aria-hidden="true" className={watch.alertType === "space_weather" ? "size-5 text-aurora-violet" : "size-5 text-radium-teal"} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-base text-orange-100">{watch.name}</h2>
                <Badge variant="outline" className={watch.enabled ? "border-radium-teal/35 text-radium-teal" : "border-border text-muted-foreground"}>{watch.enabled ? "Watching" : "Paused"}</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{describeWatch(watch)}</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-border/40 pt-4">
            {editControl}
            <Button type="button" variant="outline" size="lg" disabled={isUpdating} onClick={() => onToggle(watch)} className="min-h-11 sm:min-h-0">{watch.enabled ? <><Pause /> Pause</> : <><Play /> Start</>}</Button>
            <Button type="button" variant="ghost" size="lg" disabled={isUpdating} onClick={() => onDelete(watch)} className="min-h-11 text-muted-foreground hover:text-destructive sm:min-h-0"><Trash2 /> Delete</Button>
          </div>
        </article>
      </CardContent>
    </Card>
  );
}
