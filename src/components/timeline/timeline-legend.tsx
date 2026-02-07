"use client";

interface TimelineLegendProps {
  totalEvents: number;
  bucketCount: number;
}

export function TimelineLegend({ totalEvents, bucketCount }: TimelineLegendProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span>
        Events: <span className="font-mono text-foreground">{totalEvents}</span>
      </span>
      <span>
        Buckets: <span className="font-mono text-foreground">{bucketCount}</span>
      </span>
      <span>UTC timeline bins</span>
    </div>
  );
}
