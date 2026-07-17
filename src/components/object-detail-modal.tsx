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
import {
  getModalStarDetailQueryOptions,
  resolveModalDetailObject,
} from "@/lib/object-detail-modal-query";
import { getDetailAccentConfig } from "@/lib/theme";
import { LoaderCircle, SquareArrowOutUpRight, TriangleAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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
  const starDetailQuery = useQuery(getModalStarDetailQueryOptions(object, open));

  if (!object) return null;

  const accent = getDetailAccentConfig(object);
  const starModal = isStar(object);
  const detailedObject = resolveModalDetailObject(object, starDetailQuery.data);
  const loadingStarDetail = starModal && open && starDetailQuery.isPending;
  const starDetailFailed = starModal && open && starDetailQuery.isError;
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
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          <DialogTitle className="sr-only">{object.displayName}</DialogTitle>
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors ${accent.linkHover}`}
          >
            <SquareArrowOutUpRight className="w-4 h-4" />
            View Full Page
          </Link>
        </DialogHeader>
        <div className="min-w-0 w-full">
          {loadingStarDetail ? (
            <div
              className="mb-4 flex items-start gap-3 rounded-md border border-uranium-green/25 bg-uranium-green/5 px-3 py-2.5"
              role="status"
              aria-live="polite"
            >
              <LoaderCircle className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-uranium-green" />
              <div>
                <p className="font-display text-xs uppercase tracking-wide text-foreground">
                  Syncing published stellar solutions
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  The catalog snapshot is available while archive measurements load.
                </p>
              </div>
            </div>
          ) : starDetailFailed ? (
            <div
              className="mb-4 flex items-start gap-3 rounded-md border border-amber-glow/25 bg-amber-glow/5 px-3 py-2.5"
              role="status"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-glow" />
              <div>
                <p className="font-display text-xs uppercase tracking-wide text-foreground">
                  Archive measurements unavailable
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Showing the indexed catalog snapshot instead.
                </p>
              </div>
            </div>
          ) : null}
          <ObjectDetail object={detailedObject} compact />
        </div>
      </DialogContent>
    </Dialog>
  );
}
