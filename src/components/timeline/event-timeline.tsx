"use client";

import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TimelineLegend } from "@/components/timeline/timeline-legend";
import { TimelineBucket } from "@/lib/timeline-buckets";
import { ObjectTheme, THEMES } from "@/lib/theme";
import { trackEvent } from "@/lib/analytics-events";
import { isDegradeModeEnabled, recordPerformanceSample } from "@/lib/performance-mode";
import { Activity } from "lucide-react";

const TIMELINE_BUDGET_MS = 200;

interface EventTimelineProps {
  title: string;
  pageType: "fireballs" | "close-approaches" | "space-weather";
  theme: ObjectTheme;
  buckets: TimelineBucket[];
  actionable?: boolean;
  onBucketClick?: (bucket: TimelineBucket) => void;
}

export function EventTimeline({
  title,
  pageType,
  theme,
  buckets,
  actionable = false,
  onBucketClick,
}: EventTimelineProps) {
  const themeConfig = THEMES[theme];
  const maxCount = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const totalCount = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const degradeMode = isDegradeModeEnabled("event-timeline");

  useEffect(() => {
    const start = performance.now();
    requestAnimationFrame(() => {
      recordPerformanceSample({
        component: "event-timeline",
        metric: "render",
        durationMs: performance.now() - start,
        budgetMs: TIMELINE_BUDGET_MS,
      });
    });
  }, [buckets.length, totalCount]);

  return (
    <Card className={`bg-card border-border/50 bezel ${degradeMode ? "" : "scanlines"} mb-6`}>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Activity className={`w-5 h-5 ${themeConfig.icon}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {buckets.length > 0 ? (
          <div className="space-y-4">
            <TimelineLegend totalEvents={totalCount} bucketCount={buckets.length} />
            <div className="grid grid-flow-col auto-cols-fr gap-1 min-h-28 items-end">
              {buckets.map((bucket) => {
                const percentage = Math.max(4, (bucket.count / maxCount) * 100);
                const barHeight = `${percentage}%`;
                const disabled = !actionable || bucket.count === 0;
                return (
                  <Tooltip key={`${bucket.startIso}-${bucket.endIso}`}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onMouseEnter={() => {
                          trackEvent("timeline_bucket_hover", {
                            pageType,
                            bucketStart: bucket.startIso,
                            bucketEnd: bucket.endIso,
                            count: bucket.count,
                          });
                        }}
                        onClick={() => {
                          trackEvent("timeline_bucket_click", {
                            pageType,
                            bucketStart: bucket.startIso,
                            bucketEnd: bucket.endIso,
                            count: bucket.count,
                            actionable: actionable && bucket.count > 0,
                          });
                          if (disabled || !onBucketClick) return;
                          onBucketClick(bucket);
                        }}
                        className={`relative rounded-sm border border-border/40 bg-muted/30 transition-colors focus:outline-none focus:ring-2 focus:ring-ring/60 ${
                          disabled ? "cursor-not-allowed opacity-70" : "hover:bg-muted/50"
                        }`}
                        aria-label={`${bucket.label}, ${bucket.count} events`}
                        aria-disabled={disabled}
                      >
                        <span
                          className={`absolute bottom-0 left-0 right-0 rounded-sm ${themeConfig.bg}`}
                          style={{ height: barHeight }}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-mono text-xs">{bucket.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {bucket.count} event{bucket.count === 1 ? "" : "s"}
                      </p>
                      {!actionable ? (
                        <p className="text-xs text-muted-foreground/80 mt-1">
                          Timeline click filtering is not available for this feed yet.
                        </p>
                      ) : null}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{buckets[0]?.label ?? ""}</span>
              <span>{buckets[buckets.length - 1]?.label ?? ""}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No timeline buckets are available for the current filter set.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
