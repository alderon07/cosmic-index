"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ObjectDetail } from "@/components/object-detail";
import { AnyCosmicObject, isExoplanet, isStar } from "@/lib/types";
import { SquareArrowOutUpRight } from "lucide-react";

interface ObjectDetailModalProps {
  object: AnyCosmicObject | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ObjectDetailModal({
  object,
  open,
  onOpenChange,
}: ObjectDetailModalProps) {
  if (!object) return null;

  const href = isExoplanet(object)
    ? `/exoplanets/${object.id}`
    : isStar(object)
    ? `/stars/${object.id}`
    : `/small-bodies/${object.id}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[90vh] overflow-y-auto overflow-x-hidden bg-background border-border"
        showCloseButton={true}
      >
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          <DialogTitle className="sr-only">{object.displayName}</DialogTitle>
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <SquareArrowOutUpRight className="w-4 h-4" />
            View Full Page
          </Link>
        </DialogHeader>
        <div className="min-w-0 w-full">
          <ObjectDetail object={object} hideDataSources compact />
        </div>
      </DialogContent>
    </Dialog>
  );
}
