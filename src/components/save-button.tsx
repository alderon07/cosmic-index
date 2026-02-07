"use client";

import { useState, useCallback } from "react";
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
      ? "hover:text-uranium-green"
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
                ? "bg-primary hover:bg-primary/90"
                : themeColor === "uranium-green"
                ? "bg-uranium-green hover:bg-uranium-green/90 text-background"
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
