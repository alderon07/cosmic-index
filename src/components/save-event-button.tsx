"use client";

import { useCallback, useState } from "react";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void handleToggle();
          }}
          disabled={!isLoaded || isLoading}
          className={cn(
            "h-7 w-7 border-border/50 bg-background/80",
            isSaved && "border-primary/50 text-primary",
            className
          )}
          aria-label={label}
        >
          <Bookmark className={cn("h-3.5 w-3.5", isSaved && "fill-current")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
