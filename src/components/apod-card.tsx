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
  initialApod?: APODData | null;
  initialError?: string | null;
}

export function APODCard({ className, initialApod = null, initialError = null }: APODCardProps) {
  const [apod, setApod] = useState<APODData | null>(initialApod);
  const [loading, setLoading] = useState(!initialApod && !initialError);
  const [error, setError] = useState<string | null>(initialError);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (initialApod || initialError) {
      return;
    }

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
  }, [initialApod, initialError]);

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
    <Card className={`bg-card border-border/50 bezel scanlines overflow-hidden ${className}`}>
      <div className="grid md:grid-cols-2 gap-0">
        {/* Image Section */}
        <div className="relative aspect-video md:aspect-auto md:min-h-[320px] bg-void-black">
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
                  <div className="w-16 h-16 rounded-full bg-radium-teal/90 flex items-center justify-center">
                    <Play className="w-8 h-8 text-void-black ml-1" />
                  </div>
                </div>
              )}
              {/* Gradient overlay for text readability on mobile */}
              <div className="absolute inset-0 bg-gradient-to-t from-void-black/80 via-transparent to-transparent md:hidden" />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-void-black/50">
              <ImageIcon className="w-12 h-12 text-muted-foreground" />
            </div>
          )}

          {/* Mobile title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:hidden">
            <Badge variant="outline" className="border-radium-teal/50 text-radium-teal bg-radium-teal/10 mb-2">
              <Calendar className="w-3 h-3 mr-1" />
              {displayDate}
            </Badge>
            <h3 className="font-display text-lg text-foreground line-clamp-2">
              {apod.title}
            </h3>
          </div>
        </div>

        {/* Content Section */}
        <CardContent className="p-6 flex flex-col">
          {/* Header - Desktop only */}
          <div className="hidden md:block mb-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <Badge variant="outline" className="border-radium-teal/50 text-radium-teal bg-radium-teal/10 shrink-0">
                <Calendar className="w-3 h-3 mr-1" />
                Astronomy Picture of the Day
              </Badge>
              {isVideo && (
                <Badge variant="outline" className="border-radium-teal/30 text-radium-teal/70">
                  <Play className="w-3 h-3 mr-1" />
                  Video
                </Badge>
              )}
            </div>
            <h3 className="font-display text-xl text-radium-teal mb-1">
              {apod.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {displayDate}
            </p>
          </div>

          {/* Explanation - Full text on desktop, truncated on mobile */}
          <div className="flex-1 overflow-y-auto">
            {/* Desktop: full text */}
            <p className="hidden md:block text-sm text-muted-foreground leading-relaxed">
              {apod.explanation}
            </p>
            {/* Mobile: truncated with expand/collapse */}
            <div className="md:hidden">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {displayExplanation}
              </p>
              {needsTruncation && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-radium-teal hover:text-radium-teal hover:bg-radium-teal/10 p-0 h-auto"
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
          <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {apod.copyright && (
                <span>&copy; {apod.copyright}</span>
              )}
            </div>
            <a
              href={`https://apod.nasa.gov/apod/ap${apod.date.replace(/-/g, "").slice(2)}.html`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-radium-teal hover:text-radium-teal/80 flex items-center gap-1 transition-colors"
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
    <Card className={`bg-card border-border/50 bezel overflow-hidden ${className}`}>
      <div className="grid md:grid-cols-2 gap-0">
        {/* Image Skeleton */}
        <div className="relative aspect-video md:aspect-auto md:min-h-[320px] bg-accent animate-pulse" />

        {/* Content Skeleton */}
        <div className="p-6 flex flex-col">
          <div className="hidden md:block mb-4">
            <div className="h-5 w-48 bg-accent animate-pulse rounded mb-3" />
            <div className="h-7 w-3/4 bg-accent animate-pulse rounded mb-2" />
            <div className="h-4 w-40 bg-accent animate-pulse rounded" />
          </div>

          <div className="flex-1 space-y-2">
            <div className="h-4 w-full bg-accent animate-pulse rounded" />
            <div className="h-4 w-full bg-accent animate-pulse rounded" />
            <div className="h-4 w-3/4 bg-accent animate-pulse rounded" />
          </div>

          <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between">
            <div className="h-3 w-24 bg-accent animate-pulse rounded" />
            <div className="h-3 w-32 bg-accent animate-pulse rounded" />
          </div>
        </div>
      </div>
    </Card>
  );
}
