"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APODData } from "@/lib/types";
import { apiFetch } from "@/lib/api-client";
import { Calendar, ExternalLink, ChevronDown, ChevronUp, Play, ImageIcon } from "lucide-react";

interface APODCardProps {
  className?: string;
}

export function APODCard({ className }: APODCardProps) {
  const [apod, setApod] = useState<APODData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function fetchApod() {
      try {
        const data = await apiFetch<APODData>("/apod");
        setApod(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }

    fetchApod();
  }, []);

  if (loading) {
    return <APODCardSkeleton className={className} />;
  }

  if (error || !apod) {
    return null; // Gracefully hide if APOD unavailable
  }

  // Format date for display
  const displayDate = new Date(apod.date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Truncate explanation for collapsed state
  const maxLength = 280;
  const needsTruncation = apod.explanation.length > maxLength;
  const displayExplanation = expanded || !needsTruncation
    ? apod.explanation
    : apod.explanation.slice(0, maxLength).trim() + "...";

  // Determine image source (use thumbnail for videos)
  const imageSrc = apod.mediaType === "video" ? apod.thumbnailUrl : apod.imageUrl;
  const isVideo = apod.mediaType === "video";

  return (
    <Card
      className={`border border-orange-200/25 bg-[#1b130e]/85 text-orange-100 shadow-[inset_0_0_0_1px_rgba(255,180,120,0.14)] scanlines overflow-hidden ${className}`}
    >
      <div className="grid md:grid-cols-2 gap-0">
        {/* Image Section */}
        <div className="relative aspect-video md:aspect-auto md:min-h-[320px] bg-[#0d0907]">
          {imageSrc ? (
            <>
              <Image
                src={imageSrc}
                alt={apod.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
              {/* Video overlay indicator */}
              {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-void-black/40">
                  <div className="w-16 h-16 rounded-full border border-orange-200/35 bg-orange-400/85 flex items-center justify-center">
                    <Play className="w-8 h-8 text-black ml-1" />
                  </div>
                </div>
              )}
              {/* Gradient overlay for text readability on mobile */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0b08]/85 via-transparent to-transparent md:hidden" />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-void-black/50">
              <ImageIcon className="w-12 h-12 text-muted-foreground" />
            </div>
          )}

          {/* Mobile title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:hidden">
            <Badge variant="outline" className="mb-2 border-orange-300/45 bg-orange-500/15 text-orange-100">
              <Calendar className="w-3 h-3 mr-1" />
              {displayDate}
            </Badge>
            <h3 className="font-display text-lg text-orange-50 line-clamp-2">
              {apod.title}
            </h3>
          </div>
        </div>

        {/* Content Section */}
        <CardContent className="p-6 flex flex-col">
          {/* Header - Desktop only */}
          <div className="hidden md:block mb-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <Badge variant="outline" className="shrink-0 border-orange-300/45 bg-orange-500/15 text-orange-100">
                <Calendar className="w-3 h-3 mr-1" />
                Astronomy Picture of the Day
              </Badge>
              {isVideo && (
                <Badge variant="outline" className="border-amber-300/35 text-amber-100/80">
                  <Play className="w-3 h-3 mr-1" />
                  Video
                </Badge>
              )}
            </div>
            <h3 className="mb-1 font-display text-xl text-orange-200">
              {apod.title}
            </h3>
            <p className="text-sm text-orange-100/70">
              {displayDate}
            </p>
          </div>

          {/* Explanation - Full text on desktop, truncated on mobile */}
          <div className="flex-1 overflow-y-auto">
            {/* Desktop: full text */}
            <p className="hidden md:block text-sm text-orange-100/80 leading-relaxed">
              {apod.explanation}
            </p>
            {/* Mobile: truncated with expand/collapse */}
            <div className="md:hidden">
              <p className="text-sm text-orange-100/80 leading-relaxed">
                {displayExplanation}
              </p>
              {needsTruncation && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-auto p-0 text-orange-300 hover:bg-orange-400/10 hover:text-orange-200"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? (
                    <>
                      Show less <ChevronUp className="w-4 h-4 ml-1" />
                    </>
                  ) : (
                    <>
                      Read more <ChevronDown className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between border-t border-orange-200/20 pt-4">
            <div className="text-xs text-orange-100/60">
              {apod.copyright && (
                <span>&copy; {apod.copyright}</span>
              )}
            </div>
            <a
              href={`https://apod.nasa.gov/apod/ap${apod.date.replace(/-/g, "").slice(2)}.html`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-orange-300 transition-colors hover:text-orange-200"
            >
              View on NASA APOD
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export function APODCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={`border border-orange-200/25 bg-[#1b130e]/85 overflow-hidden ${className}`}>
      <div className="grid md:grid-cols-2 gap-0">
        {/* Image Skeleton */}
        <div className="relative aspect-video md:aspect-auto md:min-h-[320px] bg-orange-500/20 animate-pulse" />

        {/* Content Skeleton */}
        <div className="p-6 flex flex-col">
          <div className="hidden md:block mb-4">
            <div className="mb-3 h-5 w-48 rounded bg-orange-500/20 animate-pulse" />
            <div className="mb-2 h-7 w-3/4 rounded bg-orange-500/20 animate-pulse" />
            <div className="h-4 w-40 rounded bg-orange-500/15 animate-pulse" />
          </div>

          <div className="flex-1 space-y-2">
            <div className="h-4 w-full rounded bg-orange-500/15 animate-pulse" />
            <div className="h-4 w-full rounded bg-orange-500/15 animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-orange-500/15 animate-pulse" />
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-orange-200/20 pt-4">
            <div className="h-3 w-24 rounded bg-orange-500/15 animate-pulse" />
            <div className="h-3 w-32 rounded bg-orange-500/15 animate-pulse" />
          </div>
        </div>
      </div>
    </Card>
  );
}
