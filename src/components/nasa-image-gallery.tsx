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

      if (e.key === "Escape") {
        setLightboxIndex(null);
      } else if (e.key === "ArrowRight") {
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
    if (lightboxIndex !== null) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, handleKeyDown]);

  const thumbnailSize = compact ? "w-32 h-32 sm:w-40 sm:h-40" : "w-56 h-56";

  // Loading state
  if (loading) {
    return (
      <Card className="bg-card border-border/50 bezel overflow-hidden">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Related NASA Images
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-hidden">
          <div className="flex gap-2 sm:gap-3 overflow-x-auto min-w-0">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
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
      <Card className="bg-card border-border/50 bezel overflow-hidden">
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

      {/* Lightbox modal */}
      {currentImage && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close button */}
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close lightbox"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(
                    (lightboxIndex - 1 + images.length) % images.length
                  );
                }}
                className="absolute left-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex + 1) % images.length);
                }}
                className="absolute right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Image + caption */}
          <div
            className="flex flex-col items-center max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentImage.imageUrl}
              alt={currentImage.title}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />

            {/* Caption area */}
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

              {/* Image counter */}
              {images.length > 1 && (
                <p className="text-white/40 text-xs font-mono">
                  {lightboxIndex + 1} / {images.length}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
