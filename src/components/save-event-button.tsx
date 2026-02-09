"use client";

import { useCallback, useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppAuth } from "@/components/auth/app-auth-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SaveEventButtonProps {
  canonicalId: string;
  displayName: string;
  eventPayload?: unknown;
  className?: string;
}

export function SaveEventButton({
  canonicalId,
  displayName,
  eventPayload,
  className,
}: SaveEventButtonProps) {
  const { isLoaded, isSignedIn } = useAppAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [savedObjectId, setSavedObjectId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = useCallback(async () => {
    if (!isSignedIn || isLoading) return;

    setIsLoading(true);
    const previous = isSaved;
    setIsSaved(!isSaved);

    try {
      if (previous && savedObjectId) {
        const response = await fetch(`/api/user/saved-objects/${savedObjectId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to remove saved event");
        }

        setSavedObjectId(null);
      } else {
        const response = await fetch("/api/user/saved-objects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            canonicalId,
            displayName,
            eventPayload,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to save event");
        }

        const data = await response.json();
        setSavedObjectId(data.id);
      }
    } catch {
      setIsSaved(previous);
    } finally {
      setIsLoading(false);
    }
  }, [canonicalId, displayName, eventPayload, isLoading, isSaved, isSignedIn, savedObjectId]);

  const label = !isLoaded
    ? "Loading..."
    : !isSignedIn
    ? "Sign in to save"
    : isSaved
    ? "Remove from saved"
    : "Save event";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void handleToggle();
          }}
          disabled={!isLoaded || isLoading}
          className={cn(
            "p-1.5 rounded-full transition-all duration-200",
            "bg-background/80 backdrop-blur-sm border border-border/50",
            "hover:bg-background hover:text-primary",
            isLoading && "opacity-50 cursor-wait",
            !isSignedIn && "opacity-70",
            className
          )}
          aria-label={label}
        >
          <Heart
            className={cn(
              "w-4 h-4 transition-all duration-200",
              isSaved
                ? "text-primary fill-primary"
                : "text-muted-foreground"
            )}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
