interface FactBarProps {
  percent: number;
  accentClass: string;
  minLabel: string;
  maxLabel: string;
  thin?: boolean;
}

export function FactBar({
  percent,
  accentClass,
  minLabel,
  maxLabel,
  thin,
}: FactBarProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="mt-2">
      <div
        className={`overflow-hidden rounded-full bg-background/70 ${thin ? "h-[1.5px]" : "h-[2px]"}`}
      >
        <div
          className={`h-full transition-all duration-300 ${accentClass}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-[10px] leading-none text-muted-foreground/70">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
