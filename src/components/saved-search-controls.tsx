"use client";

import { useCallback, useEffect, useState } from "react";
import { BookmarkPlus, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppAuth } from "@/components/auth/app-auth-provider";
import { ThemeConfig, THEMES } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface SavedSearchItem {
  id: number;
  name: string;
  category: "exoplanets" | "stars" | "small-bodies";
  queryParams: Record<string, unknown>;
}

interface SavedSearchControlsProps {
  category: "exoplanets" | "stars" | "small-bodies";
  currentParams: Record<string, unknown>;
  onApply: (params: Record<string, unknown>) => void;
  theme?: ThemeConfig;
}

export function SavedSearchControls({
  category,
  currentParams,
  onApply,
  theme = THEMES.exoplanets,
}: SavedSearchControlsProps) {
  const auth = useAppAuth();
  const [searches, setSearches] = useState<SavedSearchItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("none");
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);

  const loadSearches = useCallback(async (): Promise<boolean> => {
    if (!auth.isSignedIn) return false;

    try {
      const response = await fetch(`/api/user/saved-searches?category=${category}`);
      if (!response.ok) return false;
      const data = await response.json();
      setSearches(Array.isArray(data.searches) ? data.searches : []);
      return true;
    } catch {
      // Ignore load errors; UI stays available for current browse session.
      return false;
    }
  }, [auth.isSignedIn, category]);

  useEffect(() => {
    void loadSearches();
  }, [loadSearches]);

  useEffect(() => {
    if (!refreshNotice || isRefreshing) return;
    const timer = window.setTimeout(() => setRefreshNotice(null), 3000);
    return () => window.clearTimeout(timer);
  }, [refreshNotice, isRefreshing]);

  if (!auth.isSignedIn) {
    return null;
  }

  const handleSave = async () => {
    if (isSaving || isRefreshing) return;

    const rawName = window.prompt("Name this saved search:");
    if (!rawName) return;

    const name = rawName.trim();
    if (!name) return;

    setIsSaving(true);
    try {
      const response = await fetch("/api/user/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          category,
          queryParams: currentParams,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save search");
      }

      await loadSearches();
      setRefreshNotice("Saved and updated");
    } catch (error) {
      console.error("Save search failed", error);
      setRefreshNotice("Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = async () => {
    if (isRefreshing || isSaving) return;

    setRefreshNotice("Refreshing...");
    setIsRefreshing(true);
    try {
      const ok = await loadSearches();
      setRefreshNotice(
        ok
          ? `Updated ${new Date().toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}`
          : "Refresh failed"
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSelect = (value: string) => {
    setSelectedId(value);

    if (value === "none") return;

    const selected = searches.find((item) => item.id.toString() === value);
    if (!selected) return;

    onApply(selected.queryParams);
  };

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <Select value={selectedId} onValueChange={handleSelect}>
        <SelectTrigger
          className={cn(
            "h-8 min-w-0 flex-1 text-xs font-mono sm:w-[220px] sm:flex-none",
            theme.sortSelect
          )}
        >
          <SelectValue placeholder="Saved searches" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none" className={theme.selectItemFocus}>
            Saved searches
          </SelectItem>
          {searches.map((search) => (
            <SelectItem
              key={search.id}
              value={search.id.toString()}
              className={theme.selectItemFocus}
            >
              {search.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn("h-8 gap-1.5 whitespace-nowrap", theme.sortSelect, theme.text)}
        onClick={() => {
          void handleSave();
        }}
        disabled={isSaving || isRefreshing}
      >
        {isSaving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <BookmarkPlus className="h-3.5 w-3.5" />
        )}
        {isSaving ? "Saving..." : "Save Search"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn("h-8 w-8 px-0", theme.sortSelect, "text-muted-foreground", theme.hoverText)}
        onClick={() => {
          void handleRefresh();
        }}
        title={isRefreshing ? "Refreshing saved searches..." : "Refresh saved searches"}
        disabled={isRefreshing || isSaving}
        aria-busy={isRefreshing}
      >
        <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
      </Button>
      {refreshNotice ? (
        <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
          {refreshNotice}
        </span>
      ) : null}
    </div>
  );
}
