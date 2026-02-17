"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
} from "lucide-react";
import type { AnyCosmicObject } from "@/lib/types";
import { apiFetch } from "@/lib/api-client";
import { DETAIL_CARD_SURFACE_CLASS } from "@/lib/theme";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

interface NasaImage {
  nasaId: string;
  title: string;
  description?: string;
  center?: string;
  dateCreated?: string;
  keywords?: string[];
  credit?: string;
  thumbnailUrl: string;
  imageUrl: string;
}

interface NasaImagesResult {
  images: NasaImage[];
  totalHits: number;
  usedQuery: string;
}

interface NasaImageGalleryProps {
  object: AnyCosmicObject;
  compact?: boolean;
}

export function NasaImageGallery({ object, compact }: NasaImageGalleryProps) {
  const [images, setImages] = useState<NasaImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLightboxOpen = lightboxIndex !== null;

  // Extract stable values for dependency array to avoid unnecessary re-fetches
  const objectType = object.type;
  const objectName = object.displayName;
  const hostStar = object.type === "EXOPLANET" ? object.hostStar : undefined;
  const bodyKind = object.type === "SMALL_BODY" ? object.bodyKind : undefined;

  useEffect(() => {
    const params = new URLSearchParams({
      type: objectType,
      name: objectName,
    });

    if (hostStar) {
      params.set("hostStar", hostStar);
    }

    if (bodyKind) {
      params.set("bodyKind", bodyKind);
    }

    const controller = new AbortController();

    apiFetch<NasaImagesResult>(`/images/object?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((data) => {
        setImages(data.images ?? []);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("[NasaImageGallery] Fetch failed:", err);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [objectType, objectName, hostStar, bodyKind]);

  // Keyboard navigation for lightbox
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;

      if (e.key === "ArrowRight") {
        setLightboxIndex((prev) =>
          prev !== null ? (prev + 1) % images.length : null
        );
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) =>
          prev !== null ? (prev - 1 + images.length) % images.length : null
        );
      }
    },
    [lightboxIndex, images.length]
  );

  useEffect(() => {
    if (lightboxIndex === null) {
      return;
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxIndex, handleKeyDown]);

  const thumbnailSize = compact ? "w-32 h-32 sm:w-40 sm:h-40" : "w-56 h-56";

  // Loading state
  if (loading) {
    return (
      <Card
        tone="neutral"
        className={`${DETAIL_CARD_SURFACE_CLASS} overflow-hidden`}
      >
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Related NASA Images
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-hidden">
          <div className="flex gap-2 sm:gap-3 overflow-x-auto min-w-0">
            {["image-skeleton-1", "image-skeleton-2", "image-skeleton-3", "image-skeleton-4"].map((key) => (
              <div
                key={key}
                className={`${thumbnailSize} flex-shrink-0 rounded-lg data-stream bg-muted/30`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state — don't render the section at all
  if (images.length === 0) {
    return null;
  }

  const currentImage = lightboxIndex !== null ? images[lightboxIndex] : null;

  return (
    <>
      <Card
        tone="neutral"
        className={`${DETAIL_CARD_SURFACE_CLASS} overflow-hidden`}
      >
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Related NASA Images
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-hidden">
          {/* Thumbnail strip - horizontal scroll */}
          <div
            ref={scrollRef}
            className={`flex ${
              compact ? "gap-2 sm:gap-3" : "gap-3"
            } overflow-x-auto pb-2 scrollbar-thin min-w-0`}
          >
            {images.map((image, index) => (
              <button
                key={image.nasaId}
                onClick={() => setLightboxIndex(index)}
                className={`relative ${thumbnailSize} flex-shrink-0 rounded-lg overflow-hidden border border-border/30 bezel group cursor-pointer transition-all hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.thumbnailUrl}
                  alt={image.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                {/* Vignette overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                {/* Title */}
                <p
                  className={`absolute bottom-0 left-0 right-0 p-2 text-white/90 font-mono line-clamp-2 leading-tight ${
                    compact ? "text-[10px]" : "text-xs"
                  }`}
                >
                  {image.title}
                </p>
              </button>
            ))}
          </div>

          {/* Attribution */}
          <p className="text-xs text-muted-foreground mt-3">
            Images courtesy of{" "}
            <a
              href="https://images.nasa.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              NASA Image and Video Library
            </a>
          </p>
        </CardContent>
      </Card>

      <Dialog
        open={isLightboxOpen}
        onOpenChange={(open) => {
          if (!open) setLightboxIndex(null);
        }}
      >
        {currentImage && lightboxIndex !== null && (
          <DialogContent
            showCloseButton={false}
            className="!top-0 !left-0 !h-screen !w-screen !max-w-none !translate-x-0 !translate-y-0 border-0 rounded-none bg-black/90 p-0 backdrop-blur-sm"
          >
            <DialogTitle className="sr-only">{currentImage.title}</DialogTitle>
            <DialogDescription className="sr-only">
              NASA image lightbox. Use left and right arrow keys to navigate.
            </DialogDescription>

            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Close lightbox"
            >
              <X className="w-6 h-6" />
            </button>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex(
                      (lightboxIndex - 1 + images.length) % images.length
                    )
                  }
                  className="absolute left-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex((lightboxIndex + 1) % images.length)
                  }
                  className="absolute right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            <div className="flex h-full w-full flex-col items-center justify-center px-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentImage.imageUrl}
                alt={currentImage.title}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />

              <div className="mt-4 max-w-2xl text-center space-y-1">
                <h2 className="text-white font-display text-lg">
                  {currentImage.title}
                </h2>

                {currentImage.description && (
                  <p className="text-white/70 text-sm line-clamp-3">
                    {currentImage.description}
                  </p>
                )}

                <div className="flex items-center justify-center gap-4 text-xs text-white/50 pt-1">
                  {currentImage.credit && (
                    <span>Credit: {currentImage.credit}</span>
                  )}
                  {currentImage.dateCreated && (
                    <span>
                      {new Date(currentImage.dateCreated).toLocaleDateString(
                        undefined,
                        { year: "numeric", month: "long", day: "numeric" }
                      )}
                    </span>
                  )}
                </div>

                <a
                  href={`https://images.nasa.gov/details/${currentImage.nasaId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View on NASA
                </a>

                {images.length > 1 && (
                  <p className="text-white/40 text-xs font-mono">
                    {lightboxIndex + 1} / {images.length}
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
