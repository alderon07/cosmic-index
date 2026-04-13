"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { formatRelativeTime } from "@/lib/space-weather/format";

interface DataFreshnessBadgeProps {
  generatedAt: string | null | undefined;
  isFetching?: boolean;
}

export function DataFreshnessBadge({
  generatedAt,
  isFetching,
}: DataFreshnessBadgeProps) {
  const [label, setLabel] = useState(() => formatRelativeTime(generatedAt));

  useEffect(() => {
    setLabel(formatRelativeTime(generatedAt));
    const interval = setInterval(() => {
      setLabel(formatRelativeTime(generatedAt));
    }, 15_000);
    return () => clearInterval(interval);
  }, [generatedAt]);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-black/15 px-3 py-1.5 text-xs text-muted-foreground/80">
      <RefreshCw
        className={`h-3 w-3 ${isFetching ? "animate-spin text-aurora-violet" : ""}`}
      />
      {isFetching ? "Refreshing..." : `Updated ${label}`}
    </span>
  );
}
