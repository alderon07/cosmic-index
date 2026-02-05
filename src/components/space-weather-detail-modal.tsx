"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SpaceWeatherDetail } from "@/components/space-weather-detail";
import { AnySpaceWeatherEvent } from "@/lib/types";
import { getEventTypeLabel } from "@/lib/nasa-donki";
import { SquareArrowOutUpRight } from "lucide-react";

interface SpaceWeatherDetailModalProps {
  event: AnySpaceWeatherEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SpaceWeatherDetailModal({
  event,
  open,
  onOpenChange,
}: SpaceWeatherDetailModalProps) {
  if (!event) return null;

  const href = `/space-weather/${encodeURIComponent(event.id)}`;
  const typeLabel = getEventTypeLabel(event.eventType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[90vh] overflow-y-auto overflow-x-hidden bg-background border-border"
        showCloseButton={true}
      >
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          <DialogTitle className="sr-only">{typeLabel}</DialogTitle>
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
          <SpaceWeatherDetail event={event} compact />
        </div>
      </DialogContent>
    </Dialog>
  );
}
