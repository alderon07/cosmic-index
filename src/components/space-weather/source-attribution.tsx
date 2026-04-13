import type { SpaceWeatherSourceMeta } from "@/lib/types";
import { formatSpaceWeatherTimestamp } from "@/lib/space-weather/format";
import { ExternalLink } from "lucide-react";

interface SourceAttributionProps {
  source: SpaceWeatherSourceMeta;
  className?: string;
}

export function SourceAttribution({ source, className }: SourceAttributionProps) {
  return (
    <div className={`space-y-1.5 text-xs text-muted-foreground/70 ${className ?? ""}`}>
      <div className="flex items-center gap-2">
        <span className="font-medium text-muted-foreground/85">{source.label}</span>
        <span className="rounded-full border border-border/30 px-1.5 py-0.5 text-[10px] capitalize">
          {source.quality}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5">
        <span>Observed: {formatSpaceWeatherTimestamp(source.observedAt)}</span>
        <span>Fetched: {formatSpaceWeatherTimestamp(source.fetchedAt)}</span>
      </div>
      {source.sourceUrl ? (
        <a
          href={source.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-aurora-violet underline-offset-4 transition-colors hover:underline"
        >
          <ExternalLink className="h-3 w-3" />
          View upstream source
        </a>
      ) : null}
    </div>
  );
}
