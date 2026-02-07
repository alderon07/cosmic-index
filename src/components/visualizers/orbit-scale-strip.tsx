"use client";

interface OrbitScaleStripProps {
  label: string;
  markerLabel: string;
  markerPercent?: number | null;
  accentClassName: string;
  startLabel: string;
  endLabel: string;
}

function clampPercent(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export function OrbitScaleStrip({
  label,
  markerLabel,
  markerPercent,
  accentClassName,
  startLabel,
  endLabel,
}: OrbitScaleStripProps) {
  const hasValue = markerPercent != null;
  const normalizedPercent = hasValue ? clampPercent(markerPercent) : 0;
  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`font-mono text-sm ${hasValue ? "text-foreground" : "text-muted-foreground"}`}>
          {markerLabel}
        </p>
      </div>
      <div className="relative mt-3 h-2 rounded-full bg-background/70">
        {hasValue ? (
          <span
            className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background ${accentClassName}`}
            style={{ left: `${normalizedPercent}%` }}
          />
        ) : null}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </div>
  );
}
