"use client";

import { useState, useCallback, useEffect } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  AnyCosmicObject,
  isExoplanet,
  isStar,
  isSmallBody,
} from "@/lib/types";
import { catalogObjectId, CatalogObjectType } from "@/lib/canonical-id";
import { useAppAuth } from "@/components/auth/app-auth-provider";

/**
 * SaveButton Component
 *
 * A button/icon for saving cosmic objects to user's collection.
 * Features:
 * - Two variants: "icon" (for cards) and "button" (for detail pages)
 * - Tooltip hints for different states (sign in, save, saved)
 * - Optimistic UI updates with loading state
 * - Theme-aware coloring based on object type
 *
 * Authentication states:
 * - Not signed in: Shows "Sign in to save" tooltip
 * - Signed in: Shows save/unsave toggle
 */

export type SaveButtonVariant = "icon" | "button";

interface SaveButtonProps {
  object: AnyCosmicObject;
  variant?: SaveButtonVariant;
  /** Pre-loaded saved status (from check API) */
  isSaved?: boolean;
  /** Pre-loaded saved object ID */
  savedObjectId?: number | null;
  /** Callback when save status changes */
  onSaveChange?: (isSaved: boolean) => void;
  className?: string;
}

const savedStatusCache = new Map<string, number | null>();
const savedStatusListeners = new Map<string, Set<(savedObjectId: number | null) => void>>();
const pendingLookupIds = new Set<string>();
let isLookupScheduled = false;
let isLookupInFlight = false;

function broadcastSavedStatus(canonicalId: string, savedObjectId: number | null) {
  savedStatusCache.set(canonicalId, savedObjectId);
  const listeners = savedStatusListeners.get(canonicalId);
  if (!listeners || listeners.size === 0) return;

  for (const listener of listeners) {
    listener(savedObjectId);
  }
}

function subscribeSavedStatus(
  canonicalId: string,
  listener: (savedObjectId: number | null) => void
) {
  const listeners = savedStatusListeners.get(canonicalId) ?? new Set();
  listeners.add(listener);
  savedStatusListeners.set(canonicalId, listeners);

  return () => {
    const current = savedStatusListeners.get(canonicalId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      savedStatusListeners.delete(canonicalId);
    }
  };
}

async function flushSavedStatusLookups() {
  if (isLookupInFlight || pendingLookupIds.size === 0) return;
  isLookupInFlight = true;

  const canonicalIds = Array.from(pendingLookupIds);
  pendingLookupIds.clear();

  try {
    const response = await fetch("/api/user/saved-objects/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canonicalIds }),
    });

    if (!response.ok) {
      return;
    }

    const payload = (await response.json().catch(() => null)) as
      | { saved?: Record<string, number | null> }
      | null;
    const saved = payload?.saved ?? {};

    for (const canonicalId of canonicalIds) {
      const savedObjectId = saved[canonicalId];
      broadcastSavedStatus(canonicalId, typeof savedObjectId === "number" ? savedObjectId : null);
    }
  } catch {
    // Ignore lookup failures; button actions still work and will refresh cache on writes.
  } finally {
    isLookupInFlight = false;
    if (pendingLookupIds.size > 0) {
      queueSavedStatusLookupFlush();
    }
  }
}

function queueSavedStatusLookupFlush() {
  if (isLookupScheduled) return;
  isLookupScheduled = true;
  queueMicrotask(() => {
    isLookupScheduled = false;
    void flushSavedStatusLookups();
  });
}

function queueSavedStatusLookup(canonicalId: string) {
  if (savedStatusCache.has(canonicalId)) return;
  pendingLookupIds.add(canonicalId);
  queueSavedStatusLookupFlush();
}

export function SaveButton({
  object,
  variant = "icon",
  isSaved: initialIsSaved = false,
  savedObjectId: initialSavedObjectId = null,
  onSaveChange,
  className,
}: SaveButtonProps) {
  const { isSignedIn, isLoaded } = useAppAuth();
  const [isSaved, setIsSaved] = useState(initialIsSaved);
  const [savedObjectId, setSavedObjectId] = useState<number | null>(
    initialSavedObjectId
  );
  const [isLoading, setIsLoading] = useState(false);

  // Determine object type for canonical ID
  const objectType: CatalogObjectType = isExoplanet(object)
    ? "exoplanet"
    : isStar(object)
    ? "star"
    : "small-body";

  const canonicalId = catalogObjectId(objectType, object.id);

  useEffect(() => {
    setIsSaved(initialIsSaved);
    setSavedObjectId(initialSavedObjectId);

    if (initialIsSaved) {
      broadcastSavedStatus(canonicalId, initialSavedObjectId);
    }
  }, [canonicalId, initialIsSaved, initialSavedObjectId]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const cached = savedStatusCache.get(canonicalId);
    if (cached !== undefined) {
      setSavedObjectId(cached);
      setIsSaved(cached !== null);
      return;
    }

    const unsubscribe = subscribeSavedStatus(canonicalId, (nextSavedObjectId) => {
      setSavedObjectId(nextSavedObjectId);
      setIsSaved(nextSavedObjectId !== null);
    });

    queueSavedStatusLookup(canonicalId);

    return unsubscribe;
  }, [canonicalId, isLoaded, isSignedIn]);

  // Theme colors based on object type
  const themeColor = isExoplanet(object)
    ? "primary"
    : isStar(object)
    ? "uranium-green"
    : isSmallBody(object) && object.bodyKind === "comet"
    ? "radium-teal"
    : "secondary";

  const filledColorClass =
    themeColor === "primary"
      ? "text-primary fill-primary"
      : themeColor === "uranium-green"
      ? "text-uranium-green fill-uranium-green"
      : themeColor === "radium-teal"
      ? "text-radium-teal fill-radium-teal"
      : "text-secondary fill-secondary";

  const hoverColorClass =
    themeColor === "primary"
      ? "hover:text-primary"
      : themeColor === "uranium-green"
      ? "hover:text-primary"
      : themeColor === "radium-teal"
      ? "hover:text-radium-teal"
      : "hover:text-secondary";

  const handleToggleSave = useCallback(async () => {
    if (!isSignedIn || isLoading) return;

    setIsLoading(true);

    // Optimistic update
    const wasIsSaved = isSaved;
    setIsSaved(!isSaved);

    try {
      if (wasIsSaved && savedObjectId) {
        // Unsave
        const response = await fetch(`/api/user/saved-objects/${savedObjectId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to unsave");
        }

        setSavedObjectId(null);
        broadcastSavedStatus(canonicalId, null);
        onSaveChange?.(false);
      } else {
        // Save
        const response = await fetch("/api/user/saved-objects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            canonicalId,
            displayName: object.displayName,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save");
        }

        const data = await response.json();
        setSavedObjectId(data.id);
        broadcastSavedStatus(canonicalId, data.id as number);
        onSaveChange?.(true);
      }
    } catch {
      // Revert optimistic update on error
      setIsSaved(wasIsSaved);
    } finally {
      setIsLoading(false);
    }
  }, [isSignedIn, isLoading, isSaved, savedObjectId, canonicalId, object.displayName, onSaveChange]);

  // Tooltip content based on state
  const tooltipContent = !isLoaded
    ? "Loading..."
    : !isSignedIn
    ? "Sign in to save"
    : isSaved
    ? "Remove from saved"
    : "Save to collection";

  // Icon variant - minimal circular button
  if (variant === "icon") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleToggleSave();
            }}
            disabled={!isLoaded || isLoading}
            className={cn(
              "p-1.5 rounded-full transition-all duration-200",
              "bg-background/80 backdrop-blur-sm border border-border/50",
              "hover:bg-background",
              hoverColorClass,
              isLoading && "opacity-50 cursor-wait",
              !isSignedIn && "opacity-70",
              className
            )}
            aria-label={tooltipContent}
          >
            <Heart
              className={cn(
                "w-4 h-4 transition-all duration-200",
                isSaved ? filledColorClass : "text-muted-foreground"
              )}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{tooltipContent}</TooltipContent>
      </Tooltip>
    );
  }

  // Button variant - full button with text
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={(e) => {
            e.preventDefault();
            handleToggleSave();
          }}
          disabled={!isLoaded || isLoading}
          variant={isSaved ? "default" : "outline"}
          size="sm"
          className={cn(
            "gap-1.5",
            isSaved &&
              (themeColor === "primary"
                ? "bg-primary hover:bg-primary/85"
                : themeColor === "uranium-green"
                ? "bg-primary hover:bg-primary/85 text-primary-foreground"
                : themeColor === "radium-teal"
                ? "bg-radium-teal hover:bg-radium-teal/90 text-background"
                : "bg-secondary hover:bg-secondary/90"),
            className
          )}
        >
          <Heart
            className={cn(
              "w-4 h-4",
              isSaved && "fill-current"
            )}
          />
          {isSaved ? "Saved" : "Save"}
        </Button>
      </TooltipTrigger>
      {!isSignedIn && (
        <TooltipContent side="bottom">{tooltipContent}</TooltipContent>
      )}
    </Tooltip>
  );
}
