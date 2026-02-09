"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompareItem } from "@/lib/compare-facts";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompareChipProps {
  item: CompareItem;
  onRemove: () => void;
}

export function CompareChip({ item, onRemove }: CompareChipProps) {
  const chipToneClass =
    item.domain === "stars"
      ? "border-uranium-green/40 text-uranium-green bg-uranium-green/10"
      : item.domain === "small-bodies"
      ? "border-secondary/40 text-secondary bg-secondary/10"
      : "border-primary/40 text-primary bg-primary/10";

  const removeToneClass =
    item.domain === "stars"
      ? "text-uranium-green/80 hover:text-uranium-green hover:bg-uranium-green/20"
      : item.domain === "small-bodies"
      ? "text-secondary/80 hover:text-secondary hover:bg-secondary/20"
      : "text-primary/80 hover:text-primary hover:bg-primary/20";

  return (
    <Badge variant="outline" className={cn("h-8 px-2.5 inline-flex items-center gap-2", chipToneClass)}>
      <span className="max-w-40 truncate font-mono">{item.displayName}</span>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={onRemove}
        className={cn("h-5 w-5", removeToneClass)}
        aria-label={`Remove ${item.displayName} from compare`}
      >
        <X className="w-3 h-3" />
      </Button>
    </Badge>
  );
}
