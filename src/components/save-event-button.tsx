"use client";

import { useCallback, useEffect, useState } from "react";
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

const savedEventStatusCache = new Map<string, number | null>();
const savedEventStatusListeners = new Map<string, Set<(savedObjectId: number | null) => void>>();
const pendingSavedEventLookupIds = new Set<string>();
let isSavedEventLookupScheduled = false;
let isSavedEventLookupInFlight = false;

function broadcastSavedEventStatus(canonicalId: string, savedObjectId: number | null) {
  savedEventStatusCache.set(canonicalId, savedObjectId);
  const listeners = savedEventStatusListeners.get(canonicalId);
  if (!listeners || listeners.size === 0) return;

  for (const listener of listeners) {
    listener(savedObjectId);
  }
}

function subscribeSavedEventStatus(
  canonicalId: string,
  listener: (savedObjectId: number | null) => void
) {
  const listeners = savedEventStatusListeners.get(canonicalId) ?? new Set();
  listeners.add(listener);
  savedEventStatusListeners.set(canonicalId, listeners);

  return () => {
    const current = savedEventStatusListeners.get(canonicalId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      savedEventStatusListeners.delete(canonicalId);
    }
  };
}

async function flushSavedEventStatusLookups() {
  if (isSavedEventLookupInFlight || pendingSavedEventLookupIds.size === 0) return;
  isSavedEventLookupInFlight = true;

  const canonicalIds = Array.from(pendingSavedEventLookupIds);
  pendingSavedEventLookupIds.clear();

  try {
    const response = await fetch("/api/user/saved-objects/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canonicalIds }),
    });

    if (!response.ok) return;

    const payload = (await response.json().catch(() => null)) as
      | { saved?: Record<string, number | null> }
      | null;
    const saved = payload?.saved ?? {};

    for (const id of canonicalIds) {
      const savedObjectId = saved[id];
      broadcastSavedEventStatus(id, typeof savedObjectId === "number" ? savedObjectId : null);
    }
  } catch {
    // Ignore lookup failures; manual save/unsave still updates local state.
  } finally {
    isSavedEventLookupInFlight = false;
    if (pendingSavedEventLookupIds.size > 0) {
      queueSavedEventStatusLookupFlush();
    }
  }
}

function queueSavedEventStatusLookupFlush() {
  if (isSavedEventLookupScheduled) return;
  isSavedEventLookupScheduled = true;
  queueMicrotask(() => {
    isSavedEventLookupScheduled = false;
    void flushSavedEventStatusLookups();
  });
}

function queueSavedEventStatusLookup(canonicalId: string) {
  if (savedEventStatusCache.has(canonicalId)) return;
  pendingSavedEventLookupIds.add(canonicalId);
  queueSavedEventStatusLookupFlush();
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

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const cached = savedEventStatusCache.get(canonicalId);
    if (cached !== undefined) {
      setSavedObjectId(cached);
      setIsSaved(cached !== null);
      return;
    }

    const unsubscribe = subscribeSavedEventStatus(canonicalId, (nextSavedObjectId) => {
      setSavedObjectId(nextSavedObjectId);
      setIsSaved(nextSavedObjectId !== null);
    });

    queueSavedEventStatusLookup(canonicalId);

    return unsubscribe;
  }, [canonicalId, isLoaded, isSignedIn]);

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
        broadcastSavedEventStatus(canonicalId, null);
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
        broadcastSavedEventStatus(canonicalId, data.id as number);
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
