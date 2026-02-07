"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompareItem } from "@/lib/compare-facts";
import { X } from "lucide-react";

interface CompareChipProps {
  item: CompareItem;
  onRemove: () => void;
}

export function CompareChip({ item, onRemove }: CompareChipProps) {
  return (
    <Badge
      variant="outline"
      className="h-8 px-2.5 border-primary/40 text-primary bg-primary/10 inline-flex items-center gap-2"
    >
      <span className="max-w-40 truncate font-mono">{item.displayName}</span>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={onRemove}
        className="h-5 w-5 text-primary/80 hover:text-primary hover:bg-primary/20"
        aria-label={`Remove ${item.displayName} from compare`}
      >
        <X className="w-3 h-3" />
      </Button>
    </Badge>
  );
}
