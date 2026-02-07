"use client";

interface MetricGaugeProps {
  label: string;
  valueLabel: string;
  valuePercent?: number | null;
  accentClassName: string;
  hint?: string;
}

function clampPercent(input: number): number {
  if (input < 0) return 0;
  if (input > 100) return 100;
  return input;
}

export function MetricGauge({
  label,
  valueLabel,
  valuePercent,
  accentClassName,
  hint,
}: MetricGaugeProps) {
  const hasValue = valuePercent != null;
  const width = hasValue ? clampPercent(valuePercent) : 0;

  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`font-mono text-sm ${hasValue ? "text-foreground" : "text-muted-foreground"}`}>
          {valueLabel}
        </p>
      </div>
      <div className="mt-2 h-2 rounded-full bg-background/70 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${accentClassName}`}
          style={{ width: `${width}%` }}
        />
      </div>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
