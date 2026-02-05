import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Pro Badge Component
 *
 * Visual indicator for Pro tier features.
 * Uses uranium-green (the project's signature "radioactive" color) for branding.
 *
 * Variants:
 * - default: Full badge with icon and "Pro" text
 * - icon-only: Just the sparkle icon (for tight spaces)
 * - text-only: Just "Pro" text without icon
 */

interface ProBadgeProps {
  variant?: "default" | "icon-only" | "text-only";
  size?: "sm" | "default";
  className?: string;
}

export function ProBadge({
  variant = "default",
  size = "default",
  className,
}: ProBadgeProps) {
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  if (variant === "icon-only") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center",
          "text-uranium-green",
          className
        )}
        title="Pro feature"
      >
        <Sparkles className={iconSize} />
      </span>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "border-uranium-green/50 text-uranium-green bg-uranium-green/10",
        "font-medium tracking-wide",
        size === "sm" && "text-[10px] px-1.5 py-0",
        className
      )}
    >
      {variant === "default" && <Sparkles className={cn(iconSize, "mr-1")} />}
      Pro
    </Badge>
  );
}

/**
 * Pro Feature Lock
 *
 * Overlay/indicator for features that require Pro.
 * Shows a tooltip explaining the feature requires upgrade.
 */
interface ProFeatureLockProps {
  children: React.ReactNode;
  className?: string;
}

export function ProFeatureLock({ children, className }: ProFeatureLockProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Content with reduced opacity */}
      <div className="opacity-50 pointer-events-none">{children}</div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[1px] rounded">
        <div className="flex flex-col items-center gap-1.5">
          <ProBadge />
          <span className="text-xs text-muted-foreground">Upgrade to unlock</span>
        </div>
      </div>
    </div>
  );
}
