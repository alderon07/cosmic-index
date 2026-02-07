"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, Trash2, FolderHeart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseCanonicalId } from "@/lib/canonical-id";
import { useAppAuth } from "@/components/auth/app-auth-provider";

interface SavedObjectItem {
  id: number;
  canonicalId: string;
  displayName: string;
  notes: string | null;
  createdAt: string;
}

function resolveHref(canonicalId: string): string | null {
  const parsed = parseCanonicalId(canonicalId);
  if (!parsed) return null;

  if (parsed.type === "exoplanet") return `/exoplanets/${parsed.id}`;
  if (parsed.type === "star") return `/stars/${parsed.id}`;
  if (parsed.type === "small-body") return `/small-bodies/${parsed.id}`;
  if (parsed.type === "fireball") return "/fireballs";
  if (parsed.type === "flr" || parsed.type === "cme" || parsed.type === "gst") {
    return "/space-weather";
  }

  return null;
}

function formatObjectType(canonicalId: string): string {
  const parsed = parseCanonicalId(canonicalId);
  if (!parsed) return "Unknown";

  switch (parsed.type) {
    case "exoplanet":
      return "Exoplanet";
    case "star":
      return "Star";
    case "small-body":
      return "Small Body";
    case "fireball":
      return "Fireball";
    case "flr":
      return "Solar Flare";
    case "cme":
      return "CME";
    case "gst":
      return "Geomagnetic Storm";
    default:
      return "Event";
  }
}

export function SavedObjectsPageContent() {
  const auth = useAppAuth();
  const [items, setItems] = useState<SavedObjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/saved-objects?page=1&limit=100");
      if (!response.ok) {
        throw new Error("Failed to load saved objects");
      }

      const data = await response.json();
      setItems(Array.isArray(data.objects) ? data.objects : []);
    } catch (error) {
      console.error(error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const hasItems = items.length > 0;

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [items]
  );

  const handleDelete = useCallback(
    async (id: number) => {
      const confirmed = window.confirm("Remove this item from saved objects?");
      if (!confirmed) return;

      try {
        const response = await fetch(`/api/user/saved-objects/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to remove saved object");
        }

        setItems((previous) => previous.filter((item) => item.id !== id));
      } catch (error) {
        console.error(error);
      }
    },
    []
  );

  if (!auth.isSignedIn) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Card>
          <CardContent className="py-10 text-center">
            <FolderHeart className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Sign in to view your saved objects.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-foreground">Saved Objects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Catalog objects and events you&apos;ve bookmarked
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadItems()} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Loading saved objects...
          </CardContent>
        </Card>
      ) : !hasItems ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Bookmark className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No saved objects yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedItems.map((item) => {
            const href = resolveHref(item.canonicalId);
            return (
              <Card key={item.id} className="border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{item.displayName}</CardTitle>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                          {formatObjectType(item.canonicalId)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Saved {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        void handleDelete(item.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {item.notes ? (
                    <p className="text-sm text-muted-foreground mb-3">{item.notes}</p>
                  ) : null}
                  {href ? (
                    <Link href={href} className="text-sm text-primary hover:underline">
                      Open details
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">No direct detail page available</span>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
